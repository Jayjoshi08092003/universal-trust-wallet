/**
 * content.js - Universal Trust Wallet DOMShield
 * TESTING MODE: This version forces the badge to render to verify UI placement.
 */

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
        const parts = path.split('/').filter(Boolean);
        const username = parts[0] === 'u' ? parts[1] : parts[0];
        if (!username) return null;
        return { platform: 'leetcode', id: `leetcode:${username}` };
    }

    return null;
}

function getTargetDOMElement(platform) {
    if (platform === 'github') {
        return document.querySelector('h1.vcard-names span.p-name') || document.querySelector('h1.vcard-names');
    }
    if (platform === 'linkedin') {
        return document.querySelector('h1.text-heading-xlarge');
    }
    if (platform === 'leetcode') {
        return document.querySelector('.text-label-1.dark\\:text-dark-label-1.break-all.text-base.font-semibold');
    }
    return null;
}

function injectTrustBadge(targetElement, status) {
    if (document.getElementById('trust-wallet-badge')) return;

    const badge = document.createElement('span');
    badge.id = 'trust-wallet-badge';
    badge.style.marginLeft = '8px';
    badge.style.padding = '2px 6px';
    badge.style.borderRadius = '12px';
    badge.style.fontSize = '0.85em';
    badge.style.fontWeight = 'bold';
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    
    // NATIVE FONT FALLBACK: No Google Fonts, completely bypasses CSP blocks
    badge.style.fontFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

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
        return; 
    }

    targetElement.appendChild(badge);
}

function runTrustWalletAutomator() {
    const profile = detectProfile();
    
    if (!profile) return;

    console.log(`[Trust Wallet] Detected profile check for: ${profile.id}`);

    const checkExist = setInterval(() => {
        const targetElement = getTargetDOMElement(profile.platform);
        
        if (targetElement) {
            clearInterval(checkExist);
            
            chrome.runtime.sendMessage(
                { action: 'verifyProfile', identifier: profile.id },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("[Trust Wallet] Engine error:", chrome.runtime.lastError.message);
                        return;
                    }
                    
                    console.log(`[Trust Wallet] Verification payload:`, response);
                    
                    // --- MOCK OVERRIDE ACTIVATED ---
                    // Forcing 'verified_active' to test the UI injection visually
                    injectTrustBadge(targetElement, 'verified_active');
                }
            );
        }
    }, 500);

    setTimeout(() => clearInterval(checkExist), 10000);
}

runTrustWalletAutomator();