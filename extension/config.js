export const CONFIG = {
  SCHEMA_VERSION: 2,
  // Ed25519 Public Key (SPKI DER Base64 encoded) for verifying remote files.
  // Generate using the provided tools/keygen.js
  PUBLIC_KEY_B64: "MCowBQYDK2VwAyEAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX=", 
  INSTITUTION_SECRET: "utw-enterprise-v2-hmac-secret-key",
  ENDPOINTS: {
    RULES: "https://your-org.github.io/universal-trust-wallet/rules.json",
    LEDGER: "https://your-org.github.io/universal-trust-wallet/ledger.json",
    ALUMNI_BIN: "https://your-org.github.io/universal-trust-wallet/verified-alumni.bin",
    ACTIVE_BIN: "https://your-org.github.io/universal-trust-wallet/current-active.bin",
    REVOKED_BIN: "https://your-org.github.io/universal-trust-wallet/revoked.bin"
  },
  BLOOM: {
    HASH_COUNT: 5,
    SIZE_BITS: 1048576 // 1MB filter
  },
  CACHE: {
    MAX_AGE_MS: 3600000 // 1 hour
  }
};