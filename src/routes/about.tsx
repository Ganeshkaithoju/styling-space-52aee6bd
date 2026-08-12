import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Icon } from "@/components/Icon";
import { images } from "@/lib/portfolio-images";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "The Studio — Styling Space Interior Designs" },
      {
        name: "description",
        content:
          "Styling Space is dedicated to minimalist luxury and the Ethereal Dwelling concept — bespoke sanctuaries grounded in profound serenity.",
      },
      { property: "og:title", content: "The Studio — Styling Space Interior Designs" },
      {
        property: "og:description",
        content: "Minimalist luxury, hushed environments and the Ethereal Dwelling concept.",
      },
    ],
  }),
  component: AboutPage,
});

const values = [
  {
    icon: "architecture",
    title: "Artistry",
    body: "Elevating every detail to a sculptural form, ensuring each space is a curated masterpiece.",
  },
  {
    icon: "balance",
    title: "Integrity",
    body: "Honoring the truth of materials and architectural intent with unyielding authenticity.",
  },
  {
    icon: "spa",
    title: "Serenity",
    body: "Designing environments that quiet the mind and offer sanctuary from the external world.",
  },
];

function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-container-max flex-grow px-margin-mobile pt-32 pb-24 md:px-margin-desktop">
        <section className="mb-32 grid grid-cols-1 items-center gap-gutter md:grid-cols-12">
          <div className="mb-12 md:col-span-5 md:mb-0 md:pr-12">
            <h1 className="mb-8 font-display-lg text-headline-lg-mobile text-primary md:text-display-lg">
              The Studio
            </h1>
            <p className="mb-6 font-body-lg text-body-lg text-on-surface-variant">
              Styling Space is dedicated to the pursuit of minimalist luxury. We believe in the
              power of hushed environments to restore and inspire. Our approach centers on the
              “Ethereal Dwelling” concept—spaces that feel lighter than air, grounded in profound
              serenity.
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              We strip away the superfluous to reveal the essential architecture of living, creating
              bespoke sanctuaries tailored to individuals seeking uncompromising aesthetic purity.
            </p>
          </div>
          <div className="md:col-span-7">
            <div className="aspect-[4/3] overflow-hidden border border-outline-variant/30 bg-surface-variant">
              <img
                src={images.studio}
                alt="Material samples and sketches laid out on the studio worktable"
                loading="lazy"
                className="h-full w-full object-cover grayscale opacity-90 transition duration-700 hover:opacity-100 hover:grayscale-0"
              />
            </div>
          </div>
        </section>

        <section className="relative mb-32">
          <div className="grid grid-cols-1 items-center gap-gutter md:grid-cols-12">
            <div className="mb-12 md:col-span-5 md:col-start-2 md:mb-0">
              <div className="aspect-[3/4] overflow-hidden border border-outline-variant/30 bg-surface-variant">
                <img
                  src={images.atelier}
                  alt="Interior detail from a project led by founder Elena Rostova"
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="md:col-span-5 md:col-start-8">
              <h2 className="mb-4 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                Our Founder
              </h2>
              <h3 className="mb-6 font-headline-md text-headline-md text-primary">Elena Rostova</h3>
              <p className="mb-6 font-body-lg text-body-lg text-on-surface-variant">
                As Lead Designer, Elena Rostova brings a visionary approach to interior
                architecture. Her signature style is defined by an uncompromising mastery of natural
                light and the integration of highly tactile, bespoke materials.
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                With over a decade of curating environments for discerning clients globally, Elena
                believes that true luxury is found not in abundance, but in the perfect articulation
                of space and silence.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-32">
          <div className="mb-16 text-center">
            <h2 className="font-headline-md text-headline-md text-primary">Core Principles</h2>
          </div>
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
            {values.map((v) => (
              <div
                key={v.title}
                className="group flex flex-col items-center border border-outline-variant/30 p-8 text-center transition-colors hover:bg-surface-container-low"
              >
                <Icon
                  name={v.icon}
                  className="mb-6 text-[36px] text-on-surface-variant group-hover:text-secondary"
                />
                <h4 className="mb-4 font-label-caps text-label-caps uppercase tracking-widest text-primary">
                  {v.title}
                </h4>
                <p className="font-body-md text-body-md text-on-surface-variant">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-24">
          <div className="border-t border-outline-variant/30 pt-16">
            <h2 className="mb-12 text-center font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
              Selected Recognition
            </h2>
            <div className="flex flex-wrap justify-center gap-12 opacity-60">
              <span className="font-headline-md text-headline-md font-bold text-surface-tint">
                Arch Digest
              </span>
              <span className="font-headline-md text-headline-md italic text-surface-tint">
                Vogue Living
              </span>
              <span className="font-headline-md text-headline-md text-surface-tint">Monocle</span>
              <span className="font-headline-md text-headline-md uppercase tracking-wider text-surface-tint">
                Elle Decor
              </span>
            </div>
          </div>
        </section>

        <section className="border border-outline-variant/30 bg-surface-container-low py-20 text-center">
          <h2 className="mb-6 font-headline-md text-headline-md text-primary">
            Begin Your Journey
          </h2>
          <p className="mx-auto mb-8 max-w-lg font-body-md text-body-md text-on-surface-variant">
            Connect with our studio to discuss realizing your vision for an ethereal dwelling.
          </p>
          <Link
            to="/consultation"
            className="inline-block bg-primary px-8 py-4 font-label-caps text-label-caps uppercase tracking-widest text-on-primary transition-colors hover:bg-secondary"
          >
            Contact Us
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
