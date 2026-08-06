import * as SecureStore from 'expo-secure-store';

import {
  DEFAULT_PBKDF2_ITERATIONS,
  decryptBytes,
  deriveKek,
  encryptBytes,
  fromBase64,
  generateMasterKey,
  randomBytes,
  toBase64,
} from '@/features/private/services/vault-crypto';

/**
 * Setting up, opening and changing the private space's keys.
 *
 * Everything persisted here goes to SecureStore rather than AsyncStorage, and
 * that is the load-bearing decision. AsyncStorage is a plaintext file: it rides
 * along in an ADB backup and is readable on a rooted device, which would hand
 * an attacker the wrapped key to grind offline at their leisure. SecureStore
 * keeps it in the iOS Keychain / Android Keystore behind the device passcode,
 * so the offline attack does not start.
 *
 * ⚠️  A copy of the master key may also be escrowed to the operator — see
 * vault-escrow.ts. Nothing in this file uploads anything, but "the key never
 * leaves the device" stopped being true the moment escrow was configured, and
 * a reader of this file should not be left believing otherwise.
 *
 * Two spaces, one mechanism
 * -------------------------
 * A real PIN and a decoy PIN each wrap a *different* random master key. Both
 * wrapped blobs sit side by side and are indistinguishable — uniform random
 * bytes of identical length. Unlocking tries each in turn and takes whichever
 * opens.
 *
 * This is why the decoy holds up: it is not a UI that hides rows. Content
 * written in the real space is encrypted under the real key and genuinely
 * cannot be opened with the decoy key, so a decoy unlock shows an empty space
 * because the space *is* empty, and nothing on the device says otherwise.
 * Anything written while in decoy mode is real data in the decoy space, which
 * is what makes it look lived-in rather than staged.
 */

const SALT_KEY = 'lifeos.vault.salt';
const REAL_KEY = 'lifeos.vault.wrapped';
const DECOY_KEY = 'lifeos.vault.wrapped.alt';
const ATTEMPTS_KEY = 'lifeos.vault.attempts';

/** Short enough to be memorable, long enough that throttling can outlast a
 * person with the phone in their hand. */
export const MIN_PIN_LENGTH = 6;

export type VaultSpace = 'real' | 'decoy';

export type UnlockResult =
  | { ok: true; space: VaultSpace; key: Uint8Array }
  | { ok: false; reason: 'wrong-pin' | 'not-set-up' | 'throttled'; retryInMs?: number };

async function readItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

/**
 * How a vault's KEK was derived. Stored beside the wrapped key, because the
 * derivation cost is an input to the key: reproduce it with a different
 * iteration count and you get different bytes, the unwrap fails, and the user
 * is told their correct PIN is wrong.
 *
 * Vaults created before this existed stored a bare base64 salt with no params,
 * so `readParams` treats that shape as the cost in force at the time. Dropping
 * that fallback would lock every one of those vaults shut permanently.
 */
type KdfParams = { salt: Uint8Array; iterations: number };

/** The cost every pre-params vault was created with. Never change this — it is
 *  a historical fact about existing installs, not a tunable. */
const LEGACY_ITERATIONS = 120_000;

async function readParams(): Promise<KdfParams | null> {
  const raw = await readItem(SALT_KEY);
  if (!raw) return null;

  // New shape: {"s":"<base64>","i":120000}
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { s?: string; i?: number };
      if (typeof parsed.s === 'string' && typeof parsed.i === 'number' && parsed.i > 0) {
        return { salt: fromBase64(parsed.s), iterations: parsed.i };
      }
    } catch {
      // Falls through to the legacy read below rather than failing the unlock:
      // a corrupted params record with an intact wrapped key is still worth
      // one attempt at the historical cost.
    }
  }
  return { salt: fromBase64(raw), iterations: LEGACY_ITERATIONS };
}

async function writeParams(params: KdfParams): Promise<void> {
  await writeItem(SALT_KEY, JSON.stringify({ s: toBase64(params.salt), i: params.iterations }));
}

async function writeItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, {
    // WHEN_UNLOCKED, not AFTER_FIRST_UNLOCK: the vault key should not be
    // reachable while the phone is sitting locked on a table.
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

export async function isVaultSetUp(): Promise<boolean> {
  return (await readItem(REAL_KEY)) !== null;
}

export async function hasDecoy(): Promise<boolean> {
  return (await readItem(DECOY_KEY)) !== null;
}

// --- attempt throttling -----------------------------------------------------

/**
 * Escalating delay after repeated wrong PINs — the actual defence against
 * somebody guessing a six-digit PIN with the unlocked phone in their hand.
 * Deliberately NOT a wipe-after-N: the person most likely to trip this is the
 * owner misremembering their own PIN, and destroying their data for it would
 * be a far worse bug than a slow retry.
 */
const THROTTLE_AFTER = 5;
const THROTTLE_STEP_MS = 30_000;
const THROTTLE_MAX_MS = 15 * 60_000;

type Attempts = { count: number; lastAt: number };

async function readAttempts(): Promise<Attempts> {
  const raw = await readItem(ATTEMPTS_KEY);
  if (!raw) return { count: 0, lastAt: 0 };
  try {
    return JSON.parse(raw) as Attempts;
  } catch {
    return { count: 0, lastAt: 0 };
  }
}

function penaltyMs(count: number): number {
  if (count < THROTTLE_AFTER) return 0;
  return Math.min(THROTTLE_MAX_MS, (count - THROTTLE_AFTER + 1) * THROTTLE_STEP_MS);
}

async function recordFailure(): Promise<void> {
  const attempts = await readAttempts();
  await writeItem(
    ATTEMPTS_KEY,
    JSON.stringify({ count: attempts.count + 1, lastAt: Date.now() } satisfies Attempts),
  );
}

async function clearFailures(): Promise<void> {
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY).catch(() => undefined);
}

