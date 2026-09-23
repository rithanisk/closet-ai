# Closet AI Feature Backlog

This file tracks post-MVP product ideas. Items here are documented for future planning and are not part of the current implementation.

## Pinterest and style-inspiration profile

**Status:** Planned — do not implement in the current MVP  
**Priority:** Post-MVP

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

**Status:** Planned enhancement — do not implement in the current MVP  
**Priority:** Post-MVP

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

These ideas extend the existing inspiration-image onboarding and shopping-suggestion concepts in `PRD.md`. They are intentionally deferred so the current production MVP can remain focused on reliable wardrobe extraction, inventory management, and owned-item outfit generation.
