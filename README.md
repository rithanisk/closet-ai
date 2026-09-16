# Closet AI MVP

A desktop-first Next.js MVP recreated from the supplied Closet AI design handoff.

## Stack

- Next.js 16 App Router
- React 19
- Lucide icons
- Browser local storage for prototype persistence

## Run locally

```bash
npm install
npm run dev
```

Then open `http://127.0.0.1:4173`.

## Included flows

- Sign in and account creation with style onboarding
- Populated and empty-aware home dashboard
- Real local image selection, progress pipeline, and detection review
- Editable, searchable, filterable wardrobe stored in browser local storage
- Conversational stylist with clarification, ranked outfit results, refinement, and item replacement
- Saved outfits and wear tracking
- Account, style, location, and privacy settings
- Toasts, confirmations, loading, empty, and error-aware states

## MVP service boundary

This repository implements the complete client experience inside a Next.js App Router application. Garment segmentation, semantic attribute extraction, authentication, live weather, and generative styling are represented by deterministic local adapters so the product can be tested without credentials. Replace those adapters with route handlers or external production services while preserving the UI contracts.

Uploaded images are processed locally in the browser for this prototype. They are never sent to a server. Approved previews can be stored in browser local storage; production should instead store true segmented cutouts and delete originals according to the PRD.
