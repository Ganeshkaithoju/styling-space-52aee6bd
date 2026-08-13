import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { SiteFooter } from "@/components/site/SiteFooter";
import { siteDataQuery } from "@/lib/site-queries";
import { submitConsultation } from "@/lib/public.functions";
import { ConsultationForm } from "@/components/consultation/ConsultationForm";

export const Route = createFileRoute("/consultation")({
  head: () => ({
    meta: [
      { title: "Book a Consultation — Styling Space Interior Designs" },
      {
        name: "description",
        content:
          "Share your vision and schedule a private consultation with the Styling Space design studio.",
      },
      { property: "og:title", content: "Book a Consultation — Styling Space" },
      {
        property: "og:description",
        content: "Schedule a private consultation with our design studio.",
      },
    ],
  }),
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", search: { redirect: "/consultation" } });
    }
  },
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(siteDataQuery);
  },
  component: ConsultationPage,
});

type ConsultationFormData = {
  service_interest: string;
  project_type: string;
  project_scope: string;
  timeline: string;
  budget_range?: string | null;
  location?: string | null;
  property_address?: string | null;
  preferred_date?: string | null;
  preferred_time: string;
  message?: string | null;
};

function ConsultationPage() {
  const { data } = useSuspenseQuery(siteDataQuery);
  const submit = useServerFn(submitConsultation);

  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  // async function confirm(formData: any) {
  async function confirm(formData: ConsultationFormData) {
    setSaving(true);
    try {
      await submit({
        data: {
          service_interest: formData.service_interest,
          project_type: formData.project_type,
          project_scope: formData.project_scope,
          timeline: formData.timeline,
          budget_range: formData.budget_range || null,
          location: formData.location || null,
          property_address: formData.property_address || null,
          preferred_date: formData.preferred_date || null,
          preferred_time: formData.preferred_time,
          message: formData.message || null,
        },
      });
      setDone(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn't submit your request.");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full border-0 border-b border-outline-variant/60 bg-transparent pt-2 pb-3 font-body-lg text-body-lg text-primary outline-none focus:border-primary";
  const label =
    "block font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant";
  const primaryBtn =
    "bg-primary px-8 py-4 font-label-caps text-label-caps uppercase tracking-widest text-on-primary transition-colors hover:bg-secondary disabled:opacity-60";
  const ghostBtn =
    "border border-outline-variant/60 px-8 py-4 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary";

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      <header className="fixed top-0 z-50 w-full border-b border-outline-variant/30 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-container-max items-center justify-between px-margin-mobile md:px-margin-desktop">
          <Link to="/" className="font-headline-md text-[22px] tracking-tight text-primary">
            Styling Space
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant hover:text-primary"
          >
            <Icon name="close" /> <span className="hidden md:inline">Exit Booking</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-container-max flex-grow px-margin-mobile pt-[120px] pb-24 md:px-margin-desktop">
        {done ? (
          <div className="mx-auto max-w-xl py-24 text-center">
            <Icon name="task_alt" className="text-[48px] text-secondary" />
            <h1 className="mt-6 font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">
              Your consultation is requested
            </h1>
            <p className="mt-4 font-body-lg text-body-lg text-on-surface-variant">
              A confirmation email with meeting details will follow shortly. We look forward to
              discussing your space.
            </p>
            <div className="mt-8 bg-surface-container-low p-6 border border-outline-variant/50 text-left">
              <h2 className="font-headline-md text-[18px] text-primary">Next Steps</h2>
              <p className="mt-2 font-body-md text-on-surface-variant">
                If your project is located at a specific property, please visit your Client Portal
                to update the property location. This helps our designers prepare accurately for
                your consultation.
              </p>
              <Link
                to="/dashboard"
                search={{ tab: "consultations" }}
                className="mt-4 inline-block font-label-caps text-xs text-secondary underline hover:text-primary transition-colors"
              >
                Go to Client Portal
              </Link>
            </div>
            <Link to="/" className={`mt-10 inline-block ${primaryBtn}`}>
              Return Home
            </Link>
          </div>
        ) : (
          <ConsultationForm
            mode="create"
            saving={saving}
            services={data.services}
            onSubmit={confirm}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
