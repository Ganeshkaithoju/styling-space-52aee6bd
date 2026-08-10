ALTER TABLE public.consultations ADD COLUMN user_id UUID REFERENCES auth.users(id);

DROP POLICY IF EXISTS "Anyone can request a consultation" ON public.consultations;

CREATE POLICY "Users can view their own consultations"
  ON public.consultations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can request a consultation"
  ON public.consultations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
