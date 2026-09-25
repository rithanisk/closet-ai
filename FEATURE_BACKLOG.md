# Closet AI Feature Backlog

This file tracks post-MVP product ideas and their implementation status.

## Pinterest and style-inspiration profile

**Status:** Implemented (first version)  
**Priority:** Post-MVP

### What shipped

- Inspiration screen with image upload (up to 12 per batch) and public Pinterest board import via the board RSS feed.
- Per-image signal extraction and an aggregated, editable profile. Manual edits persist through rebuilds, with an option to discard them.
- Sources can be paused, refreshed (boards), or removed. Individual images can be removed. All inspiration data can be deleted at once.
- The profile is a soft preference in outfit generation, and outfits explain the connection when there is one.

### Still open

- Pinterest OAuth for private boards and periodic background sync.

### User need

Users should be able to teach Closet AI their personal aesthetic using visual references, rather than relying only on written descriptions and saved outfits.

### Potential scope

- Let a user connect one or more Pinterest boards, subject to Pinterest API access and permissions.
- Also support uploading individual inspiration images so the feature does not depend entirely on Pinterest.
- Analyze recurring style signals such as silhouettes, color palettes, layering, patterns, materials, proportions, accessories, and overall aesthetic.
- Create a private, editable style profile from those signals.
- Use the profile as a soft preference when ranking outfits made from the user's owned wardrobe.
- Explain relevant connections, for example: “This layered neutral look reflects the outfits in your inspiration board.”
- Let users refresh, disconnect, or remove inspiration sources and delete the resulting style data.
- Never copy a pinned outfit exactly or claim the user owns an item merely because it appears in an inspiration image.

### Future product decisions

- Pinterest OAuth/API feasibility, permissions, rate limits, and commercial-use terms.
- Whether boards are imported once or periodically synchronized.
- How users choose which boards or pins influence their profile.
- How strongly inspiration should affect recommendations compared with explicit constraints, weather, occasion, and prior outfit approvals.
- Data-retention and consent rules for third-party images and inferred style attributes.

### Success criteria

- A user can provide visual inspiration with or without Pinterest.
- The user can review and correct the inferred style profile.
- Recommendations visibly become more aligned with the supplied inspiration while still using owned items and satisfying practical constraints.

---

## Versatile wardrobe-gap and shopping recommendations

**Status:** Implemented (first version)  
**Priority:** Post-MVP

### What shipped

- Wardrobe gaps screen (from Wardrobe and Home) with up to three user-initiated suggestions, each clearly labelled as unowned.
- Deterministic versatility scoring, owned-pairing counts, estimated looks, occasions, and at least two example outfits built from owned items.
- Duplicate guardrail, wishlist, already-owned, purchased, and dismiss-with-reason feedback that shapes later analyses.

### Still open

- Measuring acceptance rates and using them to tune the scoring weights.

### User need

When recommending something to buy, Closet AI should prioritize pieces that work across many existing outfits, not novelty items with only one obvious use.

### Potential scope

- Analyze the wardrobe for gaps and identify pieces that unlock the greatest number of complete, wearable combinations.
- Score suggestions for versatility using factors such as:
  - Number of owned items they coordinate with
  - Number of distinct complete outfits they enable
  - Variety of occasions, seasons, and styling roles supported
  - Layering potential
  - Compatibility with the user's style profile and preferred colors
  - Whether the recommendation duplicates something already owned
- Show several concrete ways to use each suggested piece with items already in the wardrobe.
- Explain why the purchase is useful, for example: “A fitted white tank works under your two cardigans, with three pairs of jeans, and as a base layer for four saved looks.”
- Prefer durable wardrobe staples when they solve a real gap, while still allowing trend-led suggestions when they have broad utility.
- Keep shopping suggestions separate from owned-item outfit results and clearly label them as unowned.
- Let users dismiss a suggestion, mark it as already owned, or save it to a wishlist.

### Guardrails

- Do not recommend buying an item when the wardrobe already contains a close functional alternative.
- Do not optimize only for the raw number of combinations; the combinations must be stylistically coherent and realistic.
- Avoid excessive or repetitive purchase prompts.
- Do not allow affiliate incentives or retailer relationships to override wardrobe utility and user fit.

### Success criteria

- Every suggested purchase includes multiple example outfits using owned pieces.
- The app explains the wardrobe gap and the number or range of looks the item would unlock.
- Recommendations favor repeat wear across different contexts over one-time styling.
- User feedback on accepted, dismissed, and purchased suggestions improves future recommendations.

## Relationship to the current PRD

These ideas extend the existing inspiration-image onboarding and shopping-suggestion concepts in `PRD.md`. Both now have a first implementation. Open follow-ups are listed under each item.
