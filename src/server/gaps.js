import 'server-only';

import crypto from 'node:crypto';
import { z } from 'zod';
import { CATEGORIES } from '../shared/wardrobe';
import { rankSuggestions, scoreSuggestion } from '../shared/versatility';
import { assertDatabase, db, parseJson } from './db';
import { structuredResponse } from './openai';

const strings = (max) => ({ type: 'array', maxItems: max, items: { type: 'string' } });

const gapSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['suggestions'],
  properties: {
    suggestions: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'category', 'description', 'gap', 'rationale', 'pairsWithItemIds', 'estimatedLooks', 'occasions', 'seasons', 'layeringRoles', 'styleFit', 'closestOwnedItemId', 'duplicatesOwned', 'exampleOutfits'],
        properties: {
          name: { type: 'string', description: 'Generic descriptive name, never a brand, e.g. "Fitted white ribbed tank".' },
          category: { type: 'string', enum: CATEGORIES },
          description: { type: 'string', description: 'Attributes to look for: color, fabric, cut, length, details.' },
          gap: { type: 'string', description: 'The wardrobe gap this fills, in one sentence.' },
          rationale: { type: 'string', description: 'Why it is useful, citing owned pieces by name, e.g. "works under your two cardigans and with three pairs of jeans".' },
          pairsWithItemIds: strings(20),
          estimatedLooks: { type: 'integer', minimum: 0, maximum: 40, description: 'Realistic count of distinct complete, coherent outfits it enables with owned pieces.' },
          occasions: strings(6),
          seasons: strings(4),
          layeringRoles: strings(4),
          styleFit: { type: 'integer', minimum: 1, maximum: 5, description: 'How well it matches the user profile and preferred colors.' },
          closestOwnedItemId: { type: 'string', description: 'ID of the most similar owned item, or empty string.' },
          duplicatesOwned: { type: 'boolean', description: 'True if an owned item already serves the same function closely enough.' },
          exampleOutfits: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['title', 'itemIds', 'note'],
              properties: {
                title: { type: 'string' },
                itemIds: { ...strings(7), description: 'Owned item IDs worn together WITH the suggested piece. Never include the suggested piece itself.' },
                note: { type: 'string', description: 'One styling line.' },
              },
            },
          },
        },
      },
    },
  },
};

const gapResult = z.object({
  suggestions: z.array(z.object({
    name: z.string().trim().min(1).max(100),
    category: z.enum(CATEGORIES),
    description: z.string().max(600),
    gap: z.string().max(400),
    rationale: z.string().max(800),
    pairsWithItemIds: z.array(z.string()).max(20),
    estimatedLooks: z.number().int().min(0).max(40),
    occasions: z.array(z.string().max(40)).max(6),
    seasons: z.array(z.string().max(40)).max(4),
    layeringRoles: z.array(z.string().max(60)).max(4),
    styleFit: z.number().int().min(1).max(5),
    closestOwnedItemId: z.string(),
    duplicatesOwned: z.boolean(),
    exampleOutfits: z.array(z.object({ title: z.string().max(100), itemIds: z.array(z.string()).max(7), note: z.string().max(300) })).max(4),
  })).max(5),
});

export function suggestionView(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    gap: row.gap,
    rationale: row.rationale,
    score: Number(row.score),
    versatility: parseJson(row.versatility_json, {}),
    examples: parseJson(row.examples_json, []),
    status: row.status,
    feedback: row.feedback,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export async function listSuggestions(userId) {
  const { data, error } = await db().from('shopping_suggestions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
  assertDatabase(error, 'Could not load wardrobe suggestions');
  return data.map(suggestionView);
}

const compact = (text, max) => (text && text.length > max ? `${text.slice(0, max - 1)}…` : text || '');

export async function analyzeGaps({ userId, wardrobe, styles, styleProfile, saved }) {
  const available = wardrobe.filter((item) => item.available);
  const owned = new Map(available.map((item) => [item.id, item]));
  const history = (await listSuggestions(userId)).filter((entry) => entry.status !== 'active').slice(0, 25)
    .map(({ name, category, status, feedback }) => ({ name, category, status, feedback }));
  const inventory = available.map(({ id, name, category, subcategory, color, pattern, formality, season, warmth, styleTags, description, worn }) => ({
    id, name, category, subcategory, color, pattern, formality, season, warmth, styleTags, worn, description: compact(description, 180),
  }));

  const parsed = await structuredResponse({
    name: 'wardrobe_gaps',
    schema: gapSchema,
    validator: gapResult,
    content: [{
      type: 'input_text',
      text: `You are a practical personal stylist auditing a real wardrobe for gaps. Suggest up to 5 pieces the user does NOT own that would unlock the most complete, stylistically coherent, realistic outfits with what they already own.

Rules:
- Optimize for repeat wear across different occasions, seasons, and styling roles (base layer, third piece, statement, anchor). Durable staples are welcome when they solve a real gap; trend-led pieces only when they have broad utility.
- Do not suggest anything the wardrobe already covers with a close functional alternative. Set duplicatesOwned=true if in doubt, and name the closest owned item.
- Every example outfit must be complete and wearable using ONLY the owned IDs listed plus the suggested piece. Never include unowned items in itemIds.
- Raw combination counts are not the goal; combinations must make sense together.
- Respect feedback history: never re-suggest anything dismissed or marked already owned; learn from what was wishlisted or purchased.
- No brands, retailers, prices, or links.

Selected aesthetics: ${styles.join(', ') || 'not specified'}
Inspiration profile JSON: ${styleProfile ? JSON.stringify(styleProfile) : 'none'}
Saved outfits (taste signal) JSON: ${JSON.stringify(saved.slice(0, 12).map((outfit) => ({ title: outfit.title, items: outfit.items.map((item) => item.name) })))}
Feedback history JSON: ${JSON.stringify(history)}
Owned wardrobe JSON: ${JSON.stringify(inventory)}`,
    }],
  });

  const scored = parsed.suggestions.map((suggestion) => {
    const result = scoreSuggestion(suggestion, owned);
    return result && { ...suggestion, ...result };
  });
  return rankSuggestions(scored, 3);
}

/** Replace the current active suggestions, keeping wishlist and feedback history intact. */
export async function storeSuggestions(userId, suggestions) {
  const database = db();
  const { error: clearError } = await database.from('shopping_suggestions').delete().eq('user_id', userId).eq('status', 'active');
  assertDatabase(clearError, 'Could not replace previous suggestions');
  if (!suggestions.length) return;
  const now = Date.now();
  const { error } = await database.from('shopping_suggestions').insert(suggestions.map((suggestion, index) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    name: suggestion.name,
    category: suggestion.category,
    description: suggestion.description,
    gap: suggestion.gap,
    rationale: suggestion.rationale,
    score: suggestion.score,
    versatility_json: suggestion.versatility,
    examples_json: suggestion.examples.map(({ title, itemIds, note }) => ({ title, itemIds, note })),
    status: 'active',
    feedback: '',
    created_at: now - index,
    updated_at: now,
  })));
  assertDatabase(error, 'Could not save suggestions');
}
