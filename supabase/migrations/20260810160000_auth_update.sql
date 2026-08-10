-- Add 'owner' to app_role enum if it does not exist
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';

-- Update profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Create audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    previous_role TEXT,
    new_role TEXT,
    ip_address TEXT
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and owners can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Rewrite trigger to insert user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Atomic transfer function
CREATE OR REPLACE FUNCTION public.transfer_ownership(new_owner_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_owner_id UUID;
BEGIN
  -- Verify caller is owner
  IF NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;

  -- Ensure target is an admin
  IF NOT public.has_role(new_owner_id, 'admin') THEN
    RAISE EXCEPTION 'Target user must be an administrator';
  END IF;

  current_owner_id := auth.uid();

  -- Swap roles
  UPDATE public.user_roles SET role = 'admin' WHERE user_id = current_owner_id AND role = 'owner';
  UPDATE public.user_roles SET role = 'owner' WHERE user_id = new_owner_id AND role = 'admin';

  -- Enforce single owner constraint (sanity check)
  IF (SELECT count(*) FROM public.user_roles WHERE role = 'owner') != 1 THEN
    RAISE EXCEPTION 'Ownership transfer resulted in invalid owner count';
  END IF;
END;
$$;

-- Rewrite RLS policies to explicitly check for owner and admin
-- profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- projects
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
CREATE POLICY "Admins and owners can manage projects" ON public.projects
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- project_images
DROP POLICY IF EXISTS "Admins can manage project images" ON public.project_images;
CREATE POLICY "Admins and owners can manage project images" ON public.project_images
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- services
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Admins and owners can manage services" ON public.services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- site_content
DROP POLICY IF EXISTS "Admins can manage site content" ON public.site_content;
CREATE POLICY "Admins and owners can manage site content" ON public.site_content
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- consultations
DROP POLICY IF EXISTS "Admins can manage consultations" ON public.consultations;
CREATE POLICY "Admins and owners can manage consultations" ON public.consultations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- support_messages
DROP POLICY IF EXISTS "Admins can manage support messages" ON public.support_messages;
CREATE POLICY "Admins and owners can manage support messages" ON public.support_messages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- settings
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins and owners can manage settings" ON public.settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- storage (portfolio)
DROP POLICY IF EXISTS "Admins can manage portfolio images" ON storage.objects;
CREATE POLICY "Admins and owners can insert portfolio images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portfolio' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')));
CREATE POLICY "Admins and owners can update portfolio images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'portfolio' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')));
CREATE POLICY "Admins and owners can delete portfolio images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'portfolio' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')));
