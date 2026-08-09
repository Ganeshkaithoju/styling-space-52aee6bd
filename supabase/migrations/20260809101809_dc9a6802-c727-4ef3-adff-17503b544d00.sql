-- Roles -------------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  job_title TEXT,
  phone TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Timestamp helper ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Portfolio -----------------------------------------------------------------
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Residential',
  subtitle TEXT,
  description TEXT,
  cover_image_url TEXT,
  location TEXT,
  year TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published projects are public" ON public.projects
  FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Admins manage projects" ON public.projects
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.project_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX project_images_project_id_idx ON public.project_images(project_id);
GRANT SELECT ON public.project_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_images TO authenticated;
GRANT ALL ON public.project_images TO service_role;
ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Images of published projects are public" ON public.project_images
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.status = 'published')
  );
CREATE POLICY "Admins manage project images" ON public.project_images
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Services ------------------------------------------------------------------
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL DEFAULT '01',
  title TEXT NOT NULL,
  description TEXT,
  details TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published services are public" ON public.services
  FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Admins manage services" ON public.services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Site content --------------------------------------------------------------
CREATE TABLE public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT NOT NULL UNIQUE,
  page TEXT NOT NULL DEFAULT 'home',
  section TEXT,
  heading TEXT,
  body TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published content is public" ON public.site_content
  FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Admins manage content" ON public.site_content
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER site_content_updated_at BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Consultations -------------------------------------------------------------
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  project_type TEXT,
  service_interest TEXT,
  budget_range TEXT,
  property_address TEXT,
  preferred_date DATE,
  preferred_time TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.consultations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultations TO authenticated;
GRANT ALL ON public.consultations TO service_role;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can request a consultation" ON public.consultations
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins manage consultations" ON public.consultations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER consultations_updated_at BEFORE UPDATE ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Support -------------------------------------------------------------------
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.support_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can send a support message" ON public.support_messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins manage support messages" ON public.support_messages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER support_messages_updated_at BEFORE UPDATE ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Settings ------------------------------------------------------------------
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  label TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_public BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public settings are readable" ON public.settings
  FOR SELECT TO anon, authenticated USING (is_public = true);
CREATE POLICY "Admins manage settings" ON public.settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed ----------------------------------------------------------------------
INSERT INTO public.services (number, title, description, details, status, sort_order) VALUES
('01', 'Residential Design', 'Comprehensive interior architecture and curation for private residences, focusing on seamless flow and personal narrative.', 'Full-service design from spatial planning and joinery detailing through to styling and handover.', 'published', 1),
('02', 'Commercial Curation', 'Elevating boutique hospitality and retail environments through bespoke atmospheric design and precise material selection.', 'Concept development, FF&E specification and brand-aligned environments for hospitality and retail.', 'published', 2),
('03', 'Bespoke Materials', 'Sourcing rare textiles, custom stonework, and artisanal fixtures to create distinct, tactile experiences within every space.', 'Material libraries, artisan commissions and custom furniture design produced with trusted makers.', 'published', 3);

INSERT INTO public.projects (title, slug, category, subtitle, description, location, year, status, featured, sort_order) VALUES
('The Laurel Residence', 'the-laurel-residence', 'Residential', 'Residential • Complete Renovation', 'A full renovation balancing warm oak joinery with monolithic stone, composed around light and quiet proportion.', 'Hampstead, London', '2025', 'published', true, 1),
('Atelier Blanc', 'atelier-blanc', 'Commercial', 'Commercial • Curation', 'A boutique atelier curated around fluted plaster, sculptural seating and a restrained neutral palette.', 'Marylebone, London', '2025', 'published', true, 2),
('The Nordic Penthouse', 'the-nordic-penthouse', 'Residential', 'Residential • Interior Architecture', 'A study in light and texture within a minimalist urban frame.', 'Copenhagen', '2024', 'published', false, 3),
('Coastal Sanctuary', 'coastal-sanctuary', 'Residential', 'Residential • Full Service', 'Organic materials meeting the horizon in a seamless flow.', 'Cornwall', '2024', 'published', false, 4),
('Maison Verte', 'maison-verte', 'Commercial', 'Commercial • Hospitality', 'A quiet dining room where timber, linen and brass hold a hushed, considered atmosphere.', 'Paris', '2023', 'published', false, 5);

INSERT INTO public.site_content (content_key, page, section, heading, body, status) VALUES
('home_hero', 'home', 'Hero', 'Curated Spaces. Elevated Living.', 'Bespoke interior design for those who value the art of the home.', 'published'),
('home_philosophy', 'home', 'Philosophy', 'Studio Philosophy', 'We believe a home should be a sanctuary—a reflection of your journey and a canvas for your future.', 'published'),
('about_intro', 'about', 'Introduction', 'The Studio', 'Styling Space is an interior design studio working across private residences and boutique commercial environments, creating spaces of quiet confidence and lasting material integrity.', 'published'),
('services_intro', 'services', 'Introduction', 'Our Services', 'A considered, end-to-end practice spanning interior architecture, curation and bespoke commissions.', 'published'),
('contact_intro', 'contact', 'Contact', 'Begin a Conversation', 'Share a few details about your space and our studio will be in touch within two working days.', 'published');

INSERT INTO public.settings (setting_key, setting_value, label, category, is_public) VALUES
('studio_name', 'Styling Space Interior Designs', 'Studio name', 'general', true),
('studio_email', 'studio@stylingspace.com', 'Contact email', 'general', true),
('studio_phone', '+44 20 7946 0812', 'Contact phone', 'general', true),
('studio_address', '18 Chiltern Street, Marylebone, London W1U 7QA', 'Studio address', 'general', true),
('studio_hours', 'Monday – Friday, 9:00 – 18:00', 'Opening hours', 'general', true),
('instagram_url', 'https://instagram.com', 'Instagram', 'social', true),
('pinterest_url', 'https://pinterest.com', 'Pinterest', 'social', true),
('booking_notice', 'Consultations are confirmed within two working days.', 'Booking notice', 'booking', true);