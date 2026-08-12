import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell, StatusPill, fieldClass } from "@/components/admin/AdminShell";
import { listSupport, updateSupport } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/support")({
  component: SupportPage,
});

const statuses = ["open", "in_progress", "resolved"] as const;

function SupportPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "support"], queryFn: () => listSupport() });
  const [filter, setFilter] = useState("all");

  const update = useMutation({
    mutationFn: updateSupport,
    onSuccess: () => {
      toast.success("Message updated");
      qc.invalidateQueries({ queryKey: ["admin", "support"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data ?? []).filter((m) => filter === "all" || m.status === filter);

  return (
    <AdminShell
      title="Support"
      description="Enquiries and issues submitted by clients and site visitors."
      actions={
        <select
          className={`${fieldClass} w-52`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      }
    >
      <div className="grid gap-px bg-outline-variant/50 md:grid-cols-2">
        {rows.length === 0 && (
          <p className="bg-surface-container-lowest p-8 font-body-md text-body-md text-on-surface-variant">
            No support messages.
          </p>
        )}
        {rows.map((m) => (
          <article key={m.id} className="bg-surface-container-lowest p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-body-lg text-body-lg text-on-surface">
                  {m.subject || "No subject"}
                </p>
                <p className="font-body-md text-[14px] text-on-surface-variant">
                  {m.full_name} · {m.email}
                </p>
              </div>
              <StatusPill status={m.priority} />
            </div>
            <p className="mt-6 font-body-md text-body-md text-on-surface-variant">{m.message}</p>
            <div className="mt-6 flex items-center justify-between gap-4">
              <span className="font-body-md text-[14px] text-on-surface-variant">
                {new Date(m.created_at).toLocaleString()}
              </span>
              <select
                className={`${fieldClass} w-44`}
                value={m.status}
                onChange={(e) =>
                  update.mutate({
                    data: { id: m.id, status: e.target.value as (typeof statuses)[number] },
                  })
                }
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
