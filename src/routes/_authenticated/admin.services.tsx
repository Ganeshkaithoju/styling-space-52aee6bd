import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell, buttonClass, fieldClass, labelClass } from "@/components/admin/AdminShell";
import { listServicesAdmin, createService, updateService, deleteService } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/services")({
  component: ServicesPage,
});

function ServicesPage() {
  const qc = useQueryClient();
  const { data: services } = useQuery({ queryKey: ["admin", "services"], queryFn: () => listServicesAdmin() });
  const [isCreating, setIsCreating] = useState(false);

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      toast.success("Service created");
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
      qc.invalidateQueries({ queryKey: ["site-data"] });
      setIsCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: updateService,
    onSuccess: () => {
      toast.success("Service updated");
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
      qc.invalidateQueries({ queryKey: ["site-data"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      toast.success("Service deleted");
      qc.invalidateQueries({ queryKey: ["admin", "services"] });
      qc.invalidateQueries({ queryKey: ["site-data"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this service?")) {
      deleteMutation.mutate({ data: { id } });
    }
  }

  return (
    <AdminShell
      title="Services Manager"
      description="Create, edit, and organize the services you offer. Published services appear on the main site and in the booking flow."
      actions={
        <button className={buttonClass} onClick={() => setIsCreating(true)}>
          New Service
        </button>
      }
    >
      <div className="mt-8 flex flex-col gap-8">
        {isCreating && (
          <form
            className="border-2 border-primary bg-surface-container-lowest p-8"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createMutation.mutate({
                data: {
                  number: String(fd.get("number") ?? ""),
                  title: String(fd.get("title") ?? ""),
                  description: String(fd.get("description") ?? ""),
                  details: String(fd.get("details") ?? ""),
                  status: String(fd.get("status")) === "draft" ? "draft" : "published",
                  sort_order: Number(fd.get("sort_order") ?? 0),
                },
              });
            }}
          >
            <h3 className="mb-6 font-headline-md text-[20px] text-primary">Create New Service</h3>
            <div className="grid gap-6 md:grid-cols-4">
              <div>
                <label className={labelClass}>Number</label>
                <input name="number" placeholder="01" className={`${fieldClass} mt-2`} required />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Title</label>
                <input name="title" placeholder="Service Name" className={`${fieldClass} mt-2`} required />
              </div>
              <div>
                <label className={labelClass}>Order</label>
                <input name="sort_order" type="number" min={0} defaultValue={0} className={`${fieldClass} mt-2`} />
              </div>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <label className={labelClass}>Description (Short)</label>
                <textarea name="description" rows={3} className={`${fieldClass} mt-2`} />
              </div>
              <div>
                <label className={labelClass}>Details (Long)</label>
                <textarea name="details" rows={3} className={`${fieldClass} mt-2`} />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-end gap-6">
              <div className="w-48">
                <label className={labelClass}>Status</label>
                <select name="status" defaultValue="draft" className={`${fieldClass} mt-2`}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <button type="submit" className={buttonClass} disabled={createMutation.isPending}>
                Create service
              </button>
              <button type="button" onClick={() => setIsCreating(false)} className="px-4 font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-primary">
                Cancel
              </button>
            </div>
          </form>
        )}

        {(services ?? []).map((row) => (
          <form
            key={row.id}
            className="border border-outline-variant/60 bg-surface-container-lowest p-8"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              updateMutation.mutate({
                data: {
                  id: row.id,
                  number: String(fd.get("number") ?? ""),
                  title: String(fd.get("title") ?? ""),
                  description: String(fd.get("description") ?? ""),
                  details: String(fd.get("details") ?? ""),
                  status: String(fd.get("status")) === "draft" ? "draft" : "published",
                  sort_order: Number(fd.get("sort_order") ?? 0),
                },
              });
            }}
          >
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-headline-md text-[20px] text-primary">{row.title}</h3>
              <button
                type="button"
                onClick={() => handleDelete(row.id)}
                className="font-label-caps text-[12px] uppercase text-error hover:underline"
              >
                Delete
              </button>
            </div>
            <div className="grid gap-6 md:grid-cols-4">
              <div>
                <label className={labelClass}>Number</label>
                <input name="number" defaultValue={row.number} className={`${fieldClass} mt-2`} required />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Title</label>
                <input name="title" defaultValue={row.title} className={`${fieldClass} mt-2`} required />
              </div>
              <div>
                <label className={labelClass}>Order</label>
                <input
                  name="sort_order"
                  type="number"
                  min={0}
                  defaultValue={row.sort_order}
                  className={`${fieldClass} mt-2`}
                />
              </div>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <label className={labelClass}>Description (Short)</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={row.description ?? ""}
                  className={`${fieldClass} mt-2`}
                />
              </div>
              <div>
                <label className={labelClass}>Details (Long)</label>
                <textarea
                  name="details"
                  rows={3}
                  defaultValue={row.details ?? ""}
                  className={`${fieldClass} mt-2`}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-end gap-6">
              <div className="w-48">
                <label className={labelClass}>Status</label>
                <select name="status" defaultValue={row.status} className={`${fieldClass} mt-2`}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <button type="submit" className={buttonClass} disabled={updateMutation.isPending}>
                Save service
              </button>
            </div>
          </form>
        ))}
      </div>
    </AdminShell>
  );
}
