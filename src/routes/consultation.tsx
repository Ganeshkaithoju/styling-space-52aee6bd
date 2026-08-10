import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Icon } from "@/components/Icon";
import { SiteFooter } from "@/components/site/SiteFooter";
import { siteDataQuery } from "@/lib/site-queries";
import { submitConsultation } from "@/lib/public.functions";

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
      { property: "og:description", content: "Schedule a private consultation with our design studio." },
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

const steps = ["Service", "Details", "Schedule", "Contact"];
const times = ["09:00 AM - 10:30 AM", "11:00 AM - 12:30 PM", "02:00 PM - 03:30 PM"];
const scopes = ["Single Room", "Multi-Room", "Full Property", "Commercial Space"];
const types = ["Renovation", "New Build", "Styling & Furnishing"];
const timelines = ["Immediate (1-3 months)", "Short Term (3-6 months)", "Long Term (6+ months)"];

function ConsultationPage() {
  const { data } = useSuspenseQuery(siteDataQuery);
  const submit = useServerFn(submitConsultation);

  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    service_interest: data.services[0]?.title ?? "Residential Design",
    location: "",
    project_scope: scopes[0]!,
    project_type: types[0]!,
    timeline: timelines[0]!,
    budget_range: "",
    message: "",
    preferred_date: "",
    preferred_time: times[0]!,
    property_address: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function confirm() {
    setSaving(true);
    try {
      await submit({
        data: {
          service_interest: form.service_interest,
          project_type: form.project_type,
          project_scope: form.project_scope,
          timeline: form.timeline,
          budget_range: form.budget_range || null,
          location: form.location || null,
          property_address: form.property_address || null,
          preferred_date: form.preferred_date || null,
          preferred_time: form.preferred_time,
          message: form.message || null,
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
  const label = "block font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant";
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
            <Link to="/" className={`mt-10 inline-block ${primaryBtn}`}>
              Return Home
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-16 lg:flex-row">
            <section className="lg:w-2/3 lg:pr-[80px]">
              <div className="mb-12 flex justify-between border-b border-outline-variant/30">
                {steps.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStep(i + 1)}
                    className={`w-1/4 pb-4 text-center font-label-caps text-label-caps uppercase tracking-widest transition-colors ${
                      step === i + 1
                        ? "border-b-2 border-primary text-primary"
                        : step > i + 1
                          ? "text-on-surface-variant"
                          : "text-outline"
                    }`}
                  >
                    0{i + 1}
                    <br />
                    {s}
                  </button>
                ))}
              </div>

              {step === 1 && (
                <div>
                  <h1 className="mb-8 font-headline-md text-headline-md text-primary">Select a Service</h1>
                  <div className="space-y-4">
                    {data.services.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => set("service_interest", s.title)}
                        className={`w-full border px-6 py-6 text-left transition-colors ${
                          form.service_interest === s.title
                            ? "border-primary bg-surface-container-low"
                            : "border-outline-variant/50 hover:border-primary"
                        }`}
                      >
                        <span className="font-headline-md text-[20px] text-primary">{s.title}</span>
                        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
                          {s.description}
                        </p>
                      </button>
                    ))}
                  </div>
                  <div className="mt-12 flex justify-end">
                    <button type="button" className={primaryBtn} onClick={() => setStep(2)}>
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h1 className="mb-4 font-headline-md text-headline-md text-primary">Project Details</h1>
                  <p className="mb-10 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
                    Help us understand the scope and aspirations for your space.
                  </p>
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <div>
                      <label className={label} htmlFor="location">Project Location</label>
                      <input id="location" className={field} value={form.location} onChange={(e) => set("location", e.target.value)} />
                    </div>
                    <div>
                      <label className={label} htmlFor="ptype">Project Type</label>
                      <select id="ptype" className={field} value={form.project_type} onChange={(e) => set("project_type", e.target.value)}>
                        {types.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={label} htmlFor="scope">Estimated Scope</label>
                      <select id="scope" className={field} value={form.project_scope} onChange={(e) => set("project_scope", e.target.value)}>
                        {scopes.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={label} htmlFor="timeline">Expected Timeline</label>
                      <select id="timeline" className={field} value={form.timeline} onChange={(e) => set("timeline", e.target.value)}>
                        {timelines.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className={label} htmlFor="budget">Estimated Budget (Optional)</label>
                      <input id="budget" className={field} value={form.budget_range} onChange={(e) => set("budget_range", e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={label} htmlFor="vision">Your Vision</label>
                      <textarea id="vision" rows={4} className={field} value={form.message} onChange={(e) => set("message", e.target.value)} />
                    </div>
                  </div>
                  <div className="mt-12 flex justify-between">
                    <button type="button" className={ghostBtn} onClick={() => setStep(1)}>Back</button>
                    <button type="button" className={primaryBtn} onClick={() => setStep(3)}>Continue to Schedule</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h1 className="mb-8 font-headline-md text-headline-md text-primary">Select a Time</h1>
                  <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
                    <div>
                      <label className={label} htmlFor="date">Preferred Date</label>
                      <input id="date" type="date" className={field} value={form.preferred_date} onChange={(e) => set("preferred_date", e.target.value)} />
                    </div>
                    <div>
                      <h3 className="mb-6 border-b border-outline-variant/40 pb-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                        Available Times
                      </h3>
                      <div className="space-y-4">
                        {times.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => set("preferred_time", t)}
                            className={`w-full border px-6 py-4 text-left font-body-md text-body-md text-primary transition-colors ${
                              form.preferred_time === t ? "border-primary bg-surface-container-low" : "border-outline-variant/50 hover:border-primary"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-12 flex justify-between">
                    <button type="button" className={ghostBtn} onClick={() => setStep(2)}>Back</button>
                    <button type="button" className={primaryBtn} onClick={() => setStep(4)}>Continue</button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h1 className="mb-4 font-headline-md text-headline-md text-primary">Your Information</h1>
                  <p className="mb-10 max-w-2xl font-body-md text-body-md text-on-surface-variant">
                    Please provide your details to confirm the consultation. Your information will be
                    kept strictly confidential.
                  </p>
                  <div className="max-w-xl space-y-8">
                    <div>
                      <label className={label} htmlFor="address">Property Address (Optional)</label>
                      <input id="address" className={field} value={form.property_address} onChange={(e) => set("property_address", e.target.value)} />
                    </div>
                  </div>
                  <div className="mt-12 flex justify-between">
                    <button type="button" className={ghostBtn} onClick={() => setStep(3)}>Back to Time</button>
                    <button type="button" className={primaryBtn} disabled={saving} onClick={confirm}>
                      {saving ? "Confirming…" : "Confirm Booking"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <aside className="lg:w-1/3">
              <div className="sticky top-32 border border-outline-variant/30 bg-surface-container-low p-8">
                <h3 className="mb-6 border-b border-outline-variant/30 pb-4 font-label-caps text-label-caps uppercase tracking-widest text-outline">
                  Consultation Summary
                </h3>
                <div className="space-y-6">
                  <div>
                    <p className="mb-1 font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
                      Selected Service
                    </p>
                    <p className="font-headline-md text-[20px] text-primary">{form.service_interest}</p>
                  </div>
                  <div className="h-[1px] w-full bg-outline-variant/30" />
                  <div>
                    <p className="mb-1 font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
                      Project Details
                    </p>
                    <p className="font-body-md text-body-md text-primary">
                      {form.project_type} · {form.project_scope}
                    </p>
                  </div>
                  <div className="h-[1px] w-full bg-outline-variant/30" />
                  <div>
                    <p className="mb-1 font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
                      Date &amp; Time
                    </p>
                    <p className="font-body-md text-body-md text-primary">
                      {form.preferred_date ? `${form.preferred_date} · ${form.preferred_time}` : "Pending Selection"}
                    </p>
                  </div>
                  <div className="pt-4">
                    <p className="font-body-md text-sm italic text-outline">
                      “A space should be a reflection of the life lived within it, curated with
                      intention and quiet grace.”
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
