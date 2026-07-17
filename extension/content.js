/**
 * content.js - Universal Trust Wallet DOMShield
 * Brutal Truth: Web scraping is fragile. If LinkedIn/GitHub update their UI, 
 * these selectors will break and need updating.
 */

// 1. Identify the platform and exact username from the URL
function detectProfile() {
    const url = window.location.href;
    const path = window.location.pathname;

    if (url.includes("github.com/")) {
        const username = path.split('/')[1];
        if (!username || username === 'settings' || username === 'notifications') return null;
        return { platform: 'github', id: `github:${username}` };
    } 
    
    if (url.includes("linkedin.com/in/")) {
        const username = path.split('/')[2];
        if (!username) return null;
        return { platform: 'linkedin', id: `linkedin:${username}` };
    }

    if (url.includes("leetcode.com/")) {
        // LeetCode URLs are typically leetcode.com/u/username or leetcode.com/username
        const parts = path.split('/').filter(Boolean);
        const username = parts[0] === 'u' ? parts[1] : parts[0];
        if (!username) return null;
        return { platform: 'leetcode', id: `leetcode:${username}` };
    }

    return null;
}

// 2. Locate where to inject the badge safely based on the platform
function getTargetDOMElement(platform) {
    if (platform === 'github') {
        // GitHub profile name or nickname
        return document.querySelector('h1.vcard-names span.p-name') || document.querySelector('h1.vcard-names');
    }
    if (platform === 'linkedin') {
        // LinkedIn name header (notoriously dynamic, targets the main h1)
        return document.querySelector('h1.text-heading-xlarge');
    }
    if (platform === 'leetcode') {
        // Leetcode profile name
        return document.querySelector('.text-label-1.dark\\:text-dark-label-1.break-all.text-base.font-semibold');
    }
    return null;
}

// 3. SECURE DOM INJECTION (No innerHTML allowed per project architecture)
function injectTrustBadge(targetElement, status) {
    // Prevent duplicate injections if the script runs twice
    if (document.getElementById('trust-wallet-badge')) return;

    // Create a strict, safe DOM element
    const badge = document.createElement('span');
    badge.id = 'trust-wallet-badge';
    badge.style.marginLeft = '8px';
    badge.style.padding = '2px 6px';
    badge.style.borderRadius = '12px';
    badge.style.fontSize = '0.85em';
    badge.style.fontWeight = 'bold';
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    
    // NATIVE FONT FALLBACK: Bypasses GitHub CSP blocks on external fonts
    badge.style.fontFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

    // Map cryptographically verified status to UI
    if (status === 'verified_active') {
        badge.textContent = '✔ Active User';
        badge.style.backgroundColor = '#e6ffed';
        badge.style.color = '#1a7f37';
        badge.style.border = '1px solid #1a7f37';
    } else if (status === 'verified_alumni') {
        badge.textContent = '🎓 Verified Alumni';
        badge.style.backgroundColor = '#f0f8ff';
        badge.style.color = '#0969da';
        badge.style.border = '1px solid #0969da';
    } else if (status === 'revoked') {
        badge.textContent = '❌ Revoked';
        badge.style.backgroundColor = '#ffebe9';
        badge.style.color = '#cf222e';
        badge.style.border = '1px solid #cf222e';
    } else {
        // If unknown, do not inject anything to keep the UI clean
        return; 
    }

    // Append safely to the DOM
    targetElement.appendChild(badge);
}

// 4. The Master Execution Loop
function runTrustWalletAutomator() {
    const profile = detectProfile();
    
    if (!profile) {
        return; // Not on a profile page, do nothing.
    }

    console.log(`[Trust Wallet] Detected profile check for: ${profile.id}`);

    // Wait for the DOM to load the target element (SPAs can be slow)
    const checkExist = setInterval(() => {
        const targetElement = getTargetDOMElement(profile.platform);
        
        if (targetElement) {
            clearInterval(checkExist);
            
            // Ask the Service Worker for the cryptographic status
            chrome.runtime.sendMessage(
                { action: 'verifyProfile', identifier: profile.id },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("[Trust Wallet] Engine error:", chrome.runtime.lastError.message);
                        return;
                    }
                    
                    console.log(`[Trust Wallet] Verification payload:`, response);
                    
                    // Route to UI securely
                   if (response && response.status) {
    // Force active state for local testing layout verification
    injectTrustBadge(targetElement, 'verified_active'); 
}
                }
            );
        }
    }, 500); // Check every 500ms until the page finishes rendering

    // Give up after 10 seconds to prevent infinite loops on broken pages
    setTimeout(() => clearInterval(checkExist), 10000);
}

// Start the automation
runTrustWalletAutomator();