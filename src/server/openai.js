import 'server-only';

import OpenAI, { toFile } from 'openai';
import { z } from 'zod';
import { CATEGORIES, FORMALITY, WARMTH } from '../shared/wardrobe';

export function client() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 180_000, maxRetries: 2 });
}

export const visionModel = () => process.env.OPENAI_VISION_MODEL || 'gpt-5.6-terra';
export const imageModel = () => process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare';

/** Run a strict JSON-schema Responses call and validate the parsed output with zod. */
export async function structuredResponse({ name, schema, validator, content, tools }) {
  const request = {
    model: visionModel(),
    store: false,
    ...(tools ? { tools } : {}),
    input: [{ role: 'user', content }],
    text: { format: { type: 'json_schema', name, strict: true, schema } },
  };
  let response;
  try {
    response = await client().responses.create(request);
  } catch (error) {
    // Retry without optional tools (such as web search) when the model rejects them.
    if (!tools || error?.status !== 400) throw error;
    const { tools: _tools, ...withoutTools } = request;
    response = await client().responses.create(withoutTools);
  }
  return validator.parse(JSON.parse(response.output_text));
}

const stringList = (max) => ({ type: 'array', maxItems: max, items: { type: 'string' } });

// ---------------------------------------------------------------------------
// Garment detection
// ---------------------------------------------------------------------------

const extractionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      maxItems: 24,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'category', 'subcategory', 'color', 'secondaryColor', 'pattern', 'material', 'formality', 'season', 'warmth', 'fit', 'brand', 'styleTags', 'details', 'description', 'confidence', 'bbox'],
        properties: {
          name: { type: 'string', description: 'Short, specific product-style name, e.g. "Cropped Ivory Cable-Knit Cardigan".' },
          category: { type: 'string', enum: CATEGORIES },
          subcategory: { type: 'string', description: 'Specific garment type, e.g. "cardigan", "wide-leg jeans", "ballet flats".' },
          color: { type: 'string', description: 'Primary color in plain fashion language, e.g. "ivory", "washed indigo".' },
          secondaryColor: { type: 'string', description: 'Secondary color or empty string.' },
          pattern: { type: 'string', description: 'e.g. "solid", "pinstripe", "small floral print".' },
          material: { type: 'string', description: 'Best visual guess, e.g. "chunky wool knit", "rigid denim". Empty if unclear.' },
          formality: { type: 'string', enum: FORMALITY },
          season: { type: 'string', description: 'e.g. "All seasons", "Spring / summer", "Fall / winter".' },
          warmth: { type: 'string', enum: WARMTH },
          fit: { type: 'string', description: 'Silhouette and fit, e.g. "cropped, boxy", "high-rise, straight leg".' },
          brand: { type: 'string', description: 'Only if a logo or label is clearly legible, otherwise empty string.' },
          styleTags: { ...stringList(6), description: 'Aesthetic tags such as minimal, preppy, romantic, streetwear.' },
          details: { ...stringList(8), description: 'Distinctive construction details: neckline, sleeves, closures, hardware, pockets, hems, trims.' },
          description: { type: 'string', description: 'Detailed 3-5 sentence description (60-120 words) covering silhouette, length, neckline/waist, sleeves, fabric texture and weight, color nuances, pattern placement, closures and hardware, and styling character.' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          bbox: {
            type: 'array',
            description: 'Bounding box [x,y,width,height] in 0-1000 normalized coordinates.',
            minItems: 4,
            maxItems: 4,
            items: { type: 'integer', minimum: 0, maximum: 1000 },
          },
        },
      },
    },
  },
};

const clip = (max) => z.string().transform((value) => value.trim().slice(0, max));

const extractionResult = z.object({
  items: z.array(z.object({
    name: clip(80).pipe(z.string().min(1)),
    category: z.enum(CATEGORIES),
    subcategory: clip(60),
    color: clip(50).pipe(z.string().min(1)),
    secondaryColor: clip(50),
    pattern: clip(50),
    material: clip(60),
    formality: z.enum(FORMALITY),
    season: clip(50).pipe(z.string().min(1)),
    warmth: z.enum(WARMTH),
    fit: clip(80),
    brand: clip(60),
    styleTags: z.array(clip(30)).max(6),
    details: z.array(clip(60)).max(8),
    description: clip(1200),
    confidence: z.number().min(0).max(1),
    bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  })).max(24),
});

function safeBox(box) {
  let [x, y, width, height] = box.map((value) => Math.max(0, Math.min(1000, Math.round(value))));
  width = Math.max(1, Math.min(width, 1000 - x));
  height = Math.max(1, Math.min(height, 1000 - y));
  return [x, y, width, height];
}

