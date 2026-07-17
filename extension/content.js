/**
 * content.js — Universal Trust Wallet cross-platform verification engine
 *
 * Runs on LinkedIn, GitHub, and LeetCode profile/company pages. Looks up
 * the organization on the master ledger, extracts the viewer's permanent
 * platform member ID per rules.json, and checks that ID against the
 * organization's two published bloom filters (fetched via background.js,
 * see the CORS note there). Fails silently on any missing file, network
 * error, or unmatched selector so a broken/unverified page is never
 * treated as a false positive.
 */

(() => {
  const HOSTNAME = window.location.hostname.replace(/^www\./, "");

  function sendMessage(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => resolve(response));
      } catch (_err) {
        resolve(null);
      }
    });
  }

  function resolveHostKey(hostname) {
    if (hostname.endsWith("linkedin.com")) return "linkedin.com";
    if (hostname.endsWith("github.com")) return "github.com";
    if (hostname.endsWith("leetcode.com")) return "leetcode.com";
    return null;
  }

  function normalizeText(text) {
    return (text || "").trim().toLowerCase();
  }

  /**
   * Resolves which ledger domain (if any) an organization-name element on
   * the page refers to. Prefers a same-card link to the org's own site;
   * falls back to matching visible display name text against the ledger.
   */
  function findLedgerDomainForElement(el, ledger) {
    const link = el.closest("a[href]") || el.parentElement?.querySelector("a[href]");
    if (link) {
      try {
        const url = new URL(link.href, window.location.href);
        const host = url.hostname.replace(/^www\./, "");
        if (ledger[host]) return host;
      } catch (_err) {
        // malformed or relative href — fall through to text matching
      }
    }
    const text = normalizeText(el.textContent);
    if (!text) return null;
    for (const [domain, entry] of Object.entries(ledger)) {
      if (entry.displayName && normalizeText(entry.displayName) === text) {
        return domain;
      }
    }
    return null;
  }

  /**
   * Extracts the viewer's permanent numerical platform member ID using
   * the strategy declared for this host in rules.json, so no single
   * platform's markup/DOM quirks are hardcoded here.
   */
  function extractPlatformId(rule) {
    try {
      if (!rule || !rule.idSource) return null;

      if (rule.idSource === "attribute" && rule.idSelector && rule.idAttribute) {
        const el = document.querySelector(rule.idSelector);
        const val = el ? el.getAttribute(rule.idAttribute) : null;
        return val ? val.trim() : null;
      }

      if (rule.idSource === "metaTag" && rule.idSelector) {
        const el = document.querySelector(rule.idSelector);
        const val = el ? el.getAttribute("content") : null;
        return val ? val.trim() : null;
      }

      if (rule.idSource === "globalPath" && rule.idGlobalPath) {
        const parts = rule.idGlobalPath.split(".");
        let cursor = window;
        for (const part of parts) {
          if (cursor == null) return null;
          cursor = cursor[part];
        }
        return cursor != null ? String(cursor).trim() : null;
      }
    } catch (_err) {
      return null;
    }
    return null;
  }

  function injectBadge(el, tier) {
    if (el.dataset.utwBadged === "1") return;
    el.dataset.utwBadged = "1";

    const badge = document.createElement("span");
    badge.setAttribute("role", "img");
    badge.setAttribute(
      "aria-label",
      tier === "active" ? "Verified by Universal Trust Wallet: currently active" : "Verified by Universal Trust Wallet: permanent record"
    );
    badge.title =
      tier === "active"
        ? "Universal Trust Wallet: verified active student/employee"
        : "Universal Trust Wallet: verified alumnus/former employee";

    Object.assign(badge.style, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "15px",
      height: "15px",
      marginLeft: "4px",
      borderRadius: "50%",
      fontSize: "10px",
      lineHeight: "1",
      color: "#ffffff",
      background: tier === "active" ? "#1a73e8" : "#1a9d4b",
      verticalAlign: "middle"
    });
    badge.textContent = "\u2713"; // check mark
    el.appendChild(badge);
  }

  async function verifyElement(el, ledger, rule) {
    const domain = findLedgerDomainForElement(el, ledger);
    if (!domain) return;

    const entry = ledger[domain];
    if (!entry || !Array.isArray(entry.salts) || entry.salts.length !== 3 || !entry.bloomBits) {
      return; // malformed ledger entry — never trust a partial config
    }

    const platformId = extractPlatformId(rule);
    if (!platformId) return;

    const bloomResponse = await sendMessage({ type: "GET_BLOOM_FILTERS", domain });
    if (!bloomResponse || !bloomResponse.ok) return;

    const { bloomContains } = self.UTW_BLOOM;
    const activeBytes = bloomResponse.active ? new Uint8Array(bloomResponse.active) : null;
    const alumniBytes = bloomResponse.alumni ? new Uint8Array(bloomResponse.alumni) : null;

    if (activeBytes && bloomContains(activeBytes, platformId, entry.salts, entry.bloomBits)) {
      injectBadge(el, "active");
      return;
    }
    if (alumniBytes && bloomContains(alumniBytes, platformId, entry.salts, entry.bloomBits)) {
      injectBadge(el, "alumni");
    }
  }

  async function run() {
    const hostKey = resolveHostKey(HOSTNAME);
    if (!hostKey) return;

    const [ledgerResponse, rulesResponse] = await Promise.all([
      sendMessage({ type: "GET_LEDGER" }),
      sendMessage({ type: "GET_RULES" })
    ]);
    if (!ledgerResponse?.ok || !rulesResponse?.ok) return;

    const ledger = ledgerResponse.data || {};
    const rules = rulesResponse.data || {};
    const rule = rules[hostKey];
    if (!rule || !rule.orgNameSelector) return;

    const candidates = document.querySelectorAll(rule.orgNameSelector);
    for (const el of candidates) {
      verifyElement(el, ledger, rule).catch(() => {});
    }
  }

  run().catch(() => {});

  // LinkedIn/GitHub/LeetCode are client-rendered SPAs — re-scan on
  // in-page navigations that don't trigger a full document reload.
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      run().catch(() => {});
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
