import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AdminShell,
  StatusPill,
  fieldClass,
  ghostButtonClass,
} from "@/components/admin/AdminShell";
import { listConsultations, updateConsultation } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/consultations")({
  component: ConsultationsPage,
});

const statuses = ["new", "contacted", "scheduled", "completed", "archived"] as const;

function ConsultationsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "consultations"],
    queryFn: () => listConsultations(),
  });
  const [filter, setFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: updateConsultation,
    onSuccess: () => {
      toast.success("Consultation updated");
      qc.invalidateQueries({ queryKey: ["admin", "consultations"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data ?? []).filter((c) => filter === "all" || c.status === filter);

  return (
    <AdminShell
      title="Consultations"
      description="Every booking request from the public site, with status and designer assignment."
      actions={
        <select
          className={`${fieldClass} w-52`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      }
    >
      <div className="border border-outline-variant/60">
        {rows.length === 0 && (
          <p className="p-8 font-body-md text-body-md text-on-surface-variant">
            No requests here yet.
          </p>
        )}
        {rows.map((c) => (
          <div key={c.id} className="border-b border-outline-variant/40 last:border-b-0">
            <div className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="font-body-lg text-body-lg text-on-surface">{c.full_name}</p>
                <p className="font-body-md text-[14px] text-on-surface-variant">
                  {c.email}
                  {c.phone ? ` · ${c.phone}` : ""} · {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill status={c.status} />
                <select
                  className={`${fieldClass} w-44`}
                  value={c.status}
                  onChange={(e) =>
                    update.mutate({
                      data: {
                        id: c.id,
                        status: e.target.value as (typeof statuses)[number],
                        assigned_designer: c.assigned_designer,
                      },
                    })
                  }
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={ghostButtonClass}
                  onClick={() => setOpenId(openId === c.id ? null : c.id)}
                >
                  {openId === c.id ? "Hide" : "Details"}
                </button>
              </div>
            </div>

            {openId === c.id && (
              <div className="grid gap-6 bg-surface-container-low p-6 md:grid-cols-3">
                {[
                  ["Service", c.service_interest],
                  ["Project type", c.project_type],
                  ["Scope", c.project_scope],
                  ["Timeline", c.timeline],
                  ["Budget", c.budget_range],
                  ["Preferred date", c.preferred_date],
                  ["Preferred time", c.preferred_time],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                      {label}
                    </p>
                    <p className="mt-2 font-body-md text-body-md text-on-surface">{value || "—"}</p>
                  </div>
                ))}

                <div className="md:col-span-3">
                  <p className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                    Property Location
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <p className="font-body-md text-body-md text-on-surface">
                      {c.property_formatted_address || c.property_address || c.location || "—"}
                    </p>
                    {c.property_lat && c.property_lng && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${c.property_lat},${c.property_lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-secondary underline flex items-center gap-1 hover:text-primary"
                      >
                        <span className="material-symbols-outlined text-[14px]">map</span>
                        View Map
                      </a>
                    )}
                  </div>
                </div>

                <div className="md:col-span-3">
                  <p className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                    Message
                  </p>
                  <p className="mt-2 font-body-md text-body-md text-on-surface">
                    {c.message || "—"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                    Assigned designer
                  </p>
                  <input
                    className={`${fieldClass} mt-2`}
                    defaultValue={c.assigned_designer ?? ""}
                    onBlur={(e) =>
                      update.mutate({
                        data: {
                          id: c.id,
                          status: c.status as (typeof statuses)[number],
                          assigned_designer: e.target.value || null,
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
