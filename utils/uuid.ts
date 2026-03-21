/**
 * generateUUID — cross-environment UUID v4 helper.
 *
 * React Native's Hermes engine does not expose the Web Crypto API (`crypto`
 * global) in all versions, so `crypto.randomUUID()` throws
 * "Property 'crypto' doesn't exist" at runtime.
 *
 * This helper tries `crypto.randomUUID()` first (fastest, available on modern
 * Hermes / Expo SDK 49+), then falls back to an RFC 4122 v4 UUID built from
 * `Math.random()` — sufficient for local IDs that only need to be unique within
 * a single device session.
 */
export function generateUUID(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof (crypto as Crypto).randomUUID === 'function'
  ) {
    return (crypto as Crypto).randomUUID();
  }
  // Fallback: RFC 4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
