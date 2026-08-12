import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [adminCheck, ownerCheck] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" }),
    ]);
    const isAdmin = Boolean(adminCheck.data) || Boolean(ownerCheck.data);
    const isOwner = Boolean(ownerCheck.data);
    return { isAdmin, isOwner, userId: context.userId };
  });

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [projects, consultations, support, services, recent, users] = await Promise.all([
      s.from("projects").select("id, status"),
      s.from("consultations").select("id, status, service_interest, created_at"),
      s.from("support_messages").select("id, status"),
      s.from("services").select("id, title"),
      s
        .from("consultations")
        .select("id, full_name, email, service_interest, status, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
      supabaseAdmin.auth.admin.listUsers(), // to get active users count
    ]);

    const cRows = consultations.data ?? [];
    const pRows = projects.data ?? [];
    const sRows = services.data ?? [];
    const activeUsersCount = users.data?.users ? users.data.users.length : 0; // Simple active users approximation for now

    // Most Requested Services (LEFT JOIN equivalent in memory)
    const serviceCounts = sRows
      .map((service) => {
        const count = cRows.filter((c) => c.service_interest === service.title).length;
        return {
          title: service.title,
          count: count,
        };
      })
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));

    return {
      projectCount: pRows.length,
      publishedProjects: pRows.filter((p) => p.status === "published").length,
      consultationCount: cRows.length,
      pendingConsultations: cRows.filter((c) =>
        ["new", "contacted", "scheduled"].includes(c.status),
      ).length,
      completedConsultations: cRows.filter((c) => c.status === "completed").length,
      activeUsers: activeUsersCount,
      openSupport: (support.data ?? []).filter((m) => m.status === "open").length,
      serviceCount: sRows.length,
      recent: recent.data ?? [],
      mostRequestedServices: serviceCounts,
    };
  });

/* ---------------------------------- projects --------------------------------- */

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("*")
      .order("sort_order")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const projectSchema = z.object({
  id: z.string().uuid().nullable().default(null),
  title: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
  category: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().max(200).nullable().default(null),
  description: z.string().trim().max(4000).nullable().default(null),
  location: z.string().trim().max(160).nullable().default(null),
  year: z.string().trim().max(16).nullable().default(null),
  cover_image_url: z.string().trim().max(500).nullable().default(null),
  status: z.enum(["draft", "published"]),
  featured: z.boolean().default(false),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const saveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => projectSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...values } = data;
    const isUpdate = !!id;
    const q = isUpdate
      ? context.supabase.from("projects").update(values).eq("id", id)
      : context.supabase.from("projects").insert(values).select("id").single();
    const { error, data: resData } = await q;
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createAuditLog } = await import("./services/audit.service");
    await createAuditLog(supabaseAdmin, context.userId, {
      action: isUpdate ? "PROJECT_UPDATED" : "PROJECT_CREATED",
      entityType: "project",
      entityId: id || resData?.id,
      description: isUpdate ? `Updated Project` : `Created Project`,
      newData: values,
    });

    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("project_images").delete().eq("project_id", data.id);
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createAuditLog } = await import("./services/audit.service");
    await createAuditLog(supabaseAdmin, context.userId, {
      action: "PROJECT_DELETED",
      entityType: "project",
      entityId: data.id,
      description: "Deleted Project",
    });

    return { ok: true };
  });

/* ---------------------------------- content ---------------------------------- */

export const listContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [content, services] = await Promise.all([
      context.supabase.from("site_content").select("*").order("page").order("content_key"),
      context.supabase.from("services").select("*").order("sort_order"),
    ]);
    if (content.error) throw new Error(content.error.message);
    return { content: content.data ?? [], services: services.data ?? [] };
  });

export const saveContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        heading: z.string().trim().max(300).nullable().default(null),
        body: z.string().trim().max(6000).nullable().default(null),
        status: z.enum(["draft", "published"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...values } = data;
    const { error } = await context.supabase.from("site_content").update(values).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listServicesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("services").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        number: z.string().trim().max(8),
        title: z.string().trim().min(1).max(160),
        description: z.string().trim().max(2000).nullable().default(null),
        details: z.string().trim().max(4000).nullable().default(null),
        status: z.enum(["draft", "published"]),
        sort_order: z.number().int().min(0).max(999),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error, data: inserted } = await context.supabase
      .from("services")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createAuditLog } = await import("./services/audit.service");
    await createAuditLog(supabaseAdmin, context.userId, {
      action: "SERVICE_CREATED",
      entityType: "service",
      entityId: inserted?.id,
      description: "Created Service",
      newData: data,
    });

    return { ok: true };
  });

export const updateService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        number: z.string().trim().max(8).optional(),
        title: z.string().trim().min(1).max(160).optional(),
        description: z.string().trim().max(2000).nullable().default(null).optional(),
        details: z.string().trim().max(4000).nullable().default(null).optional(),
        status: z.enum(["draft", "published"]).optional(),
        sort_order: z.number().int().min(0).max(999).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...values } = data;
    const { error } = await context.supabase.from("services").update(values).eq("id", id);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createAuditLog } = await import("./services/audit.service");
    await createAuditLog(supabaseAdmin, context.userId, {
      action: "SERVICE_UPDATED",
      entityType: "service",
      entityId: id,
      description: "Updated Service",
      newData: values,
    });

    return { ok: true };
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("services").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createAuditLog } = await import("./services/audit.service");
    await createAuditLog(supabaseAdmin, context.userId, {
      action: "SERVICE_DELETED",
      entityType: "service",
      entityId: data.id,
      description: "Deleted Service",
    });

    return { ok: true };
  });

