ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS project_scope text,
  ADD COLUMN IF NOT EXISTS timeline text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS assigned_designer text;