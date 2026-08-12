import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { siteDataQuery } from "@/lib/site-queries";
import { projectImage } from "@/lib/portfolio-images";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — Styling Space Interior Designs" },
      {
        name: "description",
        content:
          "Selected works from Styling Space: residential sanctuaries, commercial curation and bespoke material studies.",
      },
      { property: "og:title", content: "Portfolio — Styling Space Interior Designs" },
      { property: "og:description", content: "Selected works from the Styling Space archive." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(siteDataQuery);
  },
  component: PortfolioPage,
});

function PortfolioPage() {
  const { data } = useSuspenseQuery(siteDataQuery);
  const [filter, setFilter] = useState<string>("All");
  const categories = ["All", ...Array.from(new Set(data.projects.map((p) => p.category)))];
  const visible =
    filter === "All" ? data.projects : data.projects.filter((p) => p.category === filter);

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-container-max flex-grow px-margin-mobile pt-32 pb-24 md:px-margin-desktop">
        <h1 className="font-display-lg text-headline-lg-mobile text-primary md:text-display-lg">
          Selected Works
        </h1>
        <p className="mt-6 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
          An archive of curated environments — each a quiet dialogue between architecture, material
          and the life lived within.
        </p>

        <div className="mt-12 flex flex-wrap gap-6 border-b border-outline-variant/40 pb-6">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`font-label-caps text-label-caps uppercase tracking-widest transition-colors ${
                filter === c ? "text-primary" : "text-on-surface-variant hover:text-secondary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-1 gap-gutter md:grid-cols-2">
          {visible.map((p, i) => (
            <article key={p.id} className="group">
              <div className="mb-4 aspect-[4/3] overflow-hidden bg-surface-variant">
                <img
                  src={projectImage(p.slug, p.cover_image_url, i)}
                  alt={p.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <h2 className="font-headline-md text-[24px] text-primary">{p.title}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {p.category} • {p.subtitle ?? p.location ?? "Studio Project"}
              </p>
              {p.description && (
                <p className="mt-3 max-w-lg font-body-md text-body-md text-on-surface-variant">
                  {p.description}
                </p>
              )}
            </article>
          ))}
        </div>

        <div className="mt-24 border border-outline-variant/30 bg-surface-container-low py-16 text-center">
          <h2 className="mb-6 font-headline-md text-headline-md text-primary">
            Your space, considered.
          </h2>
          <Link
            to="/consultation"
            className="inline-block bg-primary px-8 py-4 font-label-caps text-label-caps uppercase tracking-widest text-on-primary transition-colors hover:bg-secondary"
          >
            Book a Consultation
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
