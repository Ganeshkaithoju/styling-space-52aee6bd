-- Enable authenticated users to update their own consultations
CREATE POLICY "Users can update their own consultations"
  ON public.consultations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable authenticated users to delete their own consultations
CREATE POLICY "Users can delete their own consultations"
  ON public.consultations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
