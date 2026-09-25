import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/src/server/auth';
import { mapLimit } from '@/src/server/concurrency';
import { assertDatabase, db } from '@/src/server/db';
import { apiError, assertSameOrigin, jsonBody } from '@/src/server/http';
import { listWardrobe } from '@/src/server/repository';
import { deleteImage } from '@/src/server/storage';

const schema = z.object({
  action: z.enum(['delete', 'available', 'unavailable', 'favorite', 'unfavorite']),
  ids: z.array(z.string().uuid()).min(1).max(500),
});

/** Apply one action to many wardrobe items at once. */
export async function POST(request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { action, ids } = await jsonBody(request, schema);
    const database = db();
    const { data: items, error } = await database.from('wardrobe_items').select('id, image_id').eq('user_id', user.id).in('id', ids);
    assertDatabase(error, 'Could not load wardrobe items');
    const ownedIds = items.map((item) => item.id);
    if (ownedIds.length) {
      if (action === 'delete') {
        const { error: deleteError } = await database.from('wardrobe_items').delete().eq('user_id', user.id).in('id', ownedIds);
        assertDatabase(deleteError, 'Could not delete wardrobe items');
        await mapLimit(items.filter((item) => item.image_id), 6, (item) => deleteImage(user.id, item.image_id).catch((cleanupError) => console.error(cleanupError)));
      } else {
        const changes = { available: { available: true }, unavailable: { available: false }, favorite: { favorite: true }, unfavorite: { favorite: false } }[action];
        const { error: updateError } = await database.from('wardrobe_items').update(changes).eq('user_id', user.id).in('id', ownedIds);
        assertDatabase(updateError, 'Could not update wardrobe items');
      }
    }
    return NextResponse.json({ items: await listWardrobe(user.id), affected: ownedIds.length });
  } catch (error) { return apiError(error); }
}
