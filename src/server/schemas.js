import 'server-only';

import { z } from 'zod';
import { CATEGORIES, FORMALITY, WARMTH } from '../shared/wardrobe';

const text = (max) => z.string().trim().max(max);
const compactList = (values) => [...new Set(values.filter(Boolean))];

/** Descriptive garment fields shared by wardrobe creation and editing. */
export const garmentFields = {
  name: z.string().trim().min(1).max(80),
  category: z.enum(CATEGORIES),
  color: z.string().trim().min(1).max(50),
  secondaryColor: text(50),
  subcategory: text(60),
  pattern: text(50),
  material: text(60),
  formality: z.enum(FORMALITY),
  season: z.string().trim().min(1).max(50),
  warmth: z.union([z.enum(WARMTH), z.literal('')]),
  fit: text(80),
  brand: text(60),
  description: text(1200),
  styleTags: z.array(z.string().trim().max(30)).max(8).transform(compactList),
  details: z.array(z.string().trim().max(60)).max(10).transform(compactList),
};

/** Map API field names to wardrobe_items columns, skipping undefined values. */
export function garmentColumns(input) {
  const map = {
    name: 'name', category: 'category', color: 'color', secondaryColor: 'secondary_color', subcategory: 'subcategory',
    pattern: 'pattern', material: 'material', formality: 'formality', season: 'season', warmth: 'warmth', fit: 'fit',
    brand: 'brand', description: 'description', styleTags: 'style_tags_json', details: 'details_json',
    notes: 'notes', favorite: 'favorite', available: 'available',
  };
  return Object.fromEntries(Object.entries(map).filter(([key]) => input[key] !== undefined).map(([key, column]) => [column, input[key]]));
}
