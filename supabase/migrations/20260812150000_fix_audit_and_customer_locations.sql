-- 1. Fix audit_logs schema to ensure actor_email exists in case it was missed
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_email TEXT;

-- 2. Create customer_locations table
CREATE TABLE IF NOT EXISTS public.customer_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.customer_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Customer can SELECT their own location
CREATE POLICY "Customers can view own location" ON public.customer_locations
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Policy: Customer can INSERT their own location
CREATE POLICY "Customers can insert own location" ON public.customer_locations
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Policy: Customer can UPDATE their own location
CREATE POLICY "Customers can update own location" ON public.customer_locations
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- Policy: Admins and Owners can SELECT all locations
CREATE POLICY "Admins and owners can view all customer locations" ON public.customer_locations
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'owner')
    );

-- Add updated_at trigger for customer_locations
CREATE OR REPLACE FUNCTION public.handle_customer_location_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_customer_locations_updated_at ON public.customer_locations;
CREATE TRIGGER set_customer_locations_updated_at
    BEFORE UPDATE ON public.customer_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_customer_location_updated_at();

-- Force postgrest schema reload to fix PGRST204 errors
NOTIFY pgrst, 'reload schema';
