import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Where the Supabase session lives.
 *
 * It was AsyncStorage, which on both platforms is an unencrypted file in the
 * app's sandbox. That file holds a refresh token, and a refresh token is a
 * bearer credential for the account until it is revoked — anyone who can read
 * app storage (a rooted or jailbroken device, an unencrypted device backup, a
 * malicious app exploiting a sandbox escape) can mint fresh access tokens from
 * it indefinitely. The vault master key was already held in the OS keystore for
 * exactly this reason; the credential that reaches the same data over the
 * network was not.
 *
 * ## Why chunking
 *
 * expo-secure-store is backed by the iOS keychain and Android's
 * EncryptedSharedPreferences, and warns above 2048 bytes — the platform limits
 * are real and the failure above them is a silent write on some Android
 * builds, which would look like "signed out at random". A Supabase session is
 * routinely larger than that: it carries two JWTs and the whole user object. So
 * a value is split, each piece stored under its own key, and a small manifest
 * records how many pieces there are.
 *
 * ## Why the AsyncStorage fallback stays
 *
 * Web has no SecureStore, and a build where the native module is missing must
 * degrade to a working (if less protected) session rather than an app nobody
 * can sign in to. `isAvailable` decides once, at module load.
 */

/** Comfortably inside the 2048-byte warning threshold once UTF-8 expansion and
 * the key name are accounted for. */
const CHUNK_SIZE = 1536;

/** SecureStore keys must match [A-Za-z0-9._-]; Supabase's are already of that
 * shape, but a caller's need not be. */
function sanitize(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

const manifestKey = (key: string) => `${sanitize(key)}.meta`;
const chunkKey = (key: string, index: number) => `${sanitize(key)}.${index}`;

/** SecureStore is unavailable on web and in any build without the native
 * module. Resolved once — the answer cannot change at runtime. */
const usingSecureStore = Platform.OS !== 'web';

async function readChunked(key: string): Promise<string | null> {
  const manifest = await SecureStore.getItemAsync(manifestKey(key));
  if (!manifest) return null;
  const count = Number(manifest);
  if (!Number.isInteger(count) || count < 1) return null;

  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i));
    // A missing piece means a partial write or a partial wipe. Half a session
    // is not a session: report nothing and let the caller sign in again,
    // rather than hand Supabase a truncated JSON blob to choke on.
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join('');
}

async function clearChunked(key: string): Promise<void> {
  const manifest = await SecureStore.getItemAsync(manifestKey(key));
  const count = manifest ? Number(manifest) : 0;
  for (let i = 0; i < count; i += 1) {
    await SecureStore.deleteItemAsync(chunkKey(key, i));
  }
  await SecureStore.deleteItemAsync(manifestKey(key));
}

async function writeChunked(key: string, value: string): Promise<void> {
  // Clear first: a shorter value would otherwise leave the tail of the previous
  // one behind, and the manifest would disagree with what is actually stored.
  await clearChunked(key);

  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  for (const [index, chunk] of chunks.entries()) {
    await SecureStore.setItemAsync(chunkKey(key, index), chunk);
  }
  await SecureStore.setItemAsync(manifestKey(key), String(chunks.length));
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!usingSecureStore) return AsyncStorage.getItem(key);

    const stored = await readChunked(key);
    if (stored !== null) return stored;

    // One-time migration off the old location. Without this every existing
    // install is signed out by the upgrade, which is a bad way to ship a
    // security improvement — people read a forced logout as a breach.
    const legacy = await AsyncStorage.getItem(key);
    if (legacy === null) return null;
    await writeChunked(key, legacy);
    await AsyncStorage.removeItem(key);
    return legacy;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!usingSecureStore) return AsyncStorage.setItem(key, value);
    await writeChunked(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (!usingSecureStore) return AsyncStorage.removeItem(key);
    await clearChunked(key);
    // The legacy copy too, in case a sign-out is the first thing that happens
    // after an upgrade and getItem never ran.
    await AsyncStorage.removeItem(key);
  },
};
