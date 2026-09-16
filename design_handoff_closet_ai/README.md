# Handoff: Closet AI MVP — Upload → Detection Review → Wardrobe → Stylist → Outfit Results

## Overview
Desktop MVP for an AI wardrobe & personal stylist app: users upload photos of clothes, review/correct AI-detected garments, browse a wardrobe grid, chat with a conversational stylist, and get ranked outfit recommendations they can save.

## About the Design Files
The bundled file (`Closet AI.dc.html`) is a **design reference prototype built in HTML/React** — it shows intended layout, states, copy, and interactions. It is not production code to copy directly. The task is to **recreate this design in your app's existing environment** (React, Vue, native, etc.) using your established component patterns, data layer, and libraries — or choose the most appropriate stack if none exists yet.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and copy are final-intent. Garment imagery is represented with colored striped placeholder swatches (mono-labeled) standing in for real photo cutouts — replace with actual detected/cropped garment images in production.

## Design Tokens
- **Colors:** background `#FAF8F5`, ink/black `#141414`, borders `#E4DFD6`, muted text `#6B6560`, faint text `#A79E8E`, warning bg `#FFF7EC` / warning text `#6B5A32` / warning border `#E9D9B8`, error/danger `#a94b2d`, accent palette (garment tints): coral `#C65D3B`, olive `#6B7A4F`, denim `#3E5C76`, mustard `#C9A227`, clay `#B08968`.
- **Typography:** Display serif "Bodoni Moda" (headlines, item titles) — weight 600, tight letter-spacing. Interface sans "Work Sans" (everything else), weights 400–600. Small caps labels: 11–12px, letter-spacing .08–.16em, uppercase, color `#A79E8E`/`#6B6560`.
- **Radius:** 2px throughout (sharp, editorial — not rounded-card style).
- **Borders:** 1px solid `#E4DFD6` default; 1.5px dashed for empty/drop states.
- **Spacing scale:** 8/12/16/20/24/28/32/44/56px.

## Screens / Views

### 1. Welcome / Auth
Split screen: left panel black (`#141414`) with large serif headline, two overlapping striped color blobs (coral/olive) as graphic accent, tagline, and a privacy note pinned to bottom. Right panel: sign-in/create-account tabs, email/password fields (name field appears only in sign-up), forgot-password link, primary CTA button, privacy disclaimer text below.

### 2. Home
Header greeting + serif "Good afternoon" headline + subline. Toggle button previews empty vs. populated states (for demo only — remove in production).
- **Empty state:** centered card, circular icon, serif heading "Your wardrobe is empty", body copy, single CTA "Upload your first photos".
- **Populated state:** black prompt card ("What are you dressing for?" input + "Ask the stylist" CTA) next to a weather/location card. Below: wardrobe summary card (category chip counts + "View all" link) next to an "Add more" nudge card. "Recently added" item row (4 cards). "Recently saved outfits" row or empty dashed placeholder.

### 3. Upload
Serif heading + description. **Empty:** large dashed drop zone, click-to-browse copy. **With files:** list of file rows, each with thumbnail tint, filename, status label (Uploading… / Detecting items… / Preparing cutouts… / Failed / Ready for review / No garments detected), animated progress bar, Retry button (only on failure) or Cancel (×). Helper text: "You can leave this screen — processing continues in the background." Footer actions: "+ Add more photos" and "Continue to review" (disabled until ≥1 file ready).

### 4. Detection Review
Serif heading + per-batch context line + "Confirm all high-confidence" button. Inline warning banner for photos with zero detections (dismissible). Grid of detection cards (3 cols): checkbox "Include" + remove (×), placeholder garment swatch, low-confidence/duplicate flag (⚠ amber text), editable name/category-select/color fields, "Adjust extraction boundary" button opening a crop modal (drag-corner placeholder). Sticky footer: "{n} of {total} selected" + primary CTA "Add confirmed items to wardrobe" (disabled at 0 selected).

### 5. Wardrobe
Serif heading + count + "+ Upload photos" CTA. Filter row: search input, category/color/availability/sort selects, "Clear filters" link (shown only when filters active). Grid (4 cols) of item cards: swatch, favorite heart (if favorited), name, category · color, "Unavailable" tag in red if applicable. Two empty states: no items at all (CTA to upload) vs. filtered-to-zero (CTA to clear filters). Clicking a card opens a right-side detail drawer: swatch, favorite toggle, editable name/color/formality/notes fields, read-only category/season, "available to wear" checkbox, Save changes / Use in outfit / Archive / Delete (delete triggers a confirm modal).

### 6. Stylist (conversational)
Two-column: chat column (left, flexible) + context sidebar (right, 300px fixed). Chat column stages: **empty** (suggested occasion chips + free-text input), **follow-up** (assistant asks a clarifying question, e.g. location; user answers via input), **loading** (pulsing dot + status line describing what's happening), **results** (3 outfit cards in a row: 4-swatch preview strip, serif title, blurb, "View details" + "Approve" buttons; "Regenerate all" link above). Refine input at the bottom during results for free-text tweaks. Sidebar shows resolved location/weather (or "awaiting location" placeholder), constraint chips extracted from conversation, and the same suggested-prompt list.

**Outfit detail modal:** large modal, item grid with "Replace" links per item, optional compromise note (amber box, e.g. substituted item) and dismissible "not in your wardrobe" shopping suggestion box. Right side: Why it works / Occasion fit / Weather fit / Styling notes copy blocks, 2×2 quick-refine buttons (More casual / More formal / Warmer / Try another color), "Regenerate this outfit" and "Approve & save" buttons.

### 7. Saved Outfits
Grid of saved outfit cards (preview strip, title, saved/worn label, "Mark worn" + "Remove" actions) or empty state with CTA back to Stylist.

### 8. Settings
Stacked cards: Account (name/email fields), Style profile (selected aesthetic chips), Location & weather (address input + precise-location toggle), Data & privacy (explains original-photo deletion policy; includes a demo-only "preview offline banner" link), Delete account (danger button → confirm modal).

## Interactions & Behavior
- Left nav (Home / Wardrobe / Stylist / Saved outfits / Settings) is persistent; active item filled black.
- Toast notifications (bottom-right, dark pill, 2.6s auto-dismiss) confirm actions: items added, item deleted/archived, outfit saved, etc.
- All destructive actions (delete item, delete account) route through a shared confirm modal with Cancel / red confirm button.
- Upload → per-file simulated pipeline: waiting → uploading → detecting → preparing cutouts → terminal state (ready for review / failed / no garments detected), driving progress bar width and status label.
- Stylist flow: user message → assistant follow-up question → loading (weather/wardrobe matching copy) → 3 ranked outfit results; "Regenerate all" reverses/reranks; approving an outfit adds it to Saved Outfits and flips its button to "Saved ✓".

## State Management
Key state: auth mode, current screen, wardrobe array (items with category/color/accent/favorite/available/formality/season/notes), upload file queue (status/progress), detection batch (selected/removed/confidence/duplicate flags), wardrobe filters (search/category/color/availability/sort), open item-detail id + edit form, chat message log + stylist stage (empty/followup/loading/results), resolved context (location/weather/constraints), outfits array, open outfit-detail id, saved outfits array, generic confirm-modal payload, toast message.

## Assets
No external images — garment items are represented as striped color-tint placeholders with monospace mono-labels (category + name). Replace with real detected garment cutout images in production. Fonts loaded from Google Fonts: Bodoni Moda, Work Sans.

## Files
- `Closet AI.dc.html` — full prototype (all screens/states in one file, React-based component with inline styles).
