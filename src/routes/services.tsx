import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Icon } from "@/components/Icon";
import { siteDataQuery } from "@/lib/site-queries";
import { images } from "@/lib/portfolio-images";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Our Services — Styling Space Interior Designs" },
      {
        name: "description",
        content:
          "Residential design, commercial curation and bespoke material sourcing — interior architecture composed with hushed luxury.",
      },
      { property: "og:title", content: "Our Services — Styling Space Interior Designs" },
      {
        property: "og:description",
        content: "Interior architecture composed with hushed luxury, from concept to execution.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(siteDataQuery);
  },
  component: ServicesPage,
});

const processSteps = [
  {
    title: "Consultation & Discovery",
    body: "Understanding your narrative and spatial requirements.",
  },
  {
    title: "Conceptual Architecture",
    body: "Developing a cohesive visual language and structural flow.",
  },
  {
    title: "Precision Execution",
    body: "Overseeing bespoke fabrication and seamless installation.",
  },
];

const serviceImages = [images.nordic, images.maison, images.atelier, images.coastal];

function ServicesPage() {
  const { data } = useSuspenseQuery(siteDataQuery);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteHeader />
      <main className="pt-[120px]">
        <section className="mx-auto max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
            <div className="space-y-8 text-center md:col-span-8 md:col-start-3">
              <h1 className="font-display-lg text-headline-lg-mobile text-primary md:text-display-lg">
                Our Services
              </h1>
              <p className="mx-auto max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
                We approach interior architecture as a silent dialogue between form, function, and
                the human spirit. Our services are tailored to orchestrate spaces that embody a
                hushed luxury—curated environments where every line, texture, and silence is
                deliberately composed.
              </p>
            </div>
          </div>
        </section>

        {data.services.map((service, index) => {
          const reverse = index % 2 === 1;
          return (
            <section
              key={service.id}
              className="mx-auto max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24"
            >
              <div className="grid grid-cols-1 items-center gap-gutter md:grid-cols-12">
                <div
                  className={`md:col-span-6 ${reverse ? "md:order-2 md:col-start-7" : "order-2 md:order-1"}`}
                >
                  <img
                    src={serviceImages[index % serviceImages.length]}
                    alt={service.title}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover"
                  />
                </div>
                <div
                  className={`mb-12 space-y-8 md:mb-0 md:col-span-5 ${
                    reverse ? "md:order-1 md:col-start-2" : "order-1 md:order-2 md:col-start-8"
                  }`}
                >
                  <div className="inline-block border border-outline-variant/50 px-3 py-1 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                    {service.number}
                  </div>
                  <h2 className="font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
                    {service.title}
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {service.description}
                  </p>
                  {service.details && (
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      {service.details}
                    </p>
                  )}
                  {index === 0 && (
                    <div className="space-y-4 border-t border-outline-variant/30 pt-4">
                      <h3 className="font-label-caps text-label-caps uppercase tracking-widest text-primary">
                        The Process
                      </h3>
                      {processSteps.map((step) => (
                        <div key={step.title} className="flex items-start gap-4">
                          <Icon
                            name="circle"
                            filled
                            className="mt-1 text-[10px] text-outline-variant"
                          />
                          <div>
                            <h4 className="font-body-md text-body-md font-semibold text-primary">
                              {step.title}
                            </h4>
                            <p className="mt-1 font-body-md text-sm text-on-surface-variant">
                              {step.body}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}

        <section className="mx-auto max-w-container-max px-margin-mobile py-24 text-center md:px-margin-desktop md:py-32">
          <div className="mx-auto max-w-3xl space-y-8">
            <h2 className="font-display-lg text-headline-lg-mobile text-primary md:text-display-lg">
              Begin Your Transformation
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Entrust us with your vision, and we will sculpt it into a reality defined by quiet
              confidence and architectural grace.
            </p>
            <div className="pt-8">
              <Link
                to="/consultation"
                className="inline-flex items-center justify-center bg-primary px-8 py-4 font-label-caps text-label-caps uppercase tracking-widest text-on-primary transition-colors hover:bg-secondary"
              >
                Inquire Now
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
