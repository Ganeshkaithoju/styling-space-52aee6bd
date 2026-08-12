-- Add property location fields to consultations table
ALTER TABLE public.consultations 
ADD COLUMN IF NOT EXISTS property_lat NUMERIC,
ADD COLUMN IF NOT EXISTS property_lng NUMERIC,
ADD COLUMN IF NOT EXISTS property_place_id TEXT,
ADD COLUMN IF NOT EXISTS property_formatted_address TEXT;
