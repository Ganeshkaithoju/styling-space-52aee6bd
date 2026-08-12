import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { useQuery } from "@tanstack/react-query";
import { listAuditLogsFn } from "@/lib/admin.functions";
import { useState } from "react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AdminAuditPage,
});

function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const pageSize = 50;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["audit_logs", page, actionFilter, entityFilter],
    queryFn: () =>
      listAuditLogsFn({
        data: {
          page,
          pageSize,
          action: actionFilter || undefined,
          entityType: entityFilter || undefined,
        },
      }),
  });

  return (
    <AdminShell title="Audit Logs">
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <p className="font-body text-on-surface-variant">
            A secure record of administrative actions across the platform.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end">
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">Action</label>
          <input
            type="text"
            className="w-full md:w-48 bg-surface-container border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Filter action..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">
            Entity Type
          </label>
          <input
            type="text"
            className="w-full md:w-48 bg-surface-container border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Filter entity..."
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="mt-8 overflow-x-auto border border-outline-variant/50">
        <table className="w-full text-left font-body-md text-on-surface">
          <thead>
            <tr className="border-b border-outline-variant/50 bg-surface-container/50">
              <th className="px-4 py-3 font-label-caps text-xs uppercase tracking-widest text-on-surface-variant">
                Date & Time
              </th>
              <th className="px-4 py-3 font-label-caps text-xs uppercase tracking-widest text-on-surface-variant">
                Actor
              </th>
              <th className="px-4 py-3 font-label-caps text-xs uppercase tracking-widest text-on-surface-variant">
                Action
              </th>
              <th className="px-4 py-3 font-label-caps text-xs uppercase tracking-widest text-on-surface-variant">
                Entity
              </th>
              <th className="px-4 py-3 font-label-caps text-xs uppercase tracking-widest text-on-surface-variant">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                  Loading logs...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-error">
                  Error loading logs: {error.message}
                </td>
              </tr>
            ) : !data || data.logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                  No logs found.
                </td>
              </tr>
            ) : (
              data.logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-outline-variant/20 last:border-0 hover:bg-surface-container/20"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{log.actor_name}</div>
                    <div className="text-xs text-on-surface-variant">{log.actor_email}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-block rounded-sm bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm capitalize">
                    {log.entity_type}
                    {log.entity_id && (
                      <span
                        className="ml-1 text-xs text-on-surface-variant truncate max-w-[100px] inline-block align-bottom"
                        title={log.entity_id}
                      >
                        ({log.entity_id.split("-")[0]})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{log.description}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-on-surface-variant">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, data.totalCount)} of{" "}
            {data.totalCount} logs
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 text-sm border border-outline-variant disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm">
              Page {page} of {data.totalPages}
            </span>
            <button
              disabled={page === data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 text-sm border border-outline-variant disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
