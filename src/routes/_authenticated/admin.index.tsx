import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell, StatusPill } from "@/components/admin/AdminShell";
import { getOverview } from "@/lib/admin.functions";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: OverviewPage,
});

function OverviewPage() {
  const { data } = useQuery({ queryKey: ["admin", "overview"], queryFn: () => getOverview() });

  const stats = [
    {
      label: "Portfolio projects",
      value: data?.projectCount ?? 0,
      hint: `${data?.publishedProjects ?? 0} published`,
    },
    {
      label: "Total Consultations",
      value: data?.consultationCount ?? 0,
      hint: `${data?.completedConsultations ?? 0} completed`,
    },
    {
      label: "Pending Consultations",
      value: data?.pendingConsultations ?? 0,
      hint: "needs action",
    },
    { label: "Active Users", value: data?.activeUsers ?? 0, hint: "registered accounts" },
    { label: "Services", value: data?.serviceCount ?? 0, hint: "live offerings" },
    { label: "Open support", value: data?.openSupport ?? 0, hint: "awaiting reply" },
  ];

  return (
    <AdminShell
      title="Overview"
      description="A snapshot of the studio's content and client activity."
    >
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

      {data?.mostRequestedServices && data.mostRequestedServices.length > 0 && (
        <section className="mt-16">
          <h2 className="font-headline-md text-headline-md text-primary mb-6">
            Most Requested Services
          </h2>
          <div className="h-[300px] bg-surface-container-lowest p-6 border border-outline-variant/60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.mostRequestedServices}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#555"
                  opacity={0.2}
                />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="title" type="category" width={150} tick={{ fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  contentStyle={{ backgroundColor: "#1A1C19", border: "none", color: "#E2E3DD" }}
                />
                <Bar dataKey="count" fill="#4B6354" radius={[0, 4, 4, 0]} name="Requests" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

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
