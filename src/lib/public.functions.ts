import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getSiteData = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const [projects, services, content, settings] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, slug, title, subtitle, description, category, location, year, cover_image_url, featured, sort_order",
      )
      .eq("status", "published")
      .order("sort_order"),
    supabase
      .from("services")
      .select("id, number, title, description, details, sort_order")
      .eq("status", "published")
      .order("sort_order"),
    supabase
      .from("site_content")
      .select("content_key, page, section, heading, body")
      .eq("status", "published"),
    supabase.from("settings").select("setting_key, setting_value").eq("is_public", true),
  ]);

  return {
    projects: projects.data ?? [],
    services: services.data ?? [],
    content: Object.fromEntries((content.data ?? []).map((c) => [c.content_key, c])),
    settings: Object.fromEntries(
      (settings.data ?? []).map((s) => [s.setting_key, s.setting_value]),
    ),
  };
});

const consultationSchema = z.object({
  full_name: z.string().trim().min(1).max(160).optional(),
  email: z.string().trim().email().max(200).optional(),
  phone: z.string().trim().max(60).nullable().default(null).optional(),
  service_interest: z.string().trim().max(120).nullable().default(null),
  project_type: z.string().trim().max(120).nullable().default(null),
  project_scope: z.string().trim().max(120).nullable().default(null),
  timeline: z.string().trim().max(120).nullable().default(null),
  budget_range: z.string().trim().max(120).nullable().default(null),
  location: z.string().trim().max(200).nullable().default(null),
  property_address: z.string().trim().max(300).nullable().default(null),
  preferred_date: z.string().trim().max(40).nullable().default(null),
  preferred_time: z.string().trim().max(60).nullable().default(null),
  message: z.string().trim().max(4000).nullable().default(null),
});

export const submitConsultation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => consultationSchema.parse(input))
  .handler(async ({ data, context }) => {
    // 1. Check for duplicates
    const { data: existing } = await context.supabase
      .from("consultations")
      .select("status")
      .eq("user_id", context.userId)
      .in("status", ["new", "contacted", "scheduled"]) // "new" is the default status
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error(
        "You already have an active consultation. Please edit or delete your existing consultation before creating another one.",
      );
    }

    // 2. Extract profile details to ensure we use the authenticated user's true data
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", context.userId)
      .single();

    // 3. Insert the consultation
    const insertData = {
      ...data,
      user_id: context.userId,
      email: context.claims.email, // Secure email from JWT
      full_name: profile?.full_name || data.full_name || "Unknown",
      phone: profile?.phone || data.phone || null,
    };

    const { error, data: inserted } = await context.supabase
      .from("consultations")
      .insert(insertData)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createAuditLog } = await import("./services/audit.service");
    await createAuditLog(supabaseAdmin, context.userId, {
      action: "CONSULTATION_CREATED",
      entityType: "consultation",
      entityId: inserted?.id,
      description: "Submitted new consultation",
      newData: insertData,
    });

    // 4. Send Email Confirmation via Resend
    try {
      const { Resend } = await import("resend");
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: "Styling Space <noreply@resend.dev>", // We use resend.dev for testing unless they have a domain
          to: [insertData.email],
          subject: "Consultation Request Received - Styling Space",
          html: `
            <p>Hi ${insertData.full_name},</p>
            <p>Thank you for requesting a consultation for <strong>${insertData.service_interest}</strong>.</p>
            <p>Our team will review your project details and get back to you shortly.</p>
            <br/>
            <p>Best regards,</p>
            <p>The Styling Space Team</p>
          `,
        });
      } else {
        console.warn("RESEND_API_KEY is not defined. Email was not sent.");
      }
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // We don't want to fail the consultation creation if the email fails.
    }

    return { ok: true };
  });

const supportSchema = z.object({
  full_name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(200),
  subject: z.string().trim().max(200).nullable().default(null),
  priority: z.enum(["standard", "urgent"]).default("standard"),
  message: z.string().trim().min(1).max(4000),
});

