import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell, buttonClass, fieldClass, labelClass } from "@/components/admin/AdminShell";
import { listSettings, saveSettings } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "settings"], queryFn: () => listSettings() });

  const save = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["site-data"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data ?? [];
  const categories = [...new Set(rows.map((r) => r.category))];

  return (
    <AdminShell title="Settings" description="Studio details used across the public site.">
      <form
        key={rows.length}
        className="max-w-4xl"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          save.mutate({
            data: {
              values: rows.map((r) => ({ id: r.id, setting_value: String(fd.get(r.id) ?? "") || null })),
            },
          });
        }}
      >
        {categories.map((cat) => (
          <section key={cat} className="mb-10 border border-outline-variant/60 bg-surface-container-lowest p-8">
            <h2 className="font-label-caps text-label-caps uppercase tracking-widest text-secondary">{cat}</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {rows
                .filter((r) => r.category === cat)
                .map((r) => (
                  <div key={r.id}>
                    <label className={labelClass}>{r.label ?? r.setting_key}</label>
                    <input name={r.id} defaultValue={r.setting_value ?? ""} className={`${fieldClass} mt-2`} />
                  </div>
                ))}
            </div>
          </section>
        ))}
        {rows.length === 0 && (
          <p className="font-body-md text-body-md text-on-surface-variant">No settings configured.</p>
        )}
        <button type="submit" className={buttonClass} disabled={save.isPending}>
          Save settings
        </button>
      </form>
    </AdminShell>
  );
}