export async function extractGarments(buffer) {
  const parsed = await structuredResponse({
    name: 'garment_extraction',
    schema: extractionSchema,
    validator: extractionResult,
    content: [
      {
        type: 'input_text',
        text: `Act as a meticulous fashion inventory cataloguer. Detect every distinct visible wearable item in this image, including layered clothing, paired shoes as one item, bags, jewelry, belts, scarves, and hats. Do not include bodies, furniture, or duplicates.

For each item:
- Name it specifically but objectively, like a product listing.
- Write a detailed description a stylist could use without seeing the photo: silhouette, length, neckline or waistline, sleeves, fabric texture and apparent weight, exact color nuances, pattern type and placement, closures, hardware, pockets, trims, and overall character. Describe only what is visible; say "appears" for inferred fabric.
- Return a tight bounding box around the entire item using [x,y,width,height] normalized from 0 to 1000. If partly occluded, cover its full visible extent.
- Use the closest allowed category. Set confidence lower when the category, color, or boundary is uncertain.

Return an empty items array if there are no wearable items.`,
      },
      { type: 'input_image', image_url: `data:image/jpeg;base64,${buffer.toString('base64')}`, detail: 'high' },
    ],
  });
  return parsed.items.map((item) => ({ ...item, bbox: safeBox(item.bbox) }));
}

// ---------------------------------------------------------------------------
// Transparent garment cutouts
// ---------------------------------------------------------------------------

/**
 * Isolate one garment from a padded crop and return a PNG with a transparent background.
 * The description disambiguates the target when the crop also contains neighbouring items.
 */
export async function isolateGarment(cropBuffer, item) {
  const pairNote = item.category === 'Shoes' ? ' Show the complete pair side by side.' : '';
  const prompt = `Extract ONLY this item from the photo and present it as a clean, isolated e-commerce product cutout on a fully transparent background.

Target item: ${item.name} (${item.category}${item.subcategory ? `, ${item.subcategory}` : ''}).
Description: ${item.description}
Key details: ${(item.details || []).join('; ') || 'as visible'}.

Requirements:
- Reproduce the garment faithfully: exact colors, pattern and print scale, fabric texture, stitching, hardware, trims, proportions, and any visible logos or text.
- Remove everything else: the person, skin, hair, hands, hangers, mannequins, other garments or accessories, furniture, and the background.
- If small parts are hidden by a body or another item, complete only what is needed for a natural, whole shape consistent with the visible parts. Never add new design details.
- Front view, neatly laid flat or ghost-mannequin style, centered, filling most of the frame, no drop shadow, no props, no added text.${pairNote}`;

  const request = {
    model: imageModel(),
    image: await toFile(cropBuffer, 'garment.png', { type: 'image/png' }),
    prompt,
    background: 'transparent',
    output_format: 'png',
    size: '1024x1024',
    quality: process.env.OPENAI_CUTOUT_QUALITY || 'medium',
    input_fidelity: 'high',
  };
  let response;
  try {
    response = await client().images.edit(request);
  } catch (error) {
    if (error?.status !== 400) throw error;
    const { input_fidelity: _fidelity, ...withoutFidelity } = request;
    response = await client().images.edit(withoutFidelity);
  }
  const base64 = response.data?.[0]?.b64_json;
  if (!base64) throw new Error('OpenAI returned no cutout image.');
  return Buffer.from(base64, 'base64');
}

// ---------------------------------------------------------------------------
// Outfit generation
// ---------------------------------------------------------------------------

const outfitSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['assistantMessage', 'constraints', 'weatherSummary', 'outfits'],
  properties: {
    assistantMessage: { type: 'string' },
    constraints: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    weatherSummary: { type: 'string' },
    outfits: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'blurb', 'itemIds', 'why', 'occasionFit', 'weatherFit', 'stylingNotes', 'inspirationNote', 'compromiseNote', 'shoppingSuggestion'],
        properties: {
          title: { type: 'string' },
          blurb: { type: 'string' },
          itemIds: { type: 'array', minItems: 2, maxItems: 8, items: { type: 'string' } },
          why: { type: 'string' },
          occasionFit: { type: 'string' },
          weatherFit: { type: 'string' },
          stylingNotes: { type: 'string' },
          inspirationNote: { type: 'string', description: 'One sentence linking the look to the inspiration profile, or empty string when there is no genuine connection.' },
          compromiseNote: { type: 'string' },
          shoppingSuggestion: { type: 'string' },
        },
      },
    },
  },
};

