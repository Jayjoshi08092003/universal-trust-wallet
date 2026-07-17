# Enterprise Security Architecture

## Threat Model
1. **Malicious File Substitution**: Mitigated via Ed25519 digital signatures. Files hosted on GitHub Pages (`.bin`, `.json`) require a valid `.sig` file. The public key is hardcoded within the extension. Invalid payloads are rejected instantly and fallback to last-known-good local cache.
2. **Reverse Engineering Identifier Lists**: Mitigated via HMAC-SHA-256 Bloom filters. The institution secret ensures dictionary attacks against the Bloom filter are computationally infeasible without the secret key.
3. **Cross-Site Scripting (XSS)**: Mitigated by replacing `innerHTML` with safe DOM instantiation (`document.createElement`) and enforcing a strict Manifest V3 Content Security Policy.
4. **Data Tampering via Cache**: State is serialized into `chrome.storage.local` after verification. `chrome.storage.session` restricts ephemeral state from local persistence.