-- Photoreal avatar ("twin") built from the user's own photos, plus cached try-on renders.
CREATE TABLE IF NOT EXISTS public.avatars (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'failed')),
  source_image_ids_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  front_image_id uuid REFERENCES public.images(id) ON DELETE SET NULL,
  side_image_id uuid REFERENCES public.images(id) ON DELETE SET NULL,
  back_image_id uuid REFERENCES public.images(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  version bigint NOT NULL,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.try_ons (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  avatar_version bigint NOT NULL,
  view text NOT NULL CHECK (view IN ('front', 'side', 'back')),
  items_key text NOT NULL,
  item_ids_json jsonb NOT NULL,
  image_id uuid REFERENCES public.images(id) ON DELETE CASCADE,
  created_at bigint NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS try_ons_cache_unique ON public.try_ons(user_id, avatar_version, view, items_key);
CREATE INDEX IF NOT EXISTS try_ons_user_idx ON public.try_ons(user_id, created_at DESC);

ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.try_ons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.avatars, public.try_ons FROM anon, authenticated;
