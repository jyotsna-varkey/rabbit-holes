import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS helper shared with the fetch script
import { makeGet } from '../../scripts/http.mjs';

// The fetch script's requests (PLAN step 39): a dropped connection used to
// crash the whole run ("TypeError: fetch failed", read ETIMEDOUT, DNS lookup
// failures), because only HTTP error statuses were retried.
const noSleep = async () => {};
const ok = (body: string) => new Response(body, { status: 200 });

describe('fetch script requests', () => {
  it('retries when the connection drops, then succeeds', async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls++;
      if (calls < 3) throw new TypeError('fetch failed', { cause: new Error('read ETIMEDOUT') });
      return ok('{"a":1}');
    };
    const get = makeGet({ fetchImpl, sleep: noSleep });
    expect(await get('https://example.org/x')).toEqual({ a: 1 });
    expect(calls).toBe(3);
  });

  it('retries when the body is cut off mid-download', async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls++;
      if (calls === 1) return { ok: true, status: 200, headers: new Headers(), text: async () => { throw new TypeError('terminated'); } };
      return ok('hello');
    };
    const get = makeGet({ fetchImpl, sleep: noSleep });
    expect(await get('https://example.org/x', 'text')).toBe('hello');
    expect(calls).toBe(2);
  });

  it('still retries rate limits and server errors', async () => {
    const statuses = [429, 503, 200];
    const fetchImpl = async () => {
      const s = statuses.shift()!;
      return s === 200 ? ok('"done"') : new Response('', { status: s });
    };
    expect(await makeGet({ fetchImpl, sleep: noSleep })('https://example.org/x')).toBe('done');
  });

  it('does not retry a missing page', async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls++;
      return new Response('', { status: 404 });
    };
    await expect(makeGet({ fetchImpl, sleep: noSleep })('https://example.org/x')).rejects.toThrow('404');
    expect(calls).toBe(1);
  });

  it('gives up after repeated failures', async () => {
    const fetchImpl = async () => {
      throw new TypeError('fetch failed');
    };
    await expect(makeGet({ fetchImpl, sleep: noSleep, attempts: 4 })('https://example.org/x')).rejects.toThrow(/gave up/);
  });
});
