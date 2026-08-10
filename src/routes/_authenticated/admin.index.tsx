import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell, StatusPill } from "@/components/admin/AdminShell";
import { getOverview } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: OverviewPage,
});

function OverviewPage() {
  const { data } = useQuery({ queryKey: ["admin", "overview"], queryFn: () => getOverview() });

  const stats = [
    { label: "Portfolio projects", value: data?.projectCount ?? 0, hint: `${data?.publishedProjects ?? 0} published` },
    { label: "Consultations", value: data?.consultationCount ?? 0, hint: `${data?.newConsultations ?? 0} new` },
    { label: "Open support", value: data?.openSupport ?? 0, hint: "awaiting reply" },
    { label: "Services", value: data?.serviceCount ?? 0, hint: "live offerings" },
  ];

  return (
    <AdminShell title="Overview" description="A snapshot of the studio's content and client activity.">
      <div className="grid gap-px bg-outline-variant/50 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface-container-lowest p-8">
            <p className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
              {s.label}
            </p>
            <p className="mt-4 font-headline-lg text-headline-lg text-primary">{s.value}</p>
            <p className="mt-2 font-body-md text-[14px] text-on-surface-variant">{s.hint}</p>
          </div>
        ))}
      </div>

      <section className="mt-16">
        <div className="flex items-end justify-between">
          <h2 className="font-headline-md text-headline-md text-primary">Recent consultations</h2>
          <Link
            to="/admin/consultations"
            className="font-label-caps text-label-caps uppercase tracking-widest text-secondary"
          >
            View all
          </Link>
        </div>

        <div className="mt-6 border border-outline-variant/60">
          {(data?.recent ?? []).length === 0 && (
            <p className="p-8 font-body-md text-body-md text-on-surface-variant">
              No consultation requests yet.
            </p>
          )}
          {(data?.recent ?? []).map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/40 p-6 last:border-b-0"
            >
              <div>
                <p className="font-body-lg text-body-lg text-on-surface">{c.full_name}</p>
                <p className="font-body-md text-[14px] text-on-surface-variant">
                  {c.email}
                  {c.service_interest ? ` · ${c.service_interest}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-body-md text-[14px] text-on-surface-variant">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
                <StatusPill status={c.status} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
