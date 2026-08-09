# Styling Space — Interior Design Website + CMS

I pulled the Stitch project (Interior Design Business CMS, 14 desktop screens) and its design system ("Ethereal Dwelling"). The build follows those designs and tokens exactly.

## Design system (from Stitch)

- Palette: deep forest `#050d0b` / `#1a2421`, warm brass accent `#775a19` / `#fed488`, warm off-white surface `#fcf9f5`, layered neutrals, muted outlines.
- Type: Playfair Display for display/headlines (64/48/32px, light tracking), Inter for body and small caps labels.
- Spacing: 8px unit, 1440px container, 80px desktop margins, generous whitespace, thin-line editorial framing.
- Tone: hushed luxury, minimalist-editorial, imagery-forward, restrained ornamentation.

These become CSS tokens in `src/styles.css`; no hardcoded colors in components.

## Public site (7 screens)

1. **Home (Expanded Showcase)** — hero, featured project showcase, services teaser, CTA.
2. **Services** — service offerings detail.
3. **About** — studio story, philosophy, team.
4. **Book Consultation** — entry step of the booking flow.
5. **Consultation Schedule** — date/time selection.
6. **Consultation Contact** — client contact details.
7. **Consultation Details** — project brief + review/confirm submission.

Steps 4–7 form one multi-step booking flow, each on its own route, with state carried across steps and a single write on submit.

## Admin CMS (7 screens)

1. **Overview** — dashboard metrics and recent activity.
2. **Content Manager** — site content/pages listing and editing.
3. **Portfolio Editor** — projects CRUD with image uploads and gallery ordering.
4. **Book Consultation** — consultation requests list, status, detail view.
5. **Support** — support/inquiry messages.
6. **User Profile** — the signed-in admin's profile.
7. **Settings** — site and studio settings.

All admin routes sit behind an authenticated layout; only users with the `admin` role may enter.

## Backend (Lovable Cloud)

Tables: `profiles`, `user_roles` (separate roles table + `has_role()` security-definer function), `projects` (portfolio) + `project_images`, `services`, `site_content`, `consultations`, `support_messages`, `settings`. Public read policies for published portfolio/services/content; consultation and support inserts allowed from the public form; everything else admin-only. Storage bucket for portfolio imagery.

Auth: email/password + Google sign-in, admin gate via the roles table.

## Technical notes

- Stack is TanStack Start (React 19, Vite, Tailwind v4) — file-based routes under `src/routes`, `_authenticated/admin/*` for the CMS.
- Public pages read data via public server functions (SSR-safe); admin reads/writes go through authenticated server functions with RLS as the user.
- Each public route gets its own SEO metadata; admin routes are noindex.
- Screen HTML is pulled from Stitch per screen and ported to React components faithfully (layout, section order, component counts), with shared Header/Footer and an admin sidebar shell.
- Imagery: generated placeholder photography matching the Stitch art direction until real project photos are uploaded.

## Build order

1. Design tokens, fonts, shared layout shells.
2. Public pages (Home, Services, About).
3. Cloud backend: schema, RLS, storage, auth + admin role.
4. Booking flow (4 screens) writing to `consultations`.
5. Admin CMS (7 screens) wired to real data.
6. SEO, empty/loading/error states, responsive pass.
