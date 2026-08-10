import { createServerFn } from "@tanstack/react-start";
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
      .select("id, slug, title, subtitle, description, category, location, year, cover_image_url, featured, sort_order")
      .eq("status", "published")
      .order("sort_order"),
    supabase
      .from("services")
      .select("id, number, title, description, details, sort_order")
      .eq("status", "published")
      .order("sort_order"),
    supabase.from("site_content").select("content_key, page, section, heading, body").eq("status", "published"),
    supabase.from("settings").select("setting_key, setting_value").eq("is_public", true),
  ]);

  return {
    projects: projects.data ?? [],
    services: services.data ?? [],
    content: Object.fromEntries((content.data ?? []).map((c) => [c.content_key, c])),
    settings: Object.fromEntries((settings.data ?? []).map((s) => [s.setting_key, s.setting_value])),
  };
});

const consultationSchema = z.object({
  full_name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(60).nullable().default(null),
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
  .validator((input: unknown) => consultationSchema.parse(input))
  .handler(async ({ data }) => {
    const { error } = await publicClient().from("consultations").insert(data);
    if (error) throw new Error(error.message);
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
