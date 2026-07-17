import { CONFIG } from './config.js';

export class CryptoModule {
  static async getPublicKey() {
    const binaryDerString = atob(CONFIG.PUBLIC_KEY_B64);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i);
    }
    
    return await crypto.subtle.importKey(
      'spki',
      binaryDer.buffer,
      { name: 'Ed25519' },
      false,
      ['verify']
    );
  }

  static async verifySignature(data, signatureHex) {
    if (!signatureHex || typeof signatureHex !== 'string') return false;
    
    try {
      const pubKey = await this.getPublicKey();
      const sigBytes = new Uint8Array(signatureHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      return await crypto.subtle.verify('Ed25519', pubKey, sigBytes, data);
    } catch (e) {
      console.error('Signature verification threw an exception', e);
      return false;
    }
  }

  static async getHmacKey() {
    const enc = new TextEncoder();
    return await crypto.subtle.importKey(
      'raw',
      enc.encode(CONFIG.INSTITUTION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
  }

  static async generateBloomIndexes(identifier) {
    const key = await this.getHmacKey();
    const enc = new TextEncoder();
    const signature = await crypto.subtle.sign('HMAC', key, enc.encode(identifier));
    
    const hashArray = new Uint32Array(signature);
    const indexes = [];
    
    // Use the 32-byte hash to extract up to 8 distinct 32-bit integers
    for (let i = 0; i < Math.min(CONFIG.BLOOM.HASH_COUNT, hashArray.length); i++) {
      indexes.push(hashArray[i] % CONFIG.BLOOM.SIZE_BITS);
    }
    return indexes;
  }
}