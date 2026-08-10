import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Icon } from "@/components/Icon";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const links = [
  { to: "/portfolio", label: "Portfolio" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "User";
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-outline-variant/30 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-container-max items-center justify-between px-margin-mobile md:px-margin-desktop">
        <Link to="/" className="font-headline-md text-[22px] tracking-tight text-primary md:text-headline-md">
          Styling Space
        </Link>

        <div className="hidden items-center gap-gutter md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant transition-colors duration-300 hover:text-secondary"
              activeProps={{ className: "text-primary" }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-6 md:flex">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 font-label-caps text-label-caps uppercase tracking-widest text-primary hover:text-secondary"
              >
                Hi, {firstName} <Icon name="arrow_drop_down" className="text-[20px]" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-4 w-48 border border-outline-variant/30 bg-surface shadow-lg">
                  <div className="flex flex-col py-2">
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface hover:bg-surface-container"
                    >
                      My Dashboard
                    </Link>
                    <Link
                      to="/dashboard"
                      search={{ tab: "consultations" }}
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface hover:bg-surface-container"
                    >
                      My Consultations
                    </Link>
                    <Link
                      to="/dashboard"
                      search={{ tab: "profile" }}
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface hover:bg-surface-container"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="px-4 py-3 text-left font-label-caps text-label-caps uppercase tracking-widest text-on-surface hover:bg-surface-container"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className="font-label-caps text-label-caps uppercase tracking-widest text-primary hover:text-secondary"
            >
              Login
            </Link>
          )}
          <Link
            to="/consultation"
            className="bg-primary px-6 py-3 font-label-caps text-label-caps uppercase tracking-widest text-on-primary transition-colors duration-300 hover:bg-secondary"
          >
            Book Consultation
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          className="text-primary md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "close" : "menu"} className="text-[24px]" />
        </button>
      </div>

      {open && (
        <div className="border-t border-outline-variant/30 bg-surface px-margin-mobile py-6 md:hidden">
          <div className="flex flex-col gap-5">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant"
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="font-label-caps text-label-caps uppercase tracking-widest text-primary"
                >
                  My Dashboard
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }}
                  className="text-left font-label-caps text-label-caps uppercase tracking-widest text-primary"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="font-label-caps text-label-caps uppercase tracking-widest text-primary"
              >
                Login
              </Link>
            )}
            <Link
              to="/consultation"
              onClick={() => setOpen(false)}
              className="bg-primary px-6 py-3 text-center font-label-caps text-label-caps uppercase tracking-widest text-on-primary"
            >
              Book Consultation
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
