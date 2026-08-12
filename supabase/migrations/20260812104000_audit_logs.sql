-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_name TEXT,
    actor_email TEXT,
    actor_role public.app_role NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    description TEXT,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB
);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow admins and owners to SELECT
CREATE POLICY "Admins and owners can view audit logs" ON public.audit_logs
    FOR SELECT
    USING (
        public.has_role(auth.uid(), 'admin'::public.app_role) OR 
        public.has_role(auth.uid(), 'owner'::public.app_role)
    );

-- Note: No INSERT policy is provided for public access. 
-- The server uses service_role key to bypass RLS and insert logs securely.