const outfitResult = z.object({
  assistantMessage: z.string(),
  constraints: z.array(z.string()).max(8),
  weatherSummary: z.string(),
  outfits: z.array(z.object({
    title: z.string(), blurb: z.string(), itemIds: z.array(z.string()).min(2).max(8),
    why: z.string(), occasionFit: z.string(), weatherFit: z.string(), stylingNotes: z.string(),
    inspirationNote: z.string(), compromiseNote: z.string(), shoppingSuggestion: z.string(),
  })).length(3),
});

export function inventoryForPrompt(wardrobe) {
  return wardrobe.map(({ id, name, category, subcategory, color, secondaryColor, pattern, material, formality, season, warmth, fit, styleTags, description, notes, favorite, worn }) => ({
    id, name, category, subcategory, color, secondaryColor, pattern, material, formality, season, warmth, fit, styleTags, description, notes, favorite, worn,
  }));
}

export async function generateOutfits({ prompt, city, styles, styleProfile, weather, wardrobe, saved, refinement }) {
  const inventory = inventoryForPrompt(wardrobe.filter((item) => item.available));
  const approvedHistory = saved.slice(0, 15).map((outfit) => ({ title: outfit.title, itemIds: outfit.items.map((item) => item.id) }));
  const today = new Date().toISOString().slice(0, 10);
  const useWebSearch = process.env.OPENAI_ENABLE_WEB_SEARCH !== 'false';
  return structuredResponse({
    name: 'outfit_recommendations',
    schema: outfitSchema,
    validator: outfitResult,
    tools: useWebSearch ? [{ type: 'web_search' }] : undefined,
    content: [{
      type: 'input_text',
      text: `You are a discerning personal stylist. Create exactly three distinct, complete, wearable outfits using ONLY IDs from the available wardrobe. Never invent an owned item. Each look must make sense as a full outfit for the occasion, location, live weather, and user's aesthetics. Shoes should be included when any are available. Use outerwear only when useful. Bags/accessories improve a look but are not mandatory. Rank strongest first. Use the item descriptions to judge texture, proportion, and color harmony.

Every look must read as ONE cohesive head-to-toe outfit, not a set of separate good pieces: a clear color story, consistent formality, balanced proportions between top and bottom, and shoes and accessories that finish the same idea. List itemIds in head-to-toe order (hat, outerwear, top or dress, bottom, shoes), then bag and jewelry.

Priority order: explicit constraints, completeness and practicality, occasion, weather, personal style, aesthetic coherence, then trend relevance.

The inspiration profile (if present) is a SOFT preference learned from images the user saved. Let it nudge silhouettes, palette, layering, and proportions, but never override explicit constraints, weather, or occasion. Never try to recreate a specific pinned outfit, and never assume the user owns anything that appeared in an inspiration image. Fill inspirationNote only when a look genuinely reflects the profile.

If web search is available, use it briefly to ground only genuinely relevant current fashion trends for today's date; the user's taste and context matter more than a trend. If the wardrobe lacks the ideal item, use the closest owned alternative and state it in compromiseNote. shoppingSuggestion may recommend at most one unowned item that would unlock several combinations with pieces they already own; it must never appear in itemIds and must not duplicate something already owned. Keep recommendations practical and concise.

Date: ${today}
Request: ${prompt}
Refinement: ${refinement || 'none'}
Location: ${city || 'not provided'}
Weather: ${weather}
Selected aesthetics: ${styles.join(', ') || 'not specified'}
Inspiration profile JSON: ${styleProfile ? JSON.stringify(styleProfile) : 'none'}
Available wardrobe JSON: ${JSON.stringify(inventory)}
Previously approved outfits JSON: ${JSON.stringify(approvedHistory)}`,
    }],
  });
}

// ---------------------------------------------------------------------------
// Avatar twin and try-on
// ---------------------------------------------------------------------------

const AVATAR_BACKGROUND = 'a seamless, softly lit studio backdrop in very pale blue-grey (#EEF2F7) with a gentle floor shadow';
const AVATAR_BASE_OUTFIT = 'a plain fitted light-grey crew-neck t-shirt, plain fitted light-grey ankle leggings, and simple minimal white sneakers';

const VIEW_PROMPTS = {
  front: 'facing the camera directly, standing tall and relaxed, arms slightly away from the body, feet hip-width apart',
  side: 'turned 90 degrees to their left so the camera sees a clean side profile, same relaxed standing pose',
  back: 'turned fully away from the camera so the camera sees their back, same relaxed standing pose, hair as it naturally falls',
};

