# Closet AI — Production MVP

A desktop-first AI wardrobe and personal styling app. Users can upload closet photos, review detected garments, manage a private wardrobe, receive three complete weather-aware outfits made only from owned pieces, save approved looks, and generate virtual try-ons.

## Required environment variables

Copy the template and fill in `.env.local`:

```bash
cp .env.example .env.local
```

```dotenv
OPENAI_API_KEY=
OPENAI_VISION_MODEL=gpt-5.6-terra
OPENAI_IMAGE_MODEL=gpt-image-2.5-flare
OPENAI_ENABLE_WEB_SEARCH=true

DATABASE_URL=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SUPABASE_STORAGE_BUCKET=closet-images
```

`DATABASE_URL` is used only by the optional command-line migration script. The running application uses Supabase's HTTPS Data API, so local auth and normal app traffic do not depend on an open Postgres port. For migrations, use Supabase Dashboard → **Connect → Session pooler**, or run the SQL file directly in Supabase SQL Editor.

`SUPABASE_SECRET_KEY` must be the server-only `sb_secret_…` key. Never use a `NEXT_PUBLIC_` prefix for it and never commit `.env.local`.

## Initialize Supabase

Run the idempotent migration once for each Supabase project:

```bash
npm run db:migrate
```

It creates the application tables, indexes, foreign keys, rate-limit store, and a private Storage bucket. Application tables have RLS enabled and browser-facing `anon`/`authenticated` access revoked because all authorization is enforced in server routes.

## Run locally

Use Node 24:

```bash
nvm use
npm install
npm run db:migrate
npm run dev
```

Open `http://127.0.0.1:4173`.

## Architecture

- Next.js 16 App Router and React 19
- Supabase Postgres for users, password hashes, sessions, wardrobe metadata, saved outfits, feedback, and rate limits
- Private Supabase Storage bucket for extracted wardrobe crops and generated try-ons
- Server-side Supabase HTTPS Data API; credentials never reach browser JavaScript
- Authenticated `/api/assets/:id` proxy verifies ownership before downloading a private object
- OpenAI Responses API for multi-garment vision extraction and structured outfit generation
- OpenAI image editing for virtual try-on
- Open-Meteo for weather without another credential

The app retains its existing custom account system: passwords are scrypt-hashed and opaque sessions are stored in Secure/HttpOnly/SameSite cookies. Supabase is used as the production database and private object store, not as a second overlapping browser-auth system.

## Privacy and security behavior

- Original upload photos are normalized in memory and never written to application or Supabase storage.
- Only extracted item crops approved by the user are retained.
- Virtual try-on source photos are not retained; only the generated result is stored privately.
- Every database query and image fetch is scoped to the authenticated user ID.
- Mutations use same-origin checks and Zod validation.
- Account deletion removes private Storage objects before cascading database deletion.
- API rate limits persist in Postgres across app restarts.

## Production deployment

Set the same environment variables in your hosting provider, run the migration during deployment, and put the app behind HTTPS. Because data and images now live in Supabase, the app no longer needs a persistent local filesystem and can run on a container or serverless Node host. Ensure the host’s function duration supports OpenAI vision and image generation requests.

The included Docker image no longer mounts a data volume:

```bash
docker build -t closet-ai .
docker run --env-file .env.local -p 4173:4173 closet-ai
```

Health check: `GET /api/health`.

## Verification

```bash
npm run build
```

The production build does not expose Supabase or OpenAI secrets to the client bundle.
