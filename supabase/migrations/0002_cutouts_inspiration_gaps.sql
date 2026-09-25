-- Richer garment metadata produced by the upgraded extraction pipeline.
ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS subcategory text NOT NULL DEFAULT '';
ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS secondary_color text NOT NULL DEFAULT '';
ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS fit text NOT NULL DEFAULT '';
ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS warmth text NOT NULL DEFAULT '';
ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT '';
ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS style_tags_json jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS details_json jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.wardrobe_items ADD COLUMN IF NOT EXISTS cutout boolean NOT NULL DEFAULT false;

ALTER TABLE public.outfits ADD COLUMN IF NOT EXISTS inspiration_note text NOT NULL DEFAULT '';

-- Style-inspiration profile (uploads and Pinterest boards).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS style_profile_json jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS style_profile_updated_at bigint;

CREATE TABLE IF NOT EXISTS public.inspiration_sources (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('upload', 'pinterest')),
  label text NOT NULL,
  url text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  synced_at bigint,
  created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS inspiration_sources_user_idx ON public.inspiration_sources(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.inspiration_pins (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.inspiration_sources(id) ON DELETE CASCADE,
  image_id uuid REFERENCES public.images(id) ON DELETE SET NULL,
  remote_image_url text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  signals_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS inspiration_pins_user_idx ON public.inspiration_pins(user_id, source_id);

-- Versatile wardrobe-gap and shopping recommendations.
CREATE TABLE IF NOT EXISTS public.shopping_suggestions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  gap text NOT NULL DEFAULT '',
  rationale text NOT NULL DEFAULT '',
  score integer NOT NULL DEFAULT 0,
  versatility_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  examples_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'owned', 'wishlist', 'purchased')),
  feedback text NOT NULL DEFAULT '',
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS shopping_suggestions_user_idx ON public.shopping_suggestions(user_id, status, created_at DESC);

ALTER TABLE public.inspiration_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspiration_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_suggestions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.inspiration_sources, public.inspiration_pins, public.shopping_suggestions FROM anon, authenticated;
