// Composes an outfit into one head-to-toe flat lay. Pure so it can be unit tested.
// Every box is in percentages of a 3:4 frame.

const ZONE = {
  Hats: 'head', Outerwear: 'outer', Tops: 'top', Dresses: 'onepiece', Sets: 'onepiece',
  Bottoms: 'bottom', Skirts: 'bottom', Shoes: 'feet', Bags: 'bag', Scarves: 'neck',
  Belts: 'waist', Jewelry: 'jewelry', Accessories: 'jewelry',
};

export const zoneFor = (category) => ZONE[category] || 'jewelry';

const ORDER = ['head', 'outer', 'onepiece', 'top', 'neck', 'bottom', 'waist', 'feet', 'bag', 'jewelry'];

export function sortHeadToToe(items) {
  return [...items].sort((a, b) => ORDER.indexOf(zoneFor(a.category)) - ORDER.indexOf(zoneFor(b.category)));
}

export function layoutFlatLay(items) {
  const groups = {};
  for (const item of items) (groups[zoneFor(item.category)] ||= []).push(item);
  const has = (zone) => Boolean(groups[zone]?.length);
  const boxes = [];
  const place = (zone, box) => (groups[zone] || []).forEach((item, index) => {
    // Extra pieces in the same zone fan out slightly, like layered garments on a table.
    const shift = index * 7;
    boxes.push({ item, zone, left: box.left + shift, top: box.top + shift * 0.5, width: box.width - shift, height: box.height - shift * 0.6, z: box.z + index });
  });

  const head = has('head');
  const bodyTop = head ? 15 : 5;
  const onepiece = has('onepiece');
  const top = has('top');
  const outer = has('outer');
  const garmentCenter = outer && (top || onepiece) ? 58 : 50;

  place('head', { left: 37, top: 0, width: 26, height: 16, z: 6 });
  if (onepiece) {
    place('onepiece', { left: garmentCenter - 26, top: bodyTop, width: 52, height: has('bottom') ? 44 : 64, z: 3 });
  }
  if (top) {
    place('top', { left: garmentCenter - 27, top: onepiece ? bodyTop + 2 : bodyTop, width: 54, height: 36, z: 4 });
  }
  if (outer) {
    const alone = !top && !onepiece;
    place('outer', alone
      ? { left: 22, top: bodyTop, width: 56, height: 40, z: 3 }
      : { left: 4, top: bodyTop - 2, width: 50, height: 50, z: 2 });
  }
  const upperBottom = onepiece ? bodyTop + 44 : bodyTop + 33;
  place('bottom', { left: 26, top: has('onepiece') || top || outer ? upperBottom : bodyTop + 6, width: 48, height: onepiece ? 32 : 44, z: 3 });
  place('waist', { left: 30, top: onepiece ? bodyTop + 26 : upperBottom - 4, width: 40, height: 10, z: 7 });
  place('neck', { left: garmentCenter + 6, top: bodyTop + 2, width: 24, height: 22, z: 6 });
  place('feet', { left: 30, top: 81, width: 40, height: 18, z: 5 });
  place('bag', { left: 70, top: 50, width: 28, height: 26, z: 6 });

  (groups.jewelry || []).forEach((item, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    boxes.push({ item, zone: 'jewelry', left: column ? 80 : 2, top: (column ? 80 : 52) + row * 13 - (column ? row * 26 : 0), width: 17, height: 12, z: 7 });
  });
  return boxes.map((box) => ({ ...box, left: Math.max(0, Math.min(100 - box.width, box.left)), top: Math.max(0, Math.min(100 - box.height, box.top)) }));
}
