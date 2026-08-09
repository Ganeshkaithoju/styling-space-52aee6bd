CREATE POLICY "Admins read portfolio files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'portfolio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins upload portfolio files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portfolio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update portfolio files" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'portfolio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete portfolio files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'portfolio' AND public.has_role(auth.uid(), 'admin'));