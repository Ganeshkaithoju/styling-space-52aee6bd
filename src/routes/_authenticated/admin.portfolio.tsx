import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AdminShell,
  StatusPill,
  buttonClass,
  fieldClass,
  ghostButtonClass,
  labelClass,
} from "@/components/admin/AdminShell";
import { deleteProject, listProjects, saveProject } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/portfolio")({
  component: PortfolioEditor,
});

type ProjectRow = Awaited<ReturnType<typeof listProjects>>[number];

const empty = {
  id: null as string | null,
  title: "",
  slug: "",
  category: "Residential",
  subtitle: "",
  description: "",
  location: "",
  year: "",
  cover_image_url: "",
  status: "draft" as "draft" | "published",
  featured: false,
  sort_order: 0,
};

function PortfolioEditor() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "projects"], queryFn: () => listProjects() });
  const [form, setForm] = useState<typeof empty | null>(null);

  const save = useMutation({
    mutationFn: saveProject,
    onSuccess: () => {
      toast.success("Project saved");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      qc.invalidateQueries({ queryKey: ["site-data"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      toast.success("Project deleted");
      qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      qc.invalidateQueries({ queryKey: ["site-data"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function edit(p: ProjectRow) {
    setForm({
      id: p.id,
      title: p.title,
      slug: p.slug,
      category: p.category,
      subtitle: p.subtitle ?? "",
      description: p.description ?? "",
      location: p.location ?? "",
      year: p.year ?? "",
      cover_image_url: p.cover_image_url ?? "",
      status: p.status === "published" ? "published" : "draft",
      featured: p.featured,
      sort_order: p.sort_order,
    });
  }

  return (
    <AdminShell
      title="Portfolio Editor"
      description="Create, publish and order the projects shown in the public portfolio."
      actions={
        <button type="button" className={buttonClass} onClick={() => setForm({ ...empty })}>
          New project
        </button>
      }
    >
      {form && (
        <form
          className="mb-12 border border-outline-variant/60 bg-surface-container-lowest p-8"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({
              data: {
                ...form,
                subtitle: form.subtitle || null,
                description: form.description || null,
                location: form.location || null,
                year: form.year || null,
                cover_image_url: form.cover_image_url || null,
              },
            });
          }}
        >
          <h2 className="font-headline-md text-headline-md text-primary">
            {form.id ? "Edit project" : "New project"}
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <label className={labelClass}>Title</label>
              <input
                required
                className={`${fieldClass} mt-2`}
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                    slug: form.id
                      ? form.slug
                      : e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, ""),
                  })
                }
              />
            </div>
            <div>
              <label className={labelClass}>Slug</label>
              <input
                required
                className={`${fieldClass} mt-2`}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select
                className={`${fieldClass} mt-2`}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {["Residential", "Commercial", "Hospitality", "Retail"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Subtitle</label>
              <input
                className={`${fieldClass} mt-2`}
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Location</label>
              <input
                className={`${fieldClass} mt-2`}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Year</label>
              <input
                className={`${fieldClass} mt-2`}
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Cover image URL</label>
              <input
                className={`${fieldClass} mt-2`}
                value={form.cover_image_url}
                onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                rows={4}
                className={`${fieldClass} mt-2`}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={`${fieldClass} mt-2`}
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value === "published" ? "published" : "draft" })
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Sort order</label>
              <input
                type="number"
                min={0}
                className={`${fieldClass} mt-2`}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <label className="flex items-center gap-3 font-body-md text-body-md text-on-surface">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              />
              Feature on home page
            </label>
          </div>
          <div className="mt-8 flex gap-3">
            <button type="submit" className={buttonClass} disabled={save.isPending}>
              Save project
            </button>
            <button type="button" className={ghostButtonClass} onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="border border-outline-variant/60">
        {(data ?? []).length === 0 && (
          <p className="p-8 font-body-md text-body-md text-on-surface-variant">No projects yet.</p>
        )}
        {(data ?? []).map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/40 p-6 last:border-b-0"
          >
            <div>
              <p className="font-body-lg text-body-lg text-on-surface">
                {p.title}
                {p.featured && <span className="ml-3 text-secondary">★</span>}
              </p>
              <p className="font-body-md text-[14px] text-on-surface-variant">
                {p.category}
                {p.location ? ` · ${p.location}` : ""}
                {p.year ? ` · ${p.year}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusPill status={p.status} />
              <button type="button" className={ghostButtonClass} onClick={() => edit(p)}>
                Edit
              </button>
              <button
                type="button"
                className={ghostButtonClass}
                onClick={() => {
                  if (confirm(`Delete "${p.title}"?`)) remove.mutate({ data: { id: p.id } });
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
