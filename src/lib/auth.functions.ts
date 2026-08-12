import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";

// We need a stable encryption key to generate/verify the opaque tokens.
// SUPABASE_SERVICE_ROLE_KEY is guaranteed to be present on the server.
const getSecretKey = () => {
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!secret) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return crypto.createHash("sha256").update(secret).digest();
};

export const createVerificationAttempt = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // We encrypt the userId + timestamp to create the opaque attempt token
    const iv = crypto.randomBytes(16);
    const key = getSecretKey();
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const payload = JSON.stringify({
      userId: data.userId,
      createdAt: Date.now(),
    });

    let encrypted = cipher.update(payload, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    // return the opaque token
    const token = `${iv.toString("hex")}:${authTag}:${encrypted}`;
    return { token };
  });

export const checkVerificationStatus = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        token: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const [ivHex, authTagHex, encryptedHex] = data.token.split(":");
      if (!ivHex || !authTagHex || !encryptedHex) {
        return { confirmed: false, expired: true };
      }

      const key = getSecretKey();
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");

      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");

      const payload = JSON.parse(decrypted);
      const { userId, createdAt } = payload;

      // Enforce 15-minute expiration
      if (Date.now() - createdAt > 15 * 60 * 1000) {
        return { confirmed: false, expired: true };
      }

      // Import the server-side supabaseAdmin
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Narrow administrative lookup
      const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (error || !userData.user) {
        return { confirmed: false, expired: true }; // Consider invalid users as expired
      }

      return {
        confirmed: !!userData.user.email_confirmed_at,
        expired: false,
      };
    } catch (err) {
      // Any decryption error implies an invalid/tampered token
      return { confirmed: false, expired: true };
    }
  });

export const checkPasswordResetEligibility = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        email: z.string().email(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // Basic rate limiting could be implemented here via Redis or DB timestamps.
    // For now, we perform a secure server-side check.
    const normalizedEmail = data.email.trim().toLowerCase();

    // Import the server-side supabaseAdmin
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Because this is a studio CMS, we can safely use listUsers or query the profiles table.
    // Querying the profiles table is typically faster if indexed by email.
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileData) {
      return { exists: true };
    }

    // Fallback check against auth.users in case the profile trigger failed
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      // Fail closed or generic
      return { exists: false };
    }

    const exists = authData.users.some((u) => u.email?.toLowerCase() === normalizedEmail);
    return { exists };
  });
