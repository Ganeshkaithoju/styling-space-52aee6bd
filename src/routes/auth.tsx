import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Icon } from "@/components/Icon";
import { buttonClass, fieldClass, labelClass } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Studio Sign In — Styling Space" },
      {
        name: "description",
        content: "Sign in to the Styling Space studio CMS to manage portfolio, content and client consultations.",
      },
      { property: "og:title", content: "Studio Sign In — Styling Space" },
      { property: "og:description", content: "Private access to the Styling Space studio content management system." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/admin",
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/admin", replace: true });
        else toast.success("Check your email to confirm your account.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth",
      }
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-margin-mobile py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="font-headline-md text-headline-md text-primary">
          Styling Space
        </Link>
        <p className="mt-2 font-label-caps text-label-caps uppercase tracking-widest text-secondary">
          Studio CMS access
        </p>

        <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-5">
          {mode === "signup" && (
            <div>
              <label className={labelClass} htmlFor="fullName">
                Full name
              </label>
              <input
                id="fullName"
                className={`${fieldClass} mt-2`}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={160}
              />
            </div>
          )}
          <div>
            <label className={labelClass} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className={`${fieldClass} mt-2`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={200}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              className={`${fieldClass} mt-2`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={busy} className={buttonClass}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={google}
          className="mt-4 flex w-full items-center justify-center gap-3 border border-outline-variant px-6 py-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-container"
        >
          <Icon name="account_circle" className="text-[18px]" />
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 font-body-md text-[14px] text-on-surface-variant underline underline-offset-4"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
