import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Icon } from "@/components/Icon";
import { buttonClass, fieldClass, labelClass } from "@/components/admin/AdminShell";
import { createVerificationAttempt, checkVerificationStatus } from "@/lib/auth.functions";

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
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "reset" | "verify">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const isRecoveryFlow = useRef(
    typeof window !== "undefined" && window.location.hash.includes("type=recovery")
  );
  const opaqueToken = useRef<string | null>(null);

  // Cross-device email verification polling
  useEffect(() => {
    if (mode !== "verify" || !opaqueToken.current) return;

    let isChecking = false;
    const interval = setInterval(async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const result = await checkVerificationStatus({ data: { token: opaqueToken.current! } });
        
        if (result.confirmed) {
          clearInterval(interval);
          opaqueToken.current = null;
          
          // Attempt to refresh session in case it's recoverable (e.g. same-device edge cases)
          const { data: { session } } = await supabase.auth.refreshSession();
          
          if (!session) {
            // No safe laptop session. Switch to sign in. Email is already pre-filled.
            toast.success("Email confirmed.");
            setMode("signin");
          }
          // If session is valid, onAuthStateChange will naturally handle the SIGNED_IN redirect.
        } else if (result.expired) {
          clearInterval(interval);
          opaqueToken.current = null;
          toast.error("Verification timeout. Please sign in.");
          setMode("signin");
        }
      } catch (err) {
        console.error("Polling error:", err);
      } finally {
        isChecking = false;
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        isRecoveryFlow.current = true;
        setMode("reset");
      } else if (session && !isRecoveryFlow.current && mode !== "reset") {
        const params = new URLSearchParams(window.location.search);
        const redirectPath = params.get("redirect");

        // Sync profile for Google OAuth users to ensure the profile exists
        if (session.user.app_metadata?.provider === "google" || session.user.app_metadata?.providers?.includes("google")) {
          const meta = session.user.user_metadata;
          if (meta) {
            supabase.from("profiles").upsert({
              id: session.user.id,
              email: session.user.email,
              full_name: meta.full_name,
              avatar_url: meta.avatar_url,
              updated_at: new Date().toISOString()
            }).then(({ error }) => {
              if (error) console.error("Profile sync error:", error);
            });
          }
        }

        if (redirectPath) {
          navigate({ to: redirectPath, replace: true });
        } else {
          // Handle post-login redirect based on role
          supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" }).then((adminRes) => {
            supabase.rpc("has_role", { _user_id: session.user.id, _role: "owner" }).then((ownerRes) => {
              supabase.rpc("has_role", { _user_id: session.user.id, _role: "editor" }).then((editorRes) => {
                if (adminRes.data || ownerRes.data || editorRes.data) {
                  navigate({ to: "/admin", replace: true });
                } else {
                  navigate({ to: "/", replace: true });
                }
              });
            });
          });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + (new URLSearchParams(window.location.search).get("redirect") || "/"),
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (!data.session && data.user) {
          try {
            const attempt = await createVerificationAttempt({ data: { userId: data.user.id } });
            opaqueToken.current = attempt.token;
          } catch (err) {
            console.error("Failed to create verification attempt:", err);
          }
          setMode("verify");
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth",
        });
        if (error) throw error;
        toast.success("Password reset email sent.");
        setMode("signin");
      } else if (mode === "reset") {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated successfully.");
        
        setPassword("");
        setConfirmPassword("");
        isRecoveryFlow.current = false;
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const params = new URLSearchParams(window.location.search);
          const redirectPath = params.get("redirect");
          if (redirectPath) {
            navigate({ to: redirectPath, replace: true });
          } else {
            const [adminRes, ownerRes, editorRes] = await Promise.all([
              supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" }),
              supabase.rpc("has_role", { _user_id: session.user.id, _role: "owner" }),
              supabase.rpc("has_role", { _user_id: session.user.id, _role: "editor" })
            ]);
            if (adminRes.data || ownerRes.data || editorRes.data) {
              navigate({ to: "/admin", replace: true });
            } else {
              navigate({ to: "/", replace: true });
            }
          }
        } else {
          setMode("signin");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: window.location.origin + (new URLSearchParams(window.location.search).get("redirect") || "/"),
        }
      });
      if (error) throw error;
      toast.success("Verification email resent. Please check your inbox.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend email.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth" + (window.location.search || ""),
      }
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-margin-mobile py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 font-body-md text-[14px] text-on-surface-variant transition-colors hover:text-primary">
          <Icon name="arrow_back" className="text-[18px]" />
          Back to Homepage
        </Link>
        <Link to="/" className="block font-headline-md text-headline-md text-primary">
          Styling Space
        </Link>
        <p className="mt-2 font-label-caps text-label-caps uppercase tracking-widest text-secondary">
          {mode === "verify" ? "Account Verification" : "Studio CMS access"}
        </p>

        {mode === "verify" ? (
          <div className="mt-10 flex flex-col gap-5 text-center border border-outline-variant/50 p-8">
            <h2 className="font-headline-sm text-primary uppercase tracking-widest">Verify Your Email</h2>
            <p className="text-on-surface-variant font-body-md">
              We've sent a confirmation link to <span className="font-medium text-on-surface">{email}</span>
            </p>
            <p className="text-on-surface-variant font-body-md">
              Please check your inbox and click the confirmation link to activate your account.
            </p>
            <button 
              type="button" 
              onClick={resendVerification} 
              disabled={busy} 
              className={`${buttonClass} mt-4 bg-transparent border border-outline-variant text-on-surface hover:bg-surface-container`}
            >
              Resend Email
            </button>
          </div>
        ) : (
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
          {mode !== "reset" && (
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
          )}
          {mode !== "forgot" && (
            <div>
              <label className={labelClass} htmlFor="password">
                {mode === "reset" ? "New Password" : "Password"}
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
          )}
          {mode === "reset" && (
            <div>
              <label className={labelClass} htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={6}
                className={`${fieldClass} mt-2`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

            <button type="submit" disabled={busy} className={buttonClass}>
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Update password"}
            </button>
          </form>
        )}

        {mode !== "reset" && mode !== "verify" && (
          <button
            type="button"
            onClick={google}
            className="mt-4 flex w-full items-center justify-center gap-3 border border-outline-variant px-6 py-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-container"
          >
            <Icon name="account_circle" className="text-[18px]" />
            Continue with Google
          </button>
        )}

        {mode !== "reset" && mode !== "verify" && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-body-md text-[14px] text-on-surface-variant underline underline-offset-4"
            >
              {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
            {mode === "signin" && (
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="font-body-md text-[14px] text-on-surface-variant underline underline-offset-4"
              >
                Forgot your password?
              </button>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="font-body-md text-[14px] text-on-surface-variant underline underline-offset-4"
              >
                Back to sign in
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
