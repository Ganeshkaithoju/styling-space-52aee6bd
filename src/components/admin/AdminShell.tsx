import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/admin", label: "Overview", icon: "dashboard", exact: true },
  { to: "/admin/content", label: "Content Manager", icon: "article" },
  { to: "/admin/services", label: "Services", icon: "design_services" },
  { to: "/admin/portfolio", label: "Portfolio Editor", icon: "photo_library" },
  { to: "/admin/consultations", label: "Consultations", icon: "event_note" },
  { to: "/admin/support", label: "Support", icon: "support_agent" },
  { to: "/admin/users", label: "User Management", icon: "group" },
  { to: "/admin/audit", label: "Audit Logs", icon: "manage_search" },
  { to: "/admin/profile", label: "Profile", icon: "person" },
  { to: "/admin/settings", label: "Settings", icon: "settings" },
] as const;

export function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  return (
    <div className="flex min-h-screen bg-surface">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-outline-variant/40 bg-primary-container px-6 py-8 transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link to="/" className="font-headline-md text-[22px] text-inverse-on-surface">
          Styling Space
        </Link>
        <p className="mt-1 font-label-caps text-label-caps uppercase tracking-widest text-secondary-container/70">
          Studio CMS
        </p>

        <nav className="mt-10 flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 font-body-md text-[14px] transition-colors duration-200 ${
                isActive(item.to, "exact" in item ? item.exact : false)
                  ? "bg-secondary-container/15 text-secondary-container"
                  : "text-inverse-on-surface/70 hover:bg-inverse-on-surface/5 hover:text-inverse-on-surface"
              }`}
            >
              <Icon name={item.icon} className="text-[20px]" />
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={signOut}
          className="mt-6 flex items-center gap-3 border border-inverse-on-surface/20 px-4 py-3 font-label-caps text-label-caps uppercase tracking-widest text-inverse-on-surface/80 transition-colors hover:bg-inverse-on-surface/10"
        >
          <Icon name="logout" className="text-[18px]" />
          Sign out
        </button>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-tertiary/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex-1 lg:pl-72">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-outline-variant/40 px-6 py-8 md:px-12">
          <div className="flex items-start gap-4">
            <button
              type="button"
              aria-label="Open menu"
              className="text-primary lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Icon name="menu" className="text-[24px]" />
            </button>
            <div>
              <h1 className="font-headline-md text-headline-md text-primary">{title}</h1>
              {description && (
                <p className="mt-2 max-w-2xl font-body-md text-body-md text-on-surface-variant">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions}
        </header>
        <main className="px-6 py-10 md:px-12">{children}</main>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-block border border-outline-variant px-3 py-1 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
      {status.replace(/_/g, " ")}
    </span>
  );
}

export const fieldClass =
  "w-full border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-secondary";

export const labelClass =
  "block font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant";

export const buttonClass =
  "inline-flex items-center gap-2 bg-primary px-6 py-3 font-label-caps text-label-caps uppercase tracking-widest text-on-primary transition-colors hover:bg-secondary disabled:opacity-50";

export const ghostButtonClass =
  "inline-flex items-center gap-2 border border-outline-variant px-6 py-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-container";
