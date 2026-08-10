import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AdminShell,
  buttonClass,
  fieldClass,
  labelClass,
} from "@/components/admin/AdminShell";
import { listContent, saveContent, saveService } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: ContentPage,
});

function ContentPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "content"], queryFn: () => listContent() });
  const [tab, setTab] = useState<"content" | "services">("content");

  const contentMutation = useMutation({
    mutationFn: saveContent,
    onSuccess: () => {
      toast.success("Content updated");
      qc.invalidateQueries({ queryKey: ["admin", "content"] });
      qc.invalidateQueries({ queryKey: ["site-data"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const serviceMutation = useMutation({
    mutationFn: saveService,
    onSuccess: () => {
      toast.success("Service updated");
      qc.invalidateQueries({ queryKey: ["admin", "content"] });
      qc.invalidateQueries({ queryKey: ["site-data"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell
      title="Content Manager"
      description="Edit the copy that appears across the public site, section by section."
    >
      <div className="flex gap-2 border-b border-outline-variant/50">
        {(["content", "services"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-5 py-3 font-label-caps text-label-caps uppercase tracking-widest transition-colors ${
              tab === t ? "border-b-2 border-secondary text-primary" : "text-on-surface-variant"
            }`}
          >
            {t === "content" ? "Page sections" : "Services"}
          </button>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-8">
        {tab === "content" &&
          (data?.content ?? []).map((row) => (
            <form
              key={row.id}
              className="border border-outline-variant/60 bg-surface-container-lowest p-8"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                contentMutation.mutate({
                  data: {
                    id: row.id,
                    heading: String(fd.get("heading") ?? ""),
                    body: String(fd.get("body") ?? ""),
                    status: String(fd.get("status")) === "draft" ? "draft" : "published",
                  },
                });
              }}
            >
              <p className="font-label-caps text-label-caps uppercase tracking-widest text-secondary">
                {row.page} · {row.section ?? row.content_key}
              </p>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Heading</label>
                  <input name="heading" defaultValue={row.heading ?? ""} className={`${fieldClass} mt-2`} />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select name="status" defaultValue={row.status} className={`${fieldClass} mt-2`}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              <div className="mt-6">
                <label className={labelClass}>Body</label>
                <textarea name="body" rows={4} defaultValue={row.body ?? ""} className={`${fieldClass} mt-2`} />
              </div>
              <button type="submit" className={`${buttonClass} mt-6`} disabled={contentMutation.isPending}>
                Save section
              </button>
            </form>
          ))}

        {tab === "services" &&
          (data?.services ?? []).map((row) => (
            <form
              key={row.id}
              className="border border-outline-variant/60 bg-surface-container-lowest p-8"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                serviceMutation.mutate({
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
              <div className="grid gap-6 md:grid-cols-4">
                <div>
                  <label className={labelClass}>Number</label>
                  <input name="number" defaultValue={row.number} className={`${fieldClass} mt-2`} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Title</label>
                  <input name="title" defaultValue={row.title} className={`${fieldClass} mt-2`} />
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
                  <label className={labelClass}>Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={row.description ?? ""}
                    className={`${fieldClass} mt-2`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Details</label>
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
                <button type="submit" className={buttonClass} disabled={serviceMutation.isPending}>
                  Save service
                </button>
              </div>
            </form>
          ))}
      </div>
    </AdminShell>
  );
}