async function imageFiles(images) {
  return Promise.all(images.map((image, index) => toFile(image.buffer, `reference-${index + 1}.${image.extension || 'png'}`, { type: image.mimeType || 'image/png' })));
}

async function editImage({ images, prompt, size = '1024x1536', quality }) {
  const request = {
    model: imageModel(),
    image: await imageFiles(images),
    prompt,
    size,
    quality: quality || process.env.OPENAI_TRYON_QUALITY || 'medium',
    output_format: 'png',
    input_fidelity: 'high',
  };
  let response;
  try {
    response = await client().images.edit(request);
  } catch (error) {
    if (error?.status !== 400) throw error;
    const { input_fidelity: _fidelity, ...withoutFidelity } = request;
    response = await client().images.edit(withoutFidelity);
  }
  const base64 = response.data?.[0]?.b64_json;
  if (!base64) throw new Error('OpenAI returned no image.');
  return Buffer.from(base64, 'base64');
}

/**
 * Render one view of the user's photoreal twin in neutral base clothing.
 * `sources` are the user's own photos. For side and back views, `front` is the approved front render,
 * so every view stays consistent with it.
 */
export async function generateAvatarView({ view, sources, front, notes }) {
  const references = view === 'front' ? sources : [front, ...sources.slice(0, 2)];
  const prompt = `Create a photorealistic, full-body fashion fitting photograph of the exact person in the reference ${view === 'front' ? 'photos' : 'images'}. This becomes their personal "twin" for virtual try-ons, so identity accuracy matters more than anything else.

Keep exactly: face and facial features, skin tone, hair color, texture and length, body shape and proportions, height impression, and any visible distinctive features. Do not slim, idealize, age, or beautify them.
${view === 'front' ? '' : `The first reference is their approved front view. Match it exactly: same person, same clothing, lighting, backdrop, and framing.
`}Pose: ${VIEW_PROMPTS[view]}.
Clothing: ${AVATAR_BASE_OUTFIT}. No jewelry, bags, or accessories.
Framing: the whole body from the top of the head to the shoes is visible with comfortable margin, centered, camera at chest height, 50mm lens look.
Setting: ${AVATAR_BACKGROUND}. Soft, even, flattering light. No text, no props, no other people.${notes ? `
Notes from the user about themselves: ${notes}` : ''}`;
  return editImage({ images: references, prompt, quality: process.env.OPENAI_AVATAR_QUALITY || 'high' });
}

/**
 * Dress the twin in the supplied garment cutouts. Pieces not supplied keep the neutral base layer,
 * so items can be tried one at a time.
 */
export async function generateTryOnLook({ avatar, identity, garments, view }) {
  const hasBottomsOrDress = garments.some((item) => ['Bottoms', 'Skirts', 'Dresses', 'Sets'].includes(item.category));
  const hasTop = garments.some((item) => ['Tops', 'Dresses', 'Sets'].includes(item.category));
  const hasShoes = garments.some((item) => item.category === 'Shoes');
  const keep = [
    !hasTop && 'the plain light-grey t-shirt',
    !hasBottomsOrDress && 'the plain light-grey leggings',
    !hasShoes && 'the white sneakers',
  ].filter(Boolean);
  const list = garments.map((item, index) => `Garment reference ${index + 3}: ${item.name} (${item.category}${item.subcategory ? `, ${item.subcategory}` : ''}). ${item.description || ''}`).join('\n');
  const prompt = `Virtual try-on. Reference 1 is the person, already posed and framed. Reference 2 is an extra photo of the same person for identity. References 3 and onward are the exact wardrobe pieces to put on them.

Dress the person from reference 1 in every supplied piece as one natural, cohesive outfit, styled the way a stylist would wear them together (layering order, tucks, and accessory placement that make sense).
${list}

Rules:
- Keep the person identical to reference 1: face, skin tone, hair, body shape and proportions, pose (${view} view), framing, lighting, and backdrop.
- Reproduce each garment faithfully: color, pattern and print scale, fabric texture and drape, length, neckline, sleeves, hardware, and details. Fit it realistically to this body. Do not redesign it.
- Replace base clothing only where a supplied piece covers that area.${keep.length ? ` Keep ${keep.join(', ')} unchanged.` : ''}
- Do not add any garment, accessory, logo, or text that was not supplied.
- Photorealistic full-body fashion photograph, whole body from head to shoes visible.`;
  return editImage({ images: [avatar, identity, ...garments], prompt });
}
