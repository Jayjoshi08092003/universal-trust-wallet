import { CONFIG } from './config.js';
import { NetworkManager } from './network.js';
import { BloomFilter } from './bloom.js';
import { StorageManager } from './storage.js';

class TrustEngine {
  static async initialize() {
    await this.syncData();
    chrome.alarms.create("syncData", { periodInMinutes: 60 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "syncData") this.syncData();
    });
  }

  static async syncData() {
    try {
      const [alumniBin, activeBin, revokedBin] = await Promise.all([
        NetworkManager.fetchSecure(CONFIG.ENDPOINTS.ALUMNI_BIN, 'bin'),
        NetworkManager.fetchSecure(CONFIG.ENDPOINTS.ACTIVE_BIN, 'bin'),
        NetworkManager.fetchSecure(CONFIG.ENDPOINTS.REVOKED_BIN, 'bin').catch(() => new Uint8Array(0)) 
      ]);

      // Moved to storage.local to bypass the 1MB storage.session quota limit
      await StorageManager.setLocal('filters', {
        alumni: Array.from(alumniBin),
        active: Array.from(activeBin),
        revoked: Array.from(revokedBin)
      });
      
    } catch (error) {
      console.error("Critical failure during sync.", error);
    }
  }

  static async verifyIdentity(identifier) {
    let filters = await StorageManager.getLocal('filters');
    
    // Lazy load fallback
    if (!filters) {
      await this.syncData();
      filters = await StorageManager.getLocal('filters');
      if (!filters) return { status: 'unknown', reason: 'filters_unavailable' };
    }

    const revokedFilter = new BloomFilter(new Uint8Array(filters.revoked));
    if (filters.revoked.length > 0 && await revokedFilter.test(identifier)) {
      return { status: 'revoked', reason: 'in_revocation_list' };
    }

    const activeFilter = new BloomFilter(new Uint8Array(filters.active));
    if (filters.active.length > 0 && await activeFilter.test(identifier)) {
      return { status: 'verified_active', reason: 'in_active_list' };
    }

    const alumniFilter = new BloomFilter(new Uint8Array(filters.alumni));
    if (filters.alumni.length > 0 && await alumniFilter.test(identifier)) {
      return { status: 'verified_alumni', reason: 'in_alumni_list' };
    }

    return { status: 'unknown', reason: 'not_found' };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'verifyProfile') {
    TrustEngine.verifyIdentity(request.identifier)
      .then(result => sendResponse(result))
      .catch(error => {
        console.error(error);
        sendResponse({ status: 'error' });
      });
    return true; 
  }
});

TrustEngine.initialize();