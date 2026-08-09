import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Icon } from "@/components/Icon";

const links = [
  { to: "/portfolio", label: "Portfolio" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

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

        <Link
          to="/consultation"
          className="hidden bg-primary px-6 py-3 font-label-caps text-label-caps uppercase tracking-widest text-on-primary transition-colors duration-300 hover:bg-secondary md:inline-block"
        >
          Book Consultation
        </Link>

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
