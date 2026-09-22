# Closet AI — Production MVP

A desktop-first AI wardrobe and personal styling app built from the supplied design handoff. A user can upload any closet photo, review every detected garment/accessory, manage a private wardrobe, receive three complete weather-aware outfits made only from owned pieces, save approved looks, and generate a full-body virtual try-on.

## One required secret

Create `.env.local` in this folder:

```bash
cp .env.example .env.local
```

Then add your key without quotes:

```dotenv
OPENAI_API_KEY=your_key_here
```

Never paste the key into the UI or commit `.env.local`. It is read only by server routes.

## Run locally

Use Node 24 (the repo includes `.nvmrc`):

```bash
nvm use
npm install
npm run dev
```

Open `http://127.0.0.1:4173` and create an account. The only required external credential is `OPENAI_API_KEY`; weather uses Open-Meteo without an API key.

## What is implemented

- Real account creation and sign-in with scrypt password hashing
- Opaque, expiring sessions in Secure/HttpOnly/SameSite cookies
- SQLite persistence for accounts, sessions, wardrobe metadata, saved outfits, feedback, and rate limits
- Private per-user image storage served only through authenticated routes
- JPG/PNG/WEBP validation, pixel limits, EXIF stripping, normalization, and 20MB upload limits
- OpenAI vision extraction of every visible garment and accessory, including category, color, material, pattern, formality, season, confidence, and bounding box
- Multiple detected items from one photo, cropped into separate wardrobe images
- Review, correction, duplicate warning, filtering, editing, availability, favorites, and deletion
- Exactly three ranked, complete outfit recommendations using owned, available item IDs only
- Personal-style, live-weather, city/optional browser location, occasion, constraint, saved-look, and wear-history context
- Refinement, item replacement, closest-owned-alternative notes, and optional shopping suggestions
- Saved outfit library and wear tracking
- OpenAI image-edit virtual try-on using a temporary full-body photo and the actual selected wardrobe pieces
- Same-origin mutation checks, owner-scoped queries, input schemas, rate limits, private cache headers, and cascade deletion
- Account deletion removes database records and all locally stored user images

Original upload photos are decoded and normalized in memory; they are not written to Closet AI storage. Only extracted item crops that the user approves are kept. A virtual try-on source photo is also not stored by Closet AI; the generated result is stored privately so it can be displayed.

## Configuration

Defaults are already present in `.env.example`:

```dotenv
OPENAI_VISION_MODEL=gpt-5.6-terra
OPENAI_IMAGE_MODEL=gpt-image-2.5-flare
OPENAI_ENABLE_WEB_SEARCH=true
CLOSET_DATA_DIR=./data
```

Model names are configurable so you can change cost/quality without changing code. Your OpenAI API project must have billing and access enabled for the chosen text/vision and image models.

## Production deployment

This version intentionally needs no database or storage credentials: it runs as a single Node service with SQLite and private on-disk files. Deploy the included Docker image to a host with a persistent volume mounted at `/app/data` (for example Railway, Render, Fly.io, or a VPS), and set `OPENAI_API_KEY` as a secret in that host. Put the service behind HTTPS.

```bash
docker build -t closet-ai .
docker run --env-file .env.local -p 4173:4173 -v closet-ai-data:/app/data closet-ai
```

Health check: `GET /api/health`.

Do not deploy this disk-backed version to an ephemeral serverless filesystem. For multiple application replicas, migrate the database adapter to managed Postgres and the storage adapter to private S3-compatible object storage; the UI and OpenAI workflows can remain unchanged.

## Verification

```bash
npm run build
```

The production build includes all application and API routes. AI calls require a valid key, but authentication, sessions, persistence, and owner isolation can be exercised without one.
