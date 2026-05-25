const TTL_MS = 10 * 60 * 1000;
let cachedRate: number | null = null;
let cachedAt = 0;
let inflight: Promise<number | null> | null = null;

export async function getCachedBcvRate(
  fetchRate: () => Promise<{ montoBs: number }>,
): Promise<number | null> {
  if (cachedRate !== null && Date.now() - cachedAt < TTL_MS) {
    return cachedRate;
  }
  if (inflight) return inflight;

  inflight = fetchRate()
    .then((t) => {
      cachedRate = t.montoBs;
      cachedAt = Date.now();
      return cachedRate;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function invalidateBcvCache() {
  cachedRate = null;
  cachedAt = 0;
}
