export const COLORS = {
  coral: '#C65D3B',
  olive: '#6B7A4F',
  denim: '#3E5C76',
  mustard: '#C9A227',
  clay: '#B08968',
  plum: '#6D445A',
};

export { CATEGORIES as categories } from './shared/wardrobe';

export const seedWardrobe = [
  { id: 'w1', name: 'Ivory Silk Blouse', category: 'Tops', color: 'White', accent: COLORS.coral, favorite: true, available: true, formality: 'Smart casual', season: 'All seasons', notes: '', addedAt: 10, worn: 4 },
  { id: 'w2', name: 'Black Tailored Trousers', category: 'Bottoms', color: 'Black', accent: COLORS.denim, favorite: false, available: true, formality: 'Smart casual', season: 'All seasons', notes: '', addedAt: 9, worn: 7 },
  { id: 'w3', name: 'Camel Wool Coat', category: 'Outerwear', color: 'Camel', accent: COLORS.mustard, favorite: true, available: true, formality: 'Dressy', season: 'Fall / winter', notes: '', addedAt: 8, worn: 2 },
  { id: 'w4', name: 'Emerald Slip Dress', category: 'Dresses', color: 'Green', accent: COLORS.olive, favorite: true, available: true, formality: 'Dressy', season: 'Spring / summer', notes: '', addedAt: 7, worn: 3 },
  { id: 'w5', name: 'White Leather Sneakers', category: 'Shoes', color: 'White', accent: COLORS.clay, favorite: false, available: true, formality: 'Casual', season: 'All seasons', notes: '', addedAt: 6, worn: 12 },
  { id: 'w6', name: 'Black Ankle Boots', category: 'Shoes', color: 'Black', accent: COLORS.denim, favorite: false, available: true, formality: 'Smart casual', season: 'Fall / winter', notes: '', addedAt: 5, worn: 5 },
  { id: 'w7', name: 'Straw Tote Bag', category: 'Bags', color: 'Tan', accent: COLORS.mustard, favorite: false, available: true, formality: 'Casual', season: 'Spring / summer', notes: '', addedAt: 4, worn: 8 },
  { id: 'w8', name: 'Gold Hoop Earrings', category: 'Jewelry', color: 'Gold', accent: COLORS.coral, favorite: false, available: true, formality: 'Dressy', season: 'All seasons', notes: '', addedAt: 3, worn: 10 },
  { id: 'w9', name: 'Denim Midi Skirt', category: 'Skirts', color: 'Blue', accent: COLORS.denim, favorite: false, available: true, formality: 'Casual', season: 'All seasons', notes: '', addedAt: 2, worn: 6 },
  { id: 'w10', name: 'Striped Cotton Tee', category: 'Tops', color: 'Multi', accent: COLORS.olive, favorite: false, available: false, formality: 'Casual', season: 'Spring / summer', notes: 'At the tailor', addedAt: 1, worn: 9 },
];

export const detectionSeed = [
  { id: 'd1', name: 'Rust Corduroy Jacket', category: 'Outerwear', color: 'Rust', accent: COLORS.coral, confidence: 'high', duplicate: false, selected: true },
  { id: 'd2', name: 'Cream Turtleneck', category: 'Tops', color: 'Cream', accent: COLORS.mustard, confidence: 'high', duplicate: false, selected: true },
  { id: 'd3', name: 'Plaid Mini Skirt', category: 'Skirts', color: 'Plaid', accent: COLORS.denim, confidence: 'low', duplicate: false, selected: true },
  { id: 'd4', name: 'Black Leather Belt', category: 'Belts', color: 'Black', accent: COLORS.denim, confidence: 'high', duplicate: false, selected: true },
  { id: 'd5', name: 'Black Leather Belt', category: 'Belts', color: 'Black', accent: COLORS.denim, confidence: 'high', duplicate: true, selected: false },
  { id: 'd6', name: 'Straw Tote Bag', category: 'Bags', color: 'Tan', accent: COLORS.mustard, confidence: 'high', duplicate: true, selected: false },
];

export const promptChips = [
  'Casual day out', 'Class or campus', 'Date night', 'Dinner',
  'Interview', 'Party', 'Work or internship', 'Travel day',
];

export const styleOptions = ['Minimal', 'Feminine', 'Classic', 'Preppy', 'Romantic', 'Streetwear', 'Sporty', 'Y2K'];

const wardrobeItem = (wardrobe, name) => wardrobe.find((item) => item.name === name) || wardrobe.find((item) => item.available);

export function buildOutfits(wardrobe, context = {}) {
  const available = wardrobe.filter((item) => item.available);
  const pick = (name) => wardrobeItem(available, name);
  const assemble = (id, rank, title, names, blurb, details = {}) => ({
    id, rank, title, items: names.map(pick).filter(Boolean), blurb,
    why: details.why || 'These pieces balance color, proportion, and formality while staying close to the style you save most often.',
    occasionFit: details.occasionFit || `Polished enough for ${context.occasion || 'the occasion'}, without feeling overdone.`,
    weatherFit: details.weatherFit || `${context.weather || 'Mild conditions'} are covered with an easy layer and comfortable footwear.`,
    stylingNotes: details.stylingNotes || 'Keep the styling clean and let one accessory be the focal point.',
    compromiseNote: details.compromiseNote || '',
    shoppingSuggestion: details.shoppingSuggestion || '',
  });

  return [
    assemble('o1', 1, 'Golden Hour Polish', ['Emerald Slip Dress', 'Camel Wool Coat', 'White Leather Sneakers', 'Gold Hoop Earrings'], 'Feminine and polished, with sneakers that keep the whole look comfortable.', {
      why: 'The emerald slip dress gives the look a clear focal point, while the camel coat adds structure without stiffness.',
      occasionFit: 'Dressy enough for dinner while staying relaxed for an evening with walking.',
      weatherFit: 'The coat is an easy layer once the temperature drops; sneakers keep wet or uneven ground manageable.',
      stylingNotes: 'Wear the coat open and keep the hoops as the only jewelry so the neckline stays clean.',
    }),
    assemble('o2', 2, 'Uptown Ease', ['Ivory Silk Blouse', 'Denim Midi Skirt', 'Black Ankle Boots', 'Gold Hoop Earrings'], 'A softer, more casual option that uses silk to elevate denim.', {
      why: 'Silk and denim create a deliberate high-low mix that reads current and effortless.',
      occasionFit: 'Put together without feeling overdressed if the setting is more casual than expected.',
      weatherFit: 'The midi length and ankle boots offer a little more coverage as the evening cools.',
      stylingNotes: 'Try a relaxed half-tuck and push the sleeves up once for an easy proportion.',
    }),
    assemble('o3', 3, 'Tailored Evening', ['Black Tailored Trousers', 'Ivory Silk Blouse', 'Camel Wool Coat', 'Straw Tote Bag'], 'The most tailored option, softened with a warm neutral layer.', {
      why: 'The column of black and ivory is clean and elongating, while camel adds warmth.',
      occasionFit: 'A strong choice for a dinner or event with a slightly more polished dress code.',
      weatherFit: 'The wool coat offers the most reliable coverage if the forecast turns cooler.',
      stylingNotes: 'Keep the blouse loosely tucked and let the trouser hem fall cleanly over the shoe.',
      compromiseNote: "You don't own a dedicated evening bag, so your straw tote is the closest available alternative.",
      shoppingSuggestion: 'A structured black mini bag would pair with at least six pieces you already own and complete evening looks like this one.',
    }),
  ];
}
