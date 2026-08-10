import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * Validates that the action is not targeting the owner (if destructive/demoting)
 * and verifies caller is an owner if doing owner-level actions.
 */
async function enforceOwnerProtection(adminClient: SupabaseClient<Database>, targetUserId: string) {
  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", targetUserId)
    .single();

  if (roleData?.role === "owner") {
    throw new Error("Action denied: The Owner account is permanently protected and cannot be modified.");
  }
}

async function logAudit(
  adminClient: SupabaseClient<Database>,
  performedBy: string,
  targetUser: string | null,
  action: string,
  previousRole?: string,
  newRole?: string
) {
  await adminClient.from("audit_logs").insert({
    performed_by: performedBy,
    target_user: targetUser,
    action,
    previous_role: previousRole,
    new_role: newRole,
  });
}

export async function listUsers() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  // Need to fetch auth users to get email?
  // Actually, email is in public.profiles. So we just join profiles with user_roles.
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(`
      *,
      user_roles (
        role,
        created_at
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  
  return (data || []).map(p => ({
    ...p,
    role: p.user_roles?.[0]?.role || "user",
    role_created_at: p.user_roles?.[0]?.created_at
  }));
}

export async function createAdmin(callerId: string, email: string, fullName: string, role: AppRole) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  if (role === "owner") {
    throw new Error("Cannot create an owner. Use ownership transfer.");
  }

  // 1. Create Auth User
  // Auto-confirm email so they can reset password directly or we can set a temp password
  const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
  
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (authError || !authData.user) {
    throw new Error("Failed to create auth user: " + authError?.message);
  }

  // 2. Wait for trigger to create profile and default user_role
  // Since triggers are asynchronous in some contexts, we might just upsert.
  // The trigger handles inserting into user_roles as 'user'. We need to update it.
  
  // Give the trigger a moment to run if needed, though in Postgres it's synchronous.
  // Update the role
  await supabaseAdmin
    .from("user_roles")
    .update({ role })
    .eq("user_id", authData.user.id);

  // Send a reset password email so they can set their real password
  await supabaseAdmin.auth.admin.resetPasswordForEmail(email);

  await logAudit(supabaseAdmin, callerId, authData.user.id, `Created ${role}`, undefined, role);

  return authData.user;
}

export async function removeAdmin(callerId: string, targetUserId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  await enforceOwnerProtection(supabaseAdmin, targetUserId);

  const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
  if (error) throw new Error("Failed to delete user: " + error.message);

  await logAudit(supabaseAdmin, callerId, targetUserId, "Removed User");
}

export async function setAccountStatus(callerId: string, targetUserId: string, status: "active" | "inactive") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  await enforceOwnerProtection(supabaseAdmin, targetUserId);

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ status })
    .eq("id", targetUserId);

  if (error) throw new Error("Failed to update status: " + error.message);

  // If inactivating, we could also ban the user in auth.users
  if (status === "inactive") {
    await supabaseAdmin.auth.admin.updateUserById(targetUserId, { ban_duration: "87600h" });
  } else {
    await supabaseAdmin.auth.admin.updateUserById(targetUserId, { ban_duration: "none" });
  }

  await logAudit(supabaseAdmin, callerId, targetUserId, `Set Status: ${status}`);
}

export async function adminResetPassword(callerId: string, targetUserId: string, email: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  await enforceOwnerProtection(supabaseAdmin, targetUserId);
  
  const { error } = await supabaseAdmin.auth.admin.resetPasswordForEmail(email);
  if (error) throw new Error("Failed to send reset email: " + error.message);

  await logAudit(supabaseAdmin, callerId, targetUserId, "Admin triggered password reset");
}

export async function transferOwnership(callerId: string, targetAdminId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Call the atomic postgres function
  const { error } = await supabaseAdmin.rpc("transfer_ownership", { new_owner_id: targetAdminId });
  if (error) throw new Error("Failed to transfer ownership: " + error.message);

  await logAudit(supabaseAdmin, callerId, targetAdminId, "Transferred Ownership", "admin", "owner");
}

export async function updateRole(callerId: string, targetUserId: string, newRole: AppRole) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (newRole === "owner") throw new Error("Use transfer ownership instead.");
  
  await enforceOwnerProtection(supabaseAdmin, targetUserId);

  const { data: oldRoleData } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", targetUserId).single();

  const { error } = await supabaseAdmin
    .from("user_roles")
    .update({ role: newRole })
    .eq("user_id", targetUserId);

  if (error) throw new Error("Failed to update role: " + error.message);

  await logAudit(supabaseAdmin, callerId, targetUserId, "Updated Role", oldRoleData?.role, newRole);
}
