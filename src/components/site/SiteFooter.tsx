import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-outline-variant/20 bg-surface-container-low py-20">
      <div className="mx-auto grid max-w-container-max grid-cols-1 gap-gutter px-margin-mobile md:grid-cols-3 md:px-margin-desktop">
        <div>
          <Link to="/" className="font-headline-md text-headline-md text-primary">
            Styling Space
          </Link>
          <p className="mt-4 max-w-xs font-body-md text-body-md text-on-surface-variant">
            Architecting serene, bespoke environments for the discerning individual.
          </p>
        </div>

        <div className="flex flex-col gap-4 font-body-md text-body-md">
          <Link
            to="/portfolio"
            className="text-on-surface-variant underline-offset-4 hover:text-secondary hover:underline"
          >
            Portfolio
          </Link>
          <Link
            to="/services"
            className="text-on-surface-variant underline-offset-4 hover:text-secondary hover:underline"
          >
            Services
          </Link>
          <Link
            to="/about"
            className="text-on-surface-variant underline-offset-4 hover:text-secondary hover:underline"
          >
            About
          </Link>
          <Link
            to="/consultation"
            className="text-on-surface-variant underline-offset-4 hover:text-secondary hover:underline"
          >
            Book Consultation
          </Link>
        </div>

        <div className="flex flex-col gap-4 font-body-md text-body-md md:text-right">
          <p className="text-on-surface">
            © {new Date().getFullYear()} Styling Space Interior Designs. All rights reserved.
          </p>
          <Link
            to="/auth"
            className="text-on-surface-variant underline-offset-4 hover:text-secondary hover:underline"
          >
            Studio Login
          </Link>
        </div>
      </div>
    </footer>
  );
}
