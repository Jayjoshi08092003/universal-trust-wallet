/**
 * background.js — Universal Trust Wallet service worker
 *
 * All cross-origin network requests are made here, not in content.js.
 * A fetch() issued directly from a content script runs subject to the
 * *hosting page's* CORS policy, not the extension's granted
 * host_permissions — so a content script fetch to an arbitrary
 * institution's .well-known/*.bin endpoint would be blocked in
 * production even though the manifest lists the right host permission.
 * Routing through this service worker (an extension-privileged context)
 * is what actually makes the host_permissions grant meaningful.
 */

const MASTER_LEDGER_BASE = "https://universal-trust-wallet.github.io/registry";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

async function cachedFetchJSON(cacheKey, url) {
  const stored = await chrome.storage.local.get(cacheKey);
  const entry = stored[cacheKey];
  const now = Date.now();
  if (entry && now - entry.fetchedAt < CACHE_TTL_MS) {
    return entry.data;
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Fetch failed for ${url}: HTTP ${res.status}`);
  }
  const data = await res.json();
  await chrome.storage.local.set({ [cacheKey]: { data, fetchedAt: now } });
  return data;
}

async function fetchBinary(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Fetch failed for ${url}: HTTP ${res.status}`);
  }
  const buffer = await res.arrayBuffer();
  // Plain arrays survive structured-clone across the message channel cleanly.
  return Array.from(new Uint8Array(buffer));
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      switch (message?.type) {
        case "GET_LEDGER": {
          const data = await cachedFetchJSON("utw_ledger", `${MASTER_LEDGER_BASE}/ledger.json`);
          sendResponse({ ok: true, data });
          break;
        }
        case "GET_RULES": {
          const data = await cachedFetchJSON("utw_rules", `${MASTER_LEDGER_BASE}/rules.json`);
          sendResponse({ ok: true, data });
          break;
        }
        case "GET_BLOOM_FILTERS": {
          const domain = message.domain;
          if (!domain || typeof domain !== "string") {
            sendResponse({ ok: false, error: "Missing domain" });
            break;
          }
          const [alumniResult, activeResult] = await Promise.allSettled([
            fetchBinary(`https://${domain}/.well-known/verified-alumni.bin`),
            fetchBinary(`https://${domain}/.well-known/current-active.bin`)
          ]);
          sendResponse({
            ok: true,
            alumni: alumniResult.status === "fulfilled" ? alumniResult.value : null,
            active: activeResult.status === "fulfilled" ? activeResult.value : null
          });
          break;
        }
        default: {
          sendResponse({ ok: false, error: `Unknown message type: ${message?.type}` });
        }
      }
    } catch (err) {
      sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  })();
  return true; // keep the message channel open for the async sendResponse above
});
