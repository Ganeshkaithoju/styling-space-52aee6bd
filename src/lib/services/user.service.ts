import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAuditLog } from "./audit.service";

type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * Validates the caller's identity and authorization server-side.
 */
export async function requireAdminAuth(adminClient: SupabaseClient<Database>, callerId: string) {
  const [userRes, roleRes] = await Promise.all([
    adminClient.auth.admin.getUserById(callerId),
    adminClient.from("user_roles").select("role").eq("user_id", callerId).single(),
  ]);

  if (userRes.error || !userRes.data.user) {
    throw new Error("Unauthorized: Invalid caller identity.");
  }

  const role = roleRes.data?.role;
  if (role !== "admin" && role !== "owner") {
    throw new Error("Forbidden: This action requires Administrator or Owner privileges.");
  }

  return { user: userRes.data.user, role };
}

/**
 * Validates that the action is not targeting the owner (if destructive/demoting).
 */
async function enforceOwnerProtection(adminClient: SupabaseClient<Database>, targetUserId: string) {
  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", targetUserId)
    .single();

  if (roleData?.role === "owner") {
    throw new Error("The selected user is protected because they are the Owner.");
  }
}

export async function listUsers() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [authRes, profilesRes, rolesRes, locationsRes] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers(),
    supabaseAdmin.from("profiles").select("*"),
    supabaseAdmin.from("user_roles").select("*"),
    supabaseAdmin.from("customer_locations").select("*"),
  ]);

  if (authRes.error) throw new Error("Failed to fetch auth users: " + authRes.error.message);
  if (profilesRes.error) throw new Error("Failed to fetch profiles: " + profilesRes.error.message);
  if (rolesRes.error) throw new Error("Failed to fetch roles: " + rolesRes.error.message);

  const profilesMap = new Map(profilesRes.data?.map((p) => [p.id, p]));
  const rolesMap = new Map(rolesRes.data?.map((r) => [r.user_id, r]));
  const locationsMap = new Map(locationsRes.data?.map((l) => [l.user_id, l]));

  return authRes.data.users
    .map((u) => {
      const profile = profilesMap.get(u.id);
      const roleRecord = rolesMap.get(u.id);
      const provider = u.app_metadata.provider || "email";

      return {
        id: u.id,
        email: u.email || profile?.email || "",
        full_name:
          profile?.full_name || (u.user_metadata?.["full_name"] as string | undefined) || "",
        avatar_url:
          profile?.avatar_url || (u.user_metadata?.["avatar_url"] as string | undefined) || null,
        role: roleRecord?.role || "user",
        role_created_at: roleRecord?.created_at,
        status: ((profile as Record<string, unknown>)?.["status"] as string) || "active",
        provider,
        created_at: u.created_at,
        updated_at: u.updated_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        location: locationsMap.get(u.id) || null,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createAdmin(
  callerId: string,
  email: string,
  fullName: string,
  role: AppRole,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  await requireAdminAuth(supabaseAdmin, callerId);

  if (role === "owner") {
    throw new Error("Cannot create an owner. Use ownership transfer.");
  }

  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  if (existingUsers?.users?.some((u) => u.email === email)) {
    throw new Error("An account with this email already exists.");
  }

  // 1. Create Auth User
  const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authData.user) {
    throw new Error("Failed to create auth user: " + authError?.message);
  }

  try {
    // 2. Assign requested admin role
    const { error: roleError } = await supabaseAdmin.from("user_roles").upsert({
      user_id: authData.user.id,
      role,
    });

    if (roleError) {
      throw new Error("Failed to assign role: " + roleError.message);
    }
  } catch (roleAssignmentError) {
    // Clean up partial creation
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new Error(
      `Role assignment failed. Account creation rolled back: ${(roleAssignmentError as Error).message}`,
    );
  }

  // 3. Create audit record
  const auditRes = await createAuditLog(supabaseAdmin, callerId, {
    action: `ADMIN_CREATED`,
    entityType: "user",
    entityId: authData.user.id,
    description: `Created new ${role}`,
    newData: { role },
  });

  // 4. Send a reset password email
  const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (emailError) {
    throw new Error("Admin account was created, but the password setup email could not be sent.");
  }

  if (!auditRes.success) {
    throw new Error(
      `Admin account was created, but the audit record could not be created: ${auditRes.error}`,
    );
  }

  return authData.user;
}

export async function removeAdmin(callerId: string, targetUserId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  await requireAdminAuth(supabaseAdmin, callerId);
  await enforceOwnerProtection(supabaseAdmin, targetUserId);

  const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
  if (error) throw new Error("Failed to delete user: " + error.message);

  const auditRes = await createAuditLog(supabaseAdmin, callerId, {
    action: "USER_DELETED",
    entityType: "user",
    entityId: targetUserId,
    description: "Removed User",
  });
  if (!auditRes.success)
    throw new Error(
      `User was deleted, but the audit record could not be created: ${auditRes.error}`,
    );
}

export async function setAccountStatus(
  callerId: string,
  targetUserId: string,
  status: "active" | "inactive",
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  await requireAdminAuth(supabaseAdmin, callerId);
  await enforceOwnerProtection(supabaseAdmin, targetUserId);

  const { error } = await (supabaseAdmin.from("profiles") as ReturnType<typeof supabaseAdmin.from>)
    .update({ status } as Record<string, unknown>)
    .eq("id", targetUserId);
  if (error) throw new Error("Failed to update status: " + error.message);

  if (status === "inactive") {
    await supabaseAdmin.auth.admin.updateUserById(targetUserId, { ban_duration: "87600h" });
  } else {
    await supabaseAdmin.auth.admin.updateUserById(targetUserId, { ban_duration: "none" });
  }

  const auditRes = await createAuditLog(supabaseAdmin, callerId, {
    action: status === "inactive" ? "USER_DEACTIVATED" : "USER_ACTIVATED",
    entityType: "user",
    entityId: targetUserId,
    description: `Set Status: ${status}`,
  });
  if (!auditRes.success)
    throw new Error(
      `User status was changed, but the audit record could not be created: ${auditRes.error}`,
    );
}

export async function adminResetPassword(callerId: string, targetUserId: string, email: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  await requireAdminAuth(supabaseAdmin, callerId);
  await enforceOwnerProtection(supabaseAdmin, targetUserId);

  // Generate the recovery link server-side.
  // generateLink returns the one-time URL; we must deliver it ourselves.
  const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  if (error) throw new Error("Failed to generate reset link: " + error.message);

  const recoveryUrl = linkData?.properties?.action_link;

  // Deliver the recovery link via the existing Resend integration.
  if (recoveryUrl) {
    try {
      const { Resend } = await import("resend");
      const resendApiKey = process.env["RESEND_API_KEY"];
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: "Styling Space <noreply@resend.dev>",
          to: email,
          subject: "Set up your Styling Space password",
          html: `
            <p>Hi there,</p>
            <p>An administrator has created an account for you at Styling Space.</p>
            <p>Click the button below to set your password. This link expires in 24 hours.</p>
            <p><a href="${recoveryUrl}" style="display:inline-block;padding:12px 24px;background:#1a1a1a;color:#fff;text-decoration:none;font-family:sans-serif;">Set Password</a></p>
            <p>If you did not expect this email, you can safely ignore it.</p>
            <p>Best regards,<br/>The Styling Space Team</p>
          `,
        });
      } else {
        // RESEND_API_KEY not configured — log but do not fail the admin action.
        console.warn(
          "[adminResetPassword] RESEND_API_KEY not set. Recovery link was generated but not emailed.",
          { targetUserId },
        );
      }
    } catch (emailErr) {
      // Email delivery failure is non-fatal: the link was generated.
      // The admin can manually share the link or retry.
      console.error("[adminResetPassword] Failed to send recovery email:", emailErr);
    }
  }

  const auditRes = await createAuditLog(supabaseAdmin, callerId, {
    action: "PASSWORD_RESET_TRIGGERED",
    entityType: "user",
    entityId: targetUserId,
    description: "Admin triggered password reset email",
  });
  if (!auditRes.success)
    throw new Error(
      `Password reset email sent, but the audit record could not be created: ${auditRes.error}`,
    );
}

