import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell, buttonClass, fieldClass, labelClass } from "@/components/admin/AdminShell";
import { listContent, saveContent } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: ContentPage,
});

function ContentPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "content"], queryFn: () => listContent() });

  const contentMutation = useMutation({
    mutationFn: saveContent,
    onSuccess: () => {
      toast.success("Content updated");
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
      <div className="mt-10 flex flex-col gap-8">
        {(data?.content ?? []).map((row) => (
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
                <input
                  name="heading"
                  defaultValue={row.heading ?? ""}
                  className={`${fieldClass} mt-2`}
                />
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
              <textarea
                name="body"
                rows={4}
                defaultValue={row.body ?? ""}
                className={`${fieldClass} mt-2`}
              />
            </div>
            <button
              type="submit"
              className={`${buttonClass} mt-6`}
              disabled={contentMutation.isPending}
            >
              Save section
            </button>
          </form>
        ))}
      </div>
    </AdminShell>
  );
}
