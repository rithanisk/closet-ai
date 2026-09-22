import 'server-only';

import OpenAI, { toFile } from 'openai';
import { z } from 'zod';

const CATEGORIES = ['Tops', 'Bottoms', 'Skirts', 'Dresses', 'Shoes', 'Outerwear', 'Accessories', 'Bags'];

function client() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 120_000, maxRetries: 2 });
}

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
        required: ['name', 'category', 'color', 'pattern', 'material', 'formality', 'season', 'confidence', 'bbox'],
        properties: {
          name: { type: 'string' },
          category: { type: 'string', enum: CATEGORIES },
          color: { type: 'string' },
          pattern: { type: 'string' },
          material: { type: 'string' },
          formality: { type: 'string', enum: ['Casual', 'Smart casual', 'Dressy'] },
          season: { type: 'string' },
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

const extractionResult = z.object({
  items: z.array(z.object({
    name: z.string().min(1).max(80),
    category: z.enum(CATEGORIES),
    color: z.string().min(1).max(50),
    pattern: z.string().max(50),
    material: z.string().max(50),
    formality: z.enum(['Casual', 'Smart casual', 'Dressy']),
    season: z.string().min(1).max(50),
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
  const response = await client().responses.create({
    model: process.env.OPENAI_VISION_MODEL || 'gpt-5.6-terra',
    store: false,
    input: [{
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: `Act as a meticulous fashion inventory vision system. Detect every distinct visible wearable item in this image, including layered clothing, paired shoes as one item, bags, jewelry, belts, scarves, and hats. Do not include bodies, furniture, or duplicates. Name each item specifically but objectively. Return a tight bounding box for the entire item using [x,y,width,height] coordinates normalized from 0 to 1000. If an item is partly occluded, include its full visible extent. Use the closest allowed category. Return an empty items array if there are no wearable items.`,
        },
        { type: 'input_image', image_url: `data:image/jpeg;base64,${buffer.toString('base64')}`, detail: 'high' },
      ],
    }],
    text: { format: { type: 'json_schema', name: 'garment_extraction', strict: true, schema: extractionSchema } },
  });
  const parsed = extractionResult.parse(JSON.parse(response.output_text));
  return parsed.items.map((item) => ({ ...item, bbox: safeBox(item.bbox) }));
}

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
        required: ['title', 'blurb', 'itemIds', 'why', 'occasionFit', 'weatherFit', 'stylingNotes', 'compromiseNote', 'shoppingSuggestion'],
        properties: {
          title: { type: 'string' },
          blurb: { type: 'string' },
          itemIds: { type: 'array', minItems: 2, maxItems: 8, items: { type: 'string' } },
          why: { type: 'string' },
          occasionFit: { type: 'string' },
          weatherFit: { type: 'string' },
          stylingNotes: { type: 'string' },
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
    compromiseNote: z.string(), shoppingSuggestion: z.string(),
  })).length(3),
});

export async function generateOutfits({ prompt, city, styles, weather, wardrobe, saved, refinement }) {
  const available = wardrobe.filter((item) => item.available);
  const inventory = available.map(({ id, name, category, color, pattern, material, formality, season, notes, favorite, worn }) => ({ id, name, category, color, pattern, material, formality, season, notes, favorite, worn }));
  const approvedHistory = saved.slice(0, 15).map((outfit) => ({ title: outfit.title, itemIds: outfit.items.map((item) => item.id) }));
  const today = new Date().toISOString().slice(0, 10);
  const useWebSearch = process.env.OPENAI_ENABLE_WEB_SEARCH !== 'false';
  const request = {
    model: process.env.OPENAI_VISION_MODEL || 'gpt-5.6-terra',
    store: false,
    ...(useWebSearch ? { tools: [{ type: 'web_search' }] } : {}),
    input: [{
      role: 'user',
      content: [{
        type: 'input_text',
        text: `You are a discerning personal stylist. Create exactly three distinct, complete, wearable outfits using ONLY IDs from the available wardrobe. Never invent an owned item. Each look must make sense as a full outfit for the occasion, location, live weather, and user's aesthetics. Shoes should be included when any are available. Use outerwear only when useful. Bags/accessories improve a look but are not mandatory. Rank strongest first. If web search is available, use it briefly to ground only genuinely relevant current fashion trends for today's date; the user's taste and context matter more than a trend. If the wardrobe lacks the ideal item, use the closest owned alternative and state it in compromiseNote. shoppingSuggestion may recommend at most one unowned trend-aware item that would unlock several combinations; it must never appear in itemIds. Keep recommendations practical and concise.

Date: ${today}
Request: ${prompt}
Refinement: ${refinement || 'none'}
Location: ${city || 'not provided'}
Weather: ${weather}
Personal aesthetics: ${styles.join(', ') || 'not specified'}
Available wardrobe JSON: ${JSON.stringify(inventory)}
Previously approved outfits JSON: ${JSON.stringify(approvedHistory)}`,
      }],
    }],
    text: { format: { type: 'json_schema', name: 'outfit_recommendations', strict: true, schema: outfitSchema } },
  };
  let response;
  try {
    response = await client().responses.create(request);
  } catch (error) {
    if (!useWebSearch || error?.status !== 400) throw error;
    const { tools: _tools, ...withoutWebSearch } = request;
    response = await client().responses.create(withoutWebSearch);
  }
  return outfitResult.parse(JSON.parse(response.output_text));
}

export async function generateTryOn({ personBuffer, personMime, garments }) {
  const imageFiles = [
    await toFile(personBuffer, 'person.jpg', { type: personMime || 'image/jpeg' }),
    ...await Promise.all(garments.map((item, index) => toFile(item.buffer, `garment-${index + 1}.${item.extension}`, { type: item.mimeType }))),
  ];
  const response = await client().images.edit({
    model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare',
    image: imageFiles,
    prompt: `Create a tasteful, photorealistic virtual try-on. The first reference is the person and must preserve their identity, face, body proportions, pose, skin tone, hair, and setting. The remaining references are the exact wardrobe pieces to put on them. Dress the person in all compatible supplied pieces as one coherent outfit. Preserve each garment's recognizable color, pattern, material, and silhouette. Do not change the person, add logos, or invent extra garments. Natural fit and realistic fabric draping. Full-body fashion photograph.`,
    size: '1024x1536',
    quality: 'medium',
    output_format: 'png',
    input_fidelity: 'high',
  });
  const base64 = response.data?.[0]?.b64_json;
  if (!base64) throw new Error('OpenAI returned no try-on image.');
  return Buffer.from(base64, 'base64');
}
