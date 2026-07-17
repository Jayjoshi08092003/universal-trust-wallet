import { CONFIG } from './config.js';
import { CryptoModule } from './crypto.js';
import { StorageManager } from './storage.js';

export class NetworkManager {
  static pendingRequests = new Map();

  static async fetchSecure(url, type = 'json') {
    if (this.pendingRequests.has(url)) {
      return this.pendingRequests.get(url);
    }

    const promise = this._executeFetchWithRetry(url, type)
      .finally(() => this.pendingRequests.delete(url));
      
    this.pendingRequests.set(url, promise);
    return promise;
  }

  static async _executeFetchWithRetry(url, type, retries = 3) {
    const cacheKey = `cache_${url}`;
    const cachedEntry = await StorageManager.getLocal(cacheKey);
    const headers = new Headers();

    if (cachedEntry && cachedEntry.etag) {
      headers.append('If-None-Match', cachedEntry.etag);
    }
    if (cachedEntry && cachedEntry.lastModified) {
      headers.append('If-Modified-Since', cachedEntry.lastModified);
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.status === 304 && cachedEntry) {
          return cachedEntry.data;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rawData = type === 'json' ? await response.text() : await response.arrayBuffer();
        const buffer = type === 'json' ? new TextEncoder().encode(rawData) : new Uint8Array(rawData);
        
        // Fetch Signature
        const sigResponse = await fetch(`${url}.sig`);
        if (!sigResponse.ok) throw new Error('Signature file not found');
        const signatureHex = (await sigResponse.text()).trim();

        // Verify Signature
        const isValid = await CryptoModule.verifySignature(buffer, signatureHex);
        if (!isValid) {
          console.error(`Signature verification failed for ${url}. Rejecting payload.`);
          if (cachedEntry) return cachedEntry.data; 
          throw new Error('Invalid signature');
        }

        const finalData = type === 'json' ? JSON.parse(rawData) : buffer;
        
        // Schema Check
        if (type === 'json' && finalData.schemaVersion !== CONFIG.SCHEMA_VERSION) {
           throw new Error(`Unsupported schema version: ${finalData.schemaVersion}`);
        }

        // Cache update
        await StorageManager.setLocal(cacheKey, {
          etag: response.headers.get('ETag'),
          lastModified: response.headers.get('Last-Modified'),
          timestamp: Date.now(),
          data: finalData
        });

        return finalData;

      } catch (error) {
        clearTimeout(timeoutId);
        if (attempt === retries - 1) {
          console.warn(`Fetch failed for ${url}, falling back to cache.`, error);
          if (cachedEntry) return cachedEntry.data;
          throw error;
        }
        
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
}