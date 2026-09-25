import 'server-only';

/** Map over values with at most `limit` promises in flight, preserving order. */
export async function mapLimit(values, limit, iteratee) {
  const results = new Array(values.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, values.length)) }, async () => {
    while (next < values.length) {
      const index = next;
      next += 1;
      results[index] = await iteratee(values[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}
