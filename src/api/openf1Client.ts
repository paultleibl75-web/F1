// ─── OpenF1 Rate-Limited Fetch Client ─────────────────────────────────────────
// Free tier: max 3 req/s, 30 req/min
// We enforce a 350ms minimum gap between requests (≈2.8 req/s)

const BASE_URL = 'https://api.openf1.org/v1';
const MIN_INTERVAL_MS = 2100; // Strictly pace at <30 req/minute to avoid HTTP 429

let lastRequestTime = 0;
let requestQueue: Array<() => void> = [];
let queueRunning = false;

function processQueue() {
  if (queueRunning || requestQueue.length === 0) return;
  queueRunning = true;
  const next = requestQueue.shift()!;
  const now = Date.now();
  const wait = Math.max(0, lastRequestTime + MIN_INTERVAL_MS - now);
  setTimeout(() => {
    lastRequestTime = Date.now();
    next();
    queueRunning = false;
    processQueue();
  }, wait);
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    requestQueue.push(() => {
      fn().then(resolve).catch(reject);
    });
    processQueue();
  });
}

async function _doFetch<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OpenF1 ${endpoint} → HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function fetchOpenF1<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  return enqueue(() => _doFetch<T>(endpoint, params));
}

// Fetch ALL pages by paginating with date_gt until we get < 1000 results
// OpenF1 returns up to 1000 rows per request
export async function fetchAllOpenF1<T extends { date: string }>(
  endpoint: string,
  baseParams: Record<string, string | number> = {},
  onProgress?: (count: number) => void
): Promise<T[]> {
  const results: T[] = [];
  let lastDate: string | null = null;

  while (true) {
    const params: Record<string, string | number> = { ...baseParams };
    if (lastDate) params['date>'] = lastDate;

    const batch = await fetchOpenF1<T[]>(endpoint, params);
    if (!Array.isArray(batch) || batch.length === 0) break;

    results.push(...batch);
    onProgress?.(results.length);

    if (batch.length < 1000) break; // last page
    lastDate = batch[batch.length - 1].date;
  }

  return results;
}
