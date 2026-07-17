# Universal Trust Wallet

Browser extension + admin dashboard for verifying academic/employment claims on
LinkedIn, GitHub, and LeetCode against institution-published, anonymized bloom
filters — no central database, no API server, no names ever transmitted.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Chrome MV3 manifest |
| `bloom.js` | Shared FNV-1a multi-salt bloom filter math (loaded before `content.js`) |
| `content.js` | Scans profile pages, extracts platform ID, checks bloom filters, injects badges |
| `background.js` | Service worker that performs the actual cross-origin fetches (see caveat below) |
| `dashboard.html` | Self-contained registrar/HR admin tool — compiles `.bin` files |
| `sample-ledger.json`, `sample-rules.json` | Format reference for what your master repo's `ledger.json`/`rules.json` should look like |
| `icons/` | Toolbar icons |

## Setup

1. Host `ledger.json` and `rules.json` at a GitHub Pages repo, matching the
   `sample-*.json` formats. Update `MASTER_LEDGER_BASE` in `background.js` to
   point at that repo.
2. Each participating institution runs `dashboard.html` locally (open the file
   directly in a browser — nothing is sent over the network by the dashboard
   itself), enters its three assigned salts and bloom filter size, adds
   SSO-verified records, and downloads `verified-alumni.bin` +
   `current-active.bin`.
3. The institution uploads both `.bin` files to its own static web server at
   `/.well-known/verified-alumni.bin` and `/.well-known/current-active.bin`.
4. Load the extension unpacked via `chrome://extensions` → Developer mode →
   Load unpacked.

## Two engineering caveats worth knowing before you ship this

**1. FNV-1a + 3 fixed salts is not brute-force resistant.**
The spec calls for FNV-1a specifically, and that's what's implemented, but
it's worth being explicit: FNV-1a is a fast *non-cryptographic* hash. Platform
member IDs on LinkedIn/GitHub are sequential and easy to range-scan, so
someone with the published `.bin` file and the (public, per-institution) salts
from `ledger.json` can precompute bit positions for every ID in a plausible
range and test membership directly — recovering "is ID 47281033 in this set?"
even though no names or strings are stored. If stronger resistance matters,
swap FNV-1a for HMAC-SHA256 with a secret per-institution key that never
leaves the compiling institution's dashboard (only the resulting bits are
published); the wire format of the `.bin` files doesn't need to change at all.

**2. Bloom filters leak membership by design, not just to attackers who crack the hash.**
Anyone — not just attackers — can compute the three bit positions for *any*
ID and check them against the public `.bin` file. That's the intended
verification mechanism, but it also means the file itself supports offline
enumeration: given enough guesses across an ID range, a third party can build
a full membership map without ever visiting LinkedIn. Rotating salts
periodically and keeping `bloomBits` generous relative to institution size
(current default: ~12 bits/entry, ~1-3% false-positive rate at k=3) limits
false positives but doesn't change this fundamental property of bloom filters.
Both points are typical bloom-filter tradeoffs, not implementation bugs — but
they're worth stating plainly to institutions before they publish real data,
even anonymized.

## Why there's a `background.js` you didn't ask for

`content.js` can't reliably `fetch()` an arbitrary institution's
`.well-known/*.bin` files itself — a fetch issued from a content script runs
under the *hosting page's* CORS policy (linkedin.com's, github.com's, etc.),
not the extension's. The `host_permissions` in `manifest.json` only bypass
CORS for fetches made from extension-privileged contexts, like a service
worker. `background.js` does the actual fetching and `content.js` talks to it
over `chrome.runtime.sendMessage`. Without this, the extension would appear to
work in a quick local test (some pages loosely permit cross-origin fetch) and
then fail unpredictably on the real sites in production.