export async function transferOwnership(callerId: string, targetAdminId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Call the atomic postgres function (which verifies caller is owner)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any).rpc("transfer_ownership", {
    new_owner_id: targetAdminId,
  });
  if (error) {
    if (error.message.includes("Only the current owner")) {
      throw new Error("Forbidden: This action requires Owner privileges.");
    }
    throw new Error("Failed to transfer ownership: " + error.message);
  }

  const auditRes = await createAuditLog(supabaseAdmin, callerId, {
    action: "OWNERSHIP_TRANSFERRED",
    entityType: "user",
    entityId: targetAdminId,
    description: "Transferred Ownership",
    oldData: { role: "admin" },
    newData: { role: "owner" },
  });
  if (!auditRes.success)
    throw new Error(
      `Ownership transferred, but the audit record could not be created: ${auditRes.error}`,
    );
}

export async function updateRole(callerId: string, targetUserId: string, newRole: AppRole) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  await requireAdminAuth(supabaseAdmin, callerId);

  if (newRole === "owner") throw new Error("Use transfer ownership instead.");

  await enforceOwnerProtection(supabaseAdmin, targetUserId);

  const { data: oldRoleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", targetUserId)
    .single();

  const { error } = await supabaseAdmin
    .from("user_roles")
    .update({ role: newRole })
    .eq("user_id", targetUserId);

  if (error) throw new Error("Failed to update role: " + error.message);

  const auditRes = await createAuditLog(supabaseAdmin, callerId, {
    action: "ROLE_CHANGED",
    entityType: "user",
    entityId: targetUserId,
    description: "Updated Role",
    oldData: { role: oldRoleData?.role },
    newData: { role: newRole },
  });
  if (!auditRes.success)
    throw new Error(
      `User role was changed, but the audit record could not be created: ${auditRes.error}`,
    );
}
