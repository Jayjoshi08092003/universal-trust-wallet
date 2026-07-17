/**
 * bloom.js — Universal Trust Wallet
 *
 * Shared FNV-1a multi-salt bloom filter primitives. Loaded as a separate
 * content script, before content.js, in the same isolated world so its
 * functions are available without a bundler/module system.
 *
 * NOTE ON HASH CHOICE: FNV-1a is fast but is a *non-cryptographic* hash.
 * With only three fixed salts, an attacker who can guess or enumerate
 * candidate platform IDs (LinkedIn/GitHub member IDs are sequential and
 * easy to range-scan) can precompute bit positions for the entire ID
 * space and test membership directly against a published .bin file —
 * this recovers "is ID X a member" even though no names are stored.
 * Swapping FNV-1a for HMAC-SHA256 with a per-institution secret salt
 * (kept off the public repo, only the derived bits are published) would
 * close this gap while keeping the exact same bit-array wire format.
 * FNV-1a is implemented below because it was specified explicitly.
 */

function fnv1a32(input, seed) {
  let hash = (seed >>> 0) || 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function bloomBitPositions(platformId, salts, bloomBits) {
  return salts.map((salt) => {
    const h = fnv1a32(`${salt}:${platformId}`, 0x811c9dc5);
    return h % bloomBits;
  });
}

function bloomTestBit(bytes, bitIndex) {
  const byteIndex = bitIndex >> 3;
  const bitOffset = bitIndex & 7;
  if (byteIndex < 0 || byteIndex >= bytes.length) return false;
  return (bytes[byteIndex] & (1 << bitOffset)) !== 0;
}

function bloomContains(bytes, platformId, salts, bloomBits) {
  if (!bytes || bytes.length === 0) return false;
  if (!Array.isArray(salts) || salts.length !== 3) return false;
  if (!Number.isInteger(bloomBits) || bloomBits <= 0) return false;
  const positions = bloomBitPositions(platformId, salts, bloomBits);
  return positions.every((bit) => bloomTestBit(bytes, bit));
}

// Exposed for content.js, which runs in the same isolated world.
self.UTW_BLOOM = { fnv1a32, bloomBitPositions, bloomTestBit, bloomContains };
