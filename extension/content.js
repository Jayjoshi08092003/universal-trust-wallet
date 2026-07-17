class DOMShield {
  static createBadge(statusData) {
    const container = document.createElement('div');
    container.className = 'utw-verification-badge';
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.marginLeft = '8px';
    container.style.padding = '2px 8px';
    container.style.borderRadius = '12px';
    container.style.fontSize = '12px';
    container.style.fontWeight = 'bold';
    container.style.fontFamily = 'system-ui, sans-serif';
    container.setAttribute('data-utw-injected', 'true');

    const icon = document.createElement('span');
    icon.style.marginRight = '4px';

    const text = document.createElement('span');

    if (statusData.status === 'verified_active') {
      container.style.backgroundColor = '#e6f4ea';
      container.style.color = '#137333';
      icon.textContent = '✓';
      text.textContent = 'Verified Active';
    } else if (statusData.status === 'verified_alumni') {
      container.style.backgroundColor = '#e8f0fe';
      container.style.color = '#1967d2';
      icon.textContent = '✓';
      text.textContent = 'Verified Alumni';
    } else if (statusData.status === 'revoked') {
      container.style.backgroundColor = '#fce8e6';
      container.style.color = '#c5221f';
      icon.textContent = '⚠';
      text.textContent = 'Revoked';
    } else {
      return null;
    }

    container.appendChild(icon);
    container.appendChild(text);
    return container;
  }
}

class IdentityExtractor {
  static getLinkedInID() {
    const match = window.location.pathname.match(/^\/in\/([^/]+)/);
    return match ? `linkedin:${match[1]}` : null;
  }

  static getGitHubID() {
    const match = window.location.pathname.match(/^\/([^/]+)/);
    // Exclude reserved paths
    const reserved = ['pulls', 'issues', 'marketplace', 'explore', 'notifications'];
    return (match && !reserved.includes(match[1])) ? `github:${match[1]}` : null;
  }
  
  static getLeetCodeID() {
     const match = window.location.pathname.match(/^\/u\/([^/]+)/) || window.location.pathname.match(/^\/([^/]+)\/?$/);
     const reserved = ['problems', 'discuss', 'contest', 'store'];
     return (match && !reserved.includes(match[1])) ? `leetcode:${match[1]}` : null;
  }

  static extract() {
    const host = window.location.hostname;
    if (host.includes('linkedin.com')) return this.getLinkedInID();
    if (host.includes('github.com')) return this.getGitHubID();
    if (host.includes('leetcode.com')) return this.getLeetCodeID();
    return null;
  }
}

class PageObserver {
  constructor() {
    this.observer = null;
    this.pendingUrl = null;
    this.verificationInProgress = false;
  }

  async verifyAndInject() {
    if (this.verificationInProgress) return;
    
    const targetElement = document.querySelector('h1'); 
    if (!targetElement) return;
    
    if (targetElement.parentNode.querySelector('[data-utw-injected="true"]')) {
      return; 
    }

    const identifier = IdentityExtractor.extract();
    if (!identifier) return;

    this.verificationInProgress = true;

    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'verifyProfile', identifier }, resolve);
      });

      if (response && response.status !== 'unknown' && response.status !== 'error') {
        const badge = DOMShield.createBadge(response);
        if (badge && !targetElement.parentNode.querySelector('[data-utw-injected="true"]')) {
            targetElement.parentNode.insertBefore(badge, targetElement.nextSibling);
        }
      }
    } finally {
      this.verificationInProgress = false;
    }
  }

  start() {
    this.verifyAndInject();

    let debounceTimer;
    this.observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const reqCallback = window.requestIdleCallback || window.setTimeout;
        reqCallback(() => {
          if (window.location.href !== this.pendingUrl) {
            this.pendingUrl = window.location.href;
            this.verifyAndInject();
          } else {
             // Retest injection if DOM reconstructed
             this.verifyAndInject();
          }
        }, { timeout: 1000 });
      }, 250);
    });

    this.observer.observe(document.body, { childList: true, subtree: true });
  }
}

const pageObserver = new PageObserver();
pageObserver.start();