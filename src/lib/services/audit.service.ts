import type { Database, Json } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface AuditLogOptions {
  action: string;
  entityType: string;
  entityId?: string;
  description?: string;
  oldData?: Json;
  newData?: Json;
  metadata?: Json;
}

/**
 * Reusable server-side audit logger.
 * Derives the actor identity strictly from the authenticated server session.
 */
export async function createAuditLog(
  adminClient: SupabaseClient<Database>,
  actorUserId: string,
  options: AuditLogOptions,
) {
  try {
    // Determine the actor's name, email, and role from the server
    const [userRes, roleRes] = await Promise.all([
      adminClient.auth.admin.getUserById(actorUserId),
      adminClient.from("user_roles").select("role").eq("user_id", actorUserId).single(),
    ]);

    if (userRes.error) {
      console.error("Failed to fetch actor user for audit:", userRes.error);
      return;
    }

    const user = userRes.data.user;
    const actorRole = roleRes.data?.role || "user";
    const actorName = user.user_metadata?.full_name || "Unknown";
    const actorEmail = user.email || "Unknown";

    // Write the audit log using the service role client
    const { error } = await adminClient.from("audit_logs").insert({
      actor_user_id: actorUserId,
      actor_name: actorName,
      actor_email: actorEmail,
      actor_role: actorRole,
      action: options.action,
      entity_type: options.entityType,
      entity_id: options.entityId,
      description: options.description,
      old_data: options.oldData || null,
      new_data: options.newData || null,
      metadata: options.metadata || null,
    });

    if (error) {
      console.error("Failed to write audit log:", error);
    }
  } catch (err) {
    console.error("Audit log exception:", err);
  }
}