export const saveService = updateService; // Backwards compatibility for now

/* ------------------------------- consultations ------------------------------- */

export const listConsultations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateConsultation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "contacted", "scheduled", "completed", "archived"]),
        assigned_designer: z.string().trim().max(160).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...values } = data;
    const { error, data: updatedData } = await context.supabase
      .from("consultations")
      .update(values)
      .eq("id", id)
      .select("email, user_id, status")
      .single();

    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createAuditLog } = await import("./services/audit.service");
    await createAuditLog(supabaseAdmin, context.userId, {
      action: "CONSULTATION_STATUS_CHANGED",
      entityType: "consultation",
      entityId: id,
      description: `Status changed to ${values.status}`,
      newData: values,
    });

    // 4. Send Email Notification via Resend
    try {
      const { Resend } = await import("resend");
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey && updatedData.email) {
        const resend = new Resend(resendApiKey);

        let messageHtml = `<p>Hi there,</p>`;
        if (values.status === "contacted") {
          messageHtml += `<p>We have reviewed your consultation request and will be in touch with you very soon!</p>`;
        } else if (values.status === "scheduled") {
          messageHtml += `<p>Your consultation has been officially scheduled. Please log in to your Client Portal for details.</p>`;
        } else if (values.status === "completed") {
          messageHtml += `<p>Your consultation is complete. Thank you for choosing Styling Space!</p>`;
        } else {
          messageHtml += `<p>The status of your consultation has been updated to: <strong>${values.status}</strong>.</p>`;
        }
        messageHtml += `<br/><p>Best regards,</p><p>The Styling Space Team</p>`;

        await resend.emails.send({
          from: "Styling Space <noreply@resend.dev>",
          to: [updatedData.email],
          subject: "Consultation Status Update - Styling Space",
          html: messageHtml,
        });
      } else {
        console.warn("RESEND_API_KEY or email is missing. Status update email not sent.");
      }
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
    }

    return { ok: true };
  });

/* ---------------------------------- support ---------------------------------- */

export const listSupport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("support_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateSupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "in_progress", "resolved"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("support_messages")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------- profile ---------------------------------- */

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    return data;
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        full_name: z.string().trim().max(160).nullable().default(null),
        job_title: z.string().trim().max(160).nullable().default(null),
        phone: z.string().trim().max(60).nullable().default(null),
        bio: z.string().trim().max(2000).nullable().default(null),
        avatar_url: z.string().trim().max(500).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update(data).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------- settings --------------------------------- */

export const listSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("settings")
      .select("*")
      .order("category")
      .order("setting_key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        values: z
          .array(
            z.object({
              id: z.string().uuid(),
              setting_value: z.string().trim().max(2000).nullable().default(null),
            }),
          )
          .max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    for (const row of data.values) {
      const { error } = await context.supabase
        .from("settings")
        .update({ setting_value: row.setting_value })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/* ---------------------------------- users --------------------------------- */

export const listUsersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // We check admin inside the service or rely on route guard
    const { listUsers } = await import("./services/user.service");
    return await listUsers();
  });

export const createAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        email: z.string().email().trim(),
        fullName: z.string().trim().min(1),
        role: z.enum(["admin", "editor"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { createAdmin } = await import("./services/user.service");
    const user = await createAdmin(
      context.userId,
      data.email,
      data.fullName,
      data.role as Database["public"]["Enums"]["app_role"],
    );
    return { ok: true, user };
  });

export const removeAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { removeAdmin } = await import("./services/user.service");
    await removeAdmin(context.userId, data.targetUserId);
    return { ok: true };
  });

export const setAccountStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        status: z.enum(["active", "inactive"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { setAccountStatus } = await import("./services/user.service");
    await setAccountStatus(context.userId, data.targetUserId, data.status);
    return { ok: true };
  });

export const adminResetPasswordFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        email: z.string().email(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { adminResetPassword } = await import("./services/user.service");
    await adminResetPassword(context.userId, data.targetUserId, data.email);
    return { ok: true };
  });

export const updateRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        role: z.enum(["admin", "editor", "user"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { updateRole } = await import("./services/user.service");
    const appRole = data.role as Database["public"]["Enums"]["app_role"];
    await updateRole(context.userId, data.targetUserId, appRole);
    return { ok: true };
  });

export const transferOwnershipFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        targetAdminId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { transferOwnership } = await import("./services/user.service");
    await transferOwnership(context.userId, data.targetAdminId);
    return { ok: true };
  });

/* ---------------------------------- audit --------------------------------- */

export const listAuditLogsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
        action: z.string().optional(),
        entityType: z.string().optional(),
      })
      .parse(input || {}),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (data.action) query = query.eq("action", data.action);
    if (data.entityType) query = query.eq("entity_type", data.entityType);

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    query = query.range(from, to);

    const { data: logs, error, count } = await query;
    if (error) throw new Error(error.message);

    return {
      logs: logs ?? [],
      totalCount: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: Math.ceil((count ?? 0) / data.pageSize),
    };
  });