export const submitSupportMessage = createServerFn({ method: "POST" })
  .validator((input: unknown) => supportSchema.parse(input))
  .handler(async ({ data }) => {
    const { error } = await publicClient().from("support_messages").insert(data);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const getCustomerLocation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("customer_locations")
      .select("*")
      .eq("user_id", context.userId)
      .single();

    // PGRST116 means no rows returned, which is fine (not shared yet)
    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }

    return data;
  });

export const updateCustomerLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("customer_locations").upsert(
      {
        user_id: context.userId,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy ?? null,
      },
      { onConflict: "user_id" },
    );

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateConsultationLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    console.log("updateConsultationLocation validator input:", input);

    return z
      .object({
        consultationId: z.string().uuid(),
        property_lat: z.number(),
        property_lng: z.number(),
        property_place_id: z.string(),
        property_formatted_address: z.string(),
      })
      .parse(input);
  })
  .handler(async ({ data, context }) => {
    // 1. Verify ownership
    const { data: consultation, error: fetchErr } = await context.supabase
      .from("consultations")
      .select("id, user_id")
      .eq("id", data.consultationId)
      .single();

    if (fetchErr || !consultation || consultation.user_id !== context.userId) {
      throw new Error("Consultation not found or unauthorized.");
    }

    // 2. Update location
    const updates = {
      property_lat: data.property_lat,
      property_lng: data.property_lng,
      property_place_id: data.property_place_id,
      property_formatted_address: data.property_formatted_address,
    };

    const { error } = await context.supabase
      .from("consultations")
      .update(updates)
      .eq("id", data.consultationId);

    if (error) throw new Error(error.message);

    // 3. Audit Log
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createAuditLog } = await import("./services/audit.service");

    await createAuditLog(supabaseAdmin, context.userId, {
      action: "CONSULTATION_LOCATION_UPDATED",
      entityType: "consultation",
      entityId: data.consultationId,
      description: "User updated property location",
      newData: updates,
    });

    return { ok: true };
  });

export const updateConsultation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        consultationId: z.string().uuid(),
        service_interest: z.string().trim().max(120),
        project_type: z.string().trim().max(120),
        project_scope: z.string().trim().max(120),
        timeline: z.string().trim().max(120),
        budget_range: z.string().trim().max(120).nullable().default(null),
        location: z.string().trim().max(200).nullable().default(null),
        property_address: z.string().trim().max(300).nullable().default(null),
        preferred_date: z.string().trim().max(40).nullable().default(null),
        preferred_time: z.string().trim().max(60),
        message: z.string().trim().max(4000).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { consultationId, ...updates } = data;

    // 1. Verify ownership
    const { data: existing, error: fetchErr } = await context.supabase
      .from("consultations")
      .select("id, user_id")
      .eq("id", consultationId)
      .eq("user_id", context.userId)
      .single();

    if (fetchErr || !existing) {
      throw new Error("Consultation not found or unauthorized.");
    }

    // 2. Update allowed fields
    const { error } = await context.supabase
      .from("consultations")
      .update(updates)
      .eq("id", consultationId)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);

    // 3. Audit Log
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createAuditLog } = await import("./services/audit.service");

    await createAuditLog(supabaseAdmin, context.userId, {
      action: "CONSULTATION_UPDATED",
      entityType: "consultation",
      entityId: consultationId,
      description: "User updated consultation details",
      newData: updates,
    });

    return { ok: true };
  });

export const deleteConsultation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ consultationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // 1. Verify ownership
    const { data: existing, error: fetchErr } = await context.supabase
      .from("consultations")
      .select("id, user_id")
      .eq("id", data.consultationId)
      .eq("user_id", context.userId)
      .single();

    if (fetchErr || !existing) {
      throw new Error("Consultation not found or unauthorized.");
    }

    // 2. Delete consultation
    const { error } = await context.supabase
      .from("consultations")
      .delete()
      .eq("id", data.consultationId)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);

    // 3. Audit Log
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createAuditLog } = await import("./services/audit.service");

    await createAuditLog(supabaseAdmin, context.userId, {
      action: "CONSULTATION_DELETED",
      entityType: "consultation",
      entityId: data.consultationId,
      description: "User deleted consultation",
    });

    return { ok: true };
  });
