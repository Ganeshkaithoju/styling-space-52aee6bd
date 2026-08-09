import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Icon } from "@/components/Icon";
import { siteDataQuery } from "@/lib/site-queries";
import { images, projectImage } from "@/lib/portfolio-images";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Styling Space — Curated Interior Design Studio" },
      {
        name: "description",
        content:
          "Bespoke interior design for those who value the art of the home. Residential design, commercial curation and bespoke materials.",
      },
      { property: "og:title", content: "Styling Space — Curated Interior Design Studio" },
      {
        property: "og:description",
        content: "Bespoke interior design for those who value the art of the home.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(siteDataQuery);
  },
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(siteDataQuery);
  const services = data.services.slice(0, 3);
  const featured = data.projects.filter((p) => p.featured);
  const hero = featured[0] ?? data.projects[0];
  const secondary = featured[1] ?? data.projects[1];

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteHeader />
      <main className="pt-20">
        <section className="relative flex h-[80vh] min-h-[600px] items-center justify-center">
          <div className="absolute inset-0 z-0">
            <img
              src={images.hero}
              alt="A vast, minimalist luxury living room with floor-to-ceiling windows and serene natural light"
              width={1920}
              height={1080}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-surface/20" />
          </div>
          <div className="relative z-10 max-w-3xl px-margin-mobile text-center">
            <h1 className="mb-6 font-display-lg text-[40px] leading-tight text-primary drop-shadow-md md:text-[80px]">
              Curated Spaces. Elevated Living.
            </h1>
            <p className="mx-auto max-w-xl font-body-lg text-body-lg text-primary drop-shadow">
              Bespoke interior design for those who value the art of the home.
            </p>
          </div>
        </section>

        <section className="flex justify-center bg-surface-container-lowest px-margin-mobile py-[120px] md:px-margin-desktop md:py-[160px]">
          <div className="max-w-4xl text-center">
            <p className="font-headline-lg-mobile text-headline-lg-mobile italic leading-relaxed text-balance text-on-surface md:text-headline-lg">
              “We believe a home should be a sanctuary—a reflection of your journey and a canvas for
              your future.”
            </p>
            <div className="mx-auto mt-8 h-[1px] w-16 bg-outline-variant" />
          </div>
        </section>

        <section id="services" className="bg-surface px-margin-mobile py-[120px] md:px-margin-desktop">
          <div className="mx-auto max-w-container-max">
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
              {services.map((s) => (
                <div key={s.id} className="group border-t border-outline-variant/50 pt-8">
                  <span className="mb-4 block font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                    {s.number}
                  </span>
                  <h3 className="mb-4 font-headline-md text-headline-md text-primary">{s.title}</h3>
                  <p className="mb-8 max-w-sm font-body-md text-body-md text-on-surface-variant">
                    {s.description}
                  </p>
                  <Link
                    to="/services"
                    className="inline-flex items-center gap-2 font-label-caps text-label-caps uppercase tracking-widest text-secondary transition-colors hover:text-primary"
                  >
                    Explore <Icon name="arrow_forward" className="text-[16px]" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="portfolio" className="bg-surface-container-low px-margin-mobile py-[120px] md:px-margin-desktop md:py-[160px]">
          <div className="mx-auto max-w-container-max">
            <div className="mb-16 flex items-end justify-between border-b border-outline-variant/50 pb-8">
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary md:text-headline-lg">
                Selected Works
              </h2>
              <Link
                to="/portfolio"
                className="hidden font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant transition-colors hover:text-secondary md:inline-flex"
              >
                View Full Archive
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
              {hero && (
                <Link
                  to="/portfolio"
                  className="group mb-gutter cursor-pointer md:col-span-8 md:mb-0"
                >
                  <div className="relative mb-4 aspect-[4/3] overflow-hidden bg-surface-variant">
                    <img
                      src={projectImage(hero.slug, hero.cover_image_url, 0)}
                      alt={hero.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-headline-md text-headline-md text-primary">{hero.title}</h4>
                      <p className="font-body-md text-body-md text-on-surface-variant">
                        {hero.category} • {hero.subtitle ?? hero.location}
                      </p>
                    </div>
                    <Icon
                      name="arrow_outward"
                      className="text-outline-variant transition-colors group-hover:text-secondary"
                    />
                  </div>
                </Link>
              )}

              {secondary && (
                <div className="flex flex-col gap-gutter md:col-span-4">
                  <Link to="/portfolio" className="group cursor-pointer">
                    <div className="relative mb-4 aspect-[3/4] overflow-hidden bg-surface-variant">
                      <img
                        src={projectImage(secondary.slug, secondary.cover_image_url, 1)}
                        alt={secondary.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <h4 className="font-headline-md text-[24px] text-primary">{secondary.title}</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      {secondary.category} • {secondary.subtitle ?? secondary.location}
                    </p>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        <CategorySpotlight
          title="Residential Excellence"
          items={data.projects.filter((p) => p.category === "Residential").slice(0, 3)}
        />
        <CategorySpotlight
          title="Commercial Curation"
          items={data.projects.filter((p) => p.category !== "Residential").slice(0, 3)}
          alt
        />

        <section className="flex flex-col items-center justify-center bg-surface px-margin-mobile py-[120px] text-center md:px-margin-desktop md:py-[160px]">
          <h2 className="mb-8 max-w-2xl font-display-lg text-[40px] text-balance text-primary md:text-[72px]">
            Begin Your Transformation.
          </h2>
          <p className="mb-12 max-w-lg font-body-lg text-body-lg text-on-surface-variant">
            Schedule a private consultation to discuss your vision and discover how we can elevate
            your environment.
          </p>
          <Link
            to="/consultation"
            className="inline-block bg-primary px-8 py-4 font-label-caps text-label-caps uppercase tracking-widest text-on-primary shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-secondary hover:shadow-md"
          >
            Book a Consultation
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function CategorySpotlight({
  title,
  items,
  alt = false,
}: {
  title: string;
  items: { id: string; slug: string; title: string; description: string | null; cover_image_url: string | null }[];
  alt?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div
      className={`border-b border-outline-variant/20 px-margin-mobile py-[120px] md:px-margin-desktop ${
        alt ? "bg-surface-container-lowest" : "bg-surface"
      }`}
    >
      <div className="mx-auto max-w-container-max">
        <div className="mb-12 flex flex-col items-baseline justify-between gap-4 md:flex-row">
          <h2 className="font-display-lg text-headline-lg-mobile text-primary md:text-display-lg">
            {title}
          </h2>
          <Link
            to="/portfolio"
            className="group inline-flex items-center gap-2 font-label-caps text-label-caps uppercase tracking-widest text-secondary transition-colors hover:text-primary"
          >
            Explore Category
            <Icon name="arrow_forward" className="text-[16px] transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
          {items.map((p, i) => (
            <div key={p.id} className="group">
              <div className="mb-4 aspect-[4/3] overflow-hidden bg-surface-variant">
                <img
                  src={projectImage(p.slug, p.cover_image_url, i)}
                  alt={p.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <h4 className="mb-2 font-headline-md text-[24px] text-primary">{p.title}</h4>
              <p className="font-body-md text-body-md text-on-surface-variant">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
