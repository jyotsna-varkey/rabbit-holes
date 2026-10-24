// Requests for the fetch script, with retries. Wikimedia sometimes answers
// 429 or 5xx, and home networks drop connections (read ETIMEDOUT, DNS lookup
// failures, a body cut off mid-download); all of those are retried with a
// growing wait. A real "no" (e.g. 404) fails at once.

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * get(url, as = 'json' | 'text' | 'bytes'). `fetchImpl` and `sleep` are
 * injectable for tests.
 */
export function makeGet({ ua = '', fetchImpl = fetch, sleep = pause, attempts = 8 } = {}) {
  return async function get(url, as = 'json') {
    let last;
    for (let attempt = 0; attempt < attempts; attempt++) {
      await sleep(300);
      let res;
      try {
        res = await fetchImpl(url, { headers: { 'User-Agent': ua, 'Api-User-Agent': ua } });
        if (res.ok) {
          return as === 'json' ? JSON.parse(await res.text()) : as === 'text' ? await res.text() : Buffer.from(await res.arrayBuffer());
        }
      } catch (err) {
        // Network trouble (or a body cut off): wait and try again.
        if (err instanceof SyntaxError) throw err; // a whole response that isn't JSON won't fix itself
        last = err;
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} ${url}`);
      last = new Error(`${res.status} ${url}`);
      const wait = Number(res.headers.get('retry-after')) || 2 * (attempt + 1);
      await sleep((wait + 1) * 1000);
    }
    throw new Error(`gave up on ${url} (${last?.cause?.code ?? last?.message ?? 'unknown'})`);
  };
}
