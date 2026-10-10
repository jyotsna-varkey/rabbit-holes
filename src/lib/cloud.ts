// Optional sign-in, only to keep the shelf across devices (PLAN step 28).
// Supabase is loaded on demand: readers who never sign in never download it or
// contact it. The publishable key is meant to be public; row-level security in
// the database lets each reader read and write only their own shelf.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getShelf, setShelf, type ShelfEntry } from './storage';
import { mergeShelves } from './shelfSync';

const SUPABASE_URL = 'https://zqrfcmdhbdatrjooipif.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7-3afzNB6_STjqk6ila_HQ_mbJoC7Ut';

let clientPromise: Promise<SupabaseClient> | null = null;
function client() {
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_KEY, {
      // Implicit flow: the emailed link works even if it opens in a different browser.
      auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  );
  return clientPromise;
}

/** Whether this device might be signed in (a stored session, or arriving from a sign-in link). */
export function maybeSignedIn() {
  try {
    return (
      Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token')) ||
      /access_token=|error_description=/.test(location.hash)
    );
  } catch {
    return false;
  }
}

export async function sendSignInLink(email: string) {
  const { error } = await (await client()).auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${location.origin}/?shelf` },
  });
  if (error) throw error;
}

export async function signedInEmail(): Promise<string | null> {
  if (!maybeSignedIn()) return null;
  const { data } = await (await client()).auth.getSession();
  return data.session?.user.email ?? null;
}

export async function signOut() {
  await (await client()).auth.signOut();
  try {
    localStorage.removeItem('rh.syncedUser');
  } catch {
    // ignore
  }
}

async function saveRemote(c: SupabaseClient, userId: string, items: ShelfEntry[]) {
  const { error } = await c
    .from('shelves')
    .upsert({ user_id: userId, items, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/**
 * On opening the app while signed in. The first time on a device, its shelf and
 * the account's are merged (nothing lost); after that the account's shelf is the
 * truth, so a hole taken off on one device doesn't come back from another.
 */
export async function syncOnOpen() {
  if (!maybeSignedIn()) return;
  const c = await client();
  const { data } = await c.auth.getSession();
  const user = data.session?.user;
  if (location.hash.includes('access_token=')) history.replaceState(null, '', location.pathname + location.search);
  if (!user) return;
  const { data: row, error } = await c.from('shelves').select('items').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  const remote: unknown[] = Array.isArray(row?.items) ? row.items : [];
  let firstHere = true;
  try {
    firstHere = localStorage.getItem('rh.syncedUser') !== user.id;
  } catch {
    // ignore
  }
  const shelf = firstHere ? mergeShelves(getShelf(), remote) : mergeShelves(remote, []);
  setShelf(shelf, 'cloud');
  await saveRemote(c, user.id, shelf);
  try {
    localStorage.setItem('rh.syncedUser', user.id);
  } catch {
    // ignore
  }
}

/** After keeping or removing a hole while signed in. */
export async function pushShelf() {
  if (!maybeSignedIn()) return;
  const c = await client();
  const { data } = await c.auth.getSession();
  if (data.session) await saveRemote(c, data.session.user.id, getShelf());
}