// --- setup / unlock ---------------------------------------------------------

/** Creates the real space. Generates a fresh master key and wraps it under the
 * PIN; the key returned is the one to hold in memory for this session. */
export async function setUpVault(pin: string): Promise<Uint8Array> {
  const salt = randomBytes(16);
  const iterations = DEFAULT_PBKDF2_ITERATIONS;
  const kek = await deriveKek(pin, salt, iterations);
  const masterKey = generateMasterKey();

  // Params first. If the wrapped-key write fails, a params record with no
  // wrapped key reads as "not set up" and setup can simply be retried; the
  // reverse order would leave a wrapped key nothing can derive a KEK for.
  await writeParams({ salt, iterations });
  await writeItem(REAL_KEY, toBase64(encryptBytes(kek, masterKey)));
  await clearFailures();
  return masterKey;
}

/**
 * Adds the decoy space. Shares the salt (so the two derivations cost the same
 * and neither can be told apart by timing) but wraps an entirely separate
 * master key.
 */
export async function setUpDecoy(pin: string): Promise<void> {
  const params = await readParams();
  if (!params) throw new Error('vault not set up');
  const kek = await deriveKek(pin, params.salt, params.iterations);
  await writeItem(DECOY_KEY, toBase64(encryptBytes(kek, generateMasterKey())));
}

export async function removeDecoy(): Promise<void> {
  await SecureStore.deleteItemAsync(DECOY_KEY).catch(() => undefined);
}

/**
 * Tries a PIN against both spaces.
 *
 * Always attempts the decoy wrap too, even after the real one opens — a
 * short-circuit would make the real PIN measurably faster to check than a wrong
 * one, and timing is exactly the sort of side channel that undoes a decoy.
 */
export async function unlockVault(pin: string): Promise<UnlockResult> {
  const [params, realWrapped, decoyWrapped] = await Promise.all([
    readParams(),
    readItem(REAL_KEY),
    readItem(DECOY_KEY),
  ]);
  if (!params || !realWrapped) return { ok: false, reason: 'not-set-up' };

  const attempts = await readAttempts();
  const penalty = penaltyMs(attempts.count);
  const waited = Date.now() - attempts.lastAt;
  if (penalty > 0 && waited < penalty) {
    return { ok: false, reason: 'throttled', retryInMs: penalty - waited };
  }

  const kek = await deriveKek(pin, params.salt, params.iterations);

  let real: Uint8Array | null = null;
  try {
    real = decryptBytes(kek, fromBase64(realWrapped));
  } catch {
    real = null;
  }

  let decoy: Uint8Array | null = null;
  if (decoyWrapped) {
    try {
      decoy = decryptBytes(kek, fromBase64(decoyWrapped));
    } catch {
      decoy = null;
    }
  }

  if (real) {
    await clearFailures();
    return { ok: true, space: 'real', key: real };
  }
  if (decoy) {
    // Not counted as a success against the throttle in any visible way, and not
    // counted as a failure either — the decoy must behave exactly like the real
    // thing from the outside.
    await clearFailures();
    return { ok: true, space: 'decoy', key: decoy };
  }

  await recordFailure();
  return { ok: false, reason: 'wrong-pin' };
}

/**
 * Changes the PIN for the real space by re-wrapping the same master key, so
 * nothing already encrypted has to be touched. Requires the current PIN.
 */
export async function changePin(currentPin: string, nextPin: string): Promise<boolean> {
  const result = await unlockVault(currentPin);
  if (!result.ok || result.space !== 'real') return false;

  // Re-wrapping is the one moment the cost can be upgraded safely, because the
  // master key is in hand and everything is being rewritten anyway.
  const salt = randomBytes(16);
  const iterations = DEFAULT_PBKDF2_ITERATIONS;
  const kek = await deriveKek(nextPin, salt, iterations);
  await writeParams({ salt, iterations });
  await writeItem(REAL_KEY, toBase64(encryptBytes(kek, result.key)));

  // The decoy was wrapped under the old salt and is now unopenable; drop it
  // rather than leaving a blob that can never be unlocked again.
  await removeDecoy();
  await clearFailures();
  return true;
}

/**
 * Forgets every key.
 *
 * Note this does NOT remove the operator's escrowed copy — that lives on the
 * server (supabase/migrations/0015) and is deleted with the account, not with
 * the local keys. Destroying the space locally therefore makes the data
 * unreadable *to the user*, while anything already synced remains openable by
 * the operator until the account itself is deleted.
 */
export async function destroyVaultKeys(): Promise<void> {
  await Promise.all(
    [SALT_KEY, REAL_KEY, DECOY_KEY, ATTEMPTS_KEY].map((key) =>
      SecureStore.deleteItemAsync(key).catch(() => undefined),
    ),
  );
}
