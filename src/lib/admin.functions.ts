import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: Boolean(data), userId: context.userId };
  });

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    const [projects, consultations, support, services, recent] = await Promise.all([
      s.from("projects").select("id, status", { count: "exact" }),
      s.from("consultations").select("id, status", { count: "exact" }),
      s.from("support_messages").select("id, status", { count: "exact" }),
      s.from("services").select("id", { count: "exact", head: true }),
      s
        .from("consultations")
        .select("id, full_name, email, service_interest, status, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    const cRows = consultations.data ?? [];
    const pRows = projects.data ?? [];
    return {
      projectCount: pRows.length,
      publishedProjects: pRows.filter((p) => p.status === "published").length,
      consultationCount: cRows.length,
      newConsultations: cRows.filter((c) => c.status === "new").length,
      openSupport: (support.data ?? []).filter((m) => m.status === "open").length,
      serviceCount: services.count ?? 0,
      recent: recent.data ?? [],
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
  .inputValidator((input: unknown) => projectSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...values } = data;
    const q = id
      ? context.supabase.from("projects").update(values).eq("id", id)
      : context.supabase.from("projects").insert(values);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("project_images").delete().eq("project_id", data.id);
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
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
  .inputValidator((input: unknown) =>
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

export const saveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
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
    const { id, ...values } = data;
    const { error } = await context.supabase.from("services").update(values).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

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
  .inputValidator((input: unknown) =>
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
    const { error } = await context.supabase.from("consultations").update(values).eq("id", id);
    if (error) throw new Error(error.message);
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
  .inputValidator((input: unknown) =>
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
  .inputValidator((input: unknown) =>
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
  .inputValidator((input: unknown) =>
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
