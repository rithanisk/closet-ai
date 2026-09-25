// Pure scoring helpers for wardrobe-gap suggestions. Shared so the rules are unit-testable.

const unique = (values) => [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))];

/**
 * Validate a model suggestion against the owned wardrobe and compute a 0-100 versatility score.
 * Returns null when the suggestion is not useful enough to show.
 * `owned` is a Map of id -> wardrobe item (available items only).
 */
export function scoreSuggestion(suggestion, owned) {
  if (suggestion.duplicatesOwned) return null;
  const examples = (suggestion.exampleOutfits || [])
    .map((example) => ({ ...example, itemIds: unique(example.itemIds).filter((id) => owned.has(id)) }))
    .filter((example) => example.itemIds.length >= 2);
  if (examples.length < 2) return null;

  const pairIds = unique([...(suggestion.pairsWithItemIds || []), ...examples.flatMap((example) => example.itemIds)]).filter((id) => owned.has(id));
  if (pairIds.length < 3) return null;

  const categories = unique(pairIds.map((id) => owned.get(id).category));
  const occasions = unique(suggestion.occasions);
  const seasons = unique(suggestion.seasons);
  const layeringRoles = unique(suggestion.layeringRoles);
  const looks = Math.max(examples.length, Math.min(40, Math.round(Number(suggestion.estimatedLooks) || 0)));
  const styleFit = Math.max(1, Math.min(5, Math.round(Number(suggestion.styleFit) || 3)));

  // Weighted toward real coordination with owned pieces, then breadth of use.
  const raw = Math.min(pairIds.length, 12) * 3.5
    + Math.min(looks, 15) * 1.6
    + Math.min(occasions.length, 5) * 3
    + Math.min(seasons.length, 4) * 2
    + Math.min(categories.length, 5) * 2
    + (layeringRoles.length ? 4 : 0)
    + styleFit * 2;
  const score = Math.round(Math.min(100, raw));

  return {
    score,
    examples,
    versatility: {
      pairsWith: pairIds,
      pairCount: pairIds.length,
      looks,
      occasions,
      seasons,
      layeringRoles,
      categories,
      styleFit,
    },
  };
}

/** Keep the strongest distinct suggestions, never more than `limit`. */
export function rankSuggestions(scored, limit = 3) {
  const seen = new Set();
  return scored
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .filter((entry) => {
      const key = `${entry.category}:${entry.name}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
