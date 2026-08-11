import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { buttonClass, fieldClass, labelClass } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_client/dashboard")({
  component: DashboardPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || "consultations",
    };
  },
});

function DashboardPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: userAuth } = useSuspenseQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Not logged in");
      return data.user;
    },
  });

  const { data: profile } = useSuspenseQuery({
    queryKey: ["profile", userAuth.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userAuth.id).single();
      return data;
    },
  });

  const { data: consultations } = useSuspenseQuery({
    queryKey: ["consultations", userAuth.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("consultations")
        .select("*")
        .eq("user_id", userAuth.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const updates = {
        full_name: String(fd.get("full_name") || ""),
        phone: String(fd.get("phone") || "") || null,
      };
      const { error } = await supabase.from("profiles").update(updates).eq("id", userAuth.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile", userAuth.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <h1 className="mb-2 font-headline-md text-headline-md text-primary">Client Portal</h1>
      <p className="mb-10 font-body-lg text-body-lg text-on-surface-variant">
        Manage your design consultations and profile.
      </p>

      <div className="flex gap-2 border-b border-outline-variant/50">
        {(["consultations", "profile"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => navigate({ to: ".", search: { tab: t } })}
            className={`px-5 py-3 font-label-caps text-label-caps uppercase tracking-widest transition-colors ${
              tab === t ? "border-b-2 border-secondary text-primary" : "text-on-surface-variant"
            }`}
          >
            {t === "consultations" ? "My Consultations" : "Profile Settings"}
          </button>
        ))}
      </div>

      <div className="mt-10 max-w-4xl">
        {tab === "consultations" && (
          <div className="space-y-6">
            {consultations.length === 0 ? (
              <div className="border border-outline-variant/60 bg-surface-container-lowest p-12 text-center">
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  You have no active consultations.
                </p>
                <button
                  onClick={() => navigate({ to: "/consultation" })}
                  className={`mt-6 ${buttonClass}`}
                >
                  Book a Consultation
                </button>
              </div>
            ) : (
              consultations.map((c) => (
                <div key={c.id} className="border border-outline-variant/60 bg-surface-container-lowest p-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-headline-md text-[20px] text-primary">{c.service_interest}</h3>
                      <p className="mt-1 font-body-md text-on-surface-variant">
                        {c.project_type} · {c.project_scope}
                      </p>
                    </div>
                    <span className="inline-block bg-surface-container px-3 py-1 font-label-caps text-xs uppercase tracking-widest text-primary">
                      {c.status}
                    </span>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-6 border-t border-outline-variant/40 pt-6">
                    <div>
                      <p className="mb-1 font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
                        Preferred Date
                      </p>
                      <p className="font-body-md text-primary">
                        {c.preferred_date ? `${c.preferred_date} · ${c.preferred_time}` : "TBD"}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
                        Location
                      </p>
                      <p className="font-body-md text-primary">{c.location || "N/A"}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "profile" && (
          <form
            className="border border-outline-variant/60 bg-surface-container-lowest p-8"
            onSubmit={(e) => {
              e.preventDefault();
              profileMutation.mutate(new FormData(e.currentTarget));
            }}
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className={labelClass}>Full Name</label>
                <input
                  name="full_name"
                  defaultValue={profile?.full_name || ""}
                  className={`${fieldClass} mt-2`}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  name="phone"
                  defaultValue={profile?.phone || ""}
                  className={`${fieldClass} mt-2`}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Email Address (Read-only)</label>
                <input
                  value={userAuth.email || ""}
                  readOnly
                  disabled
                  className={`${fieldClass} mt-2 opacity-60`}
                />
              </div>
            </div>
            <button
              type="submit"
              className={`${buttonClass} mt-8`}
              disabled={profileMutation.isPending}
            >
              {profileMutation.isPending ? "Saving..." : "Save Profile"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
