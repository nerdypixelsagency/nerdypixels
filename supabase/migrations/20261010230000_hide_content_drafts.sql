-- Supabase gives anon table-wide SELECT by default; narrow it so only published content is public.
REVOKE SELECT ON public.site_content FROM anon;
GRANT SELECT (key, published, published_at) ON public.site_content TO anon;
