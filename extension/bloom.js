import { CryptoModule } from './crypto.js';

export class BloomFilter {
  constructor(bitArray) {
    if (!(bitArray instanceof Uint8Array)) {
      throw new Error('Bloom filter requires a Uint8Array');
    }
    this.bitArray = bitArray;
  }

  async test(identifier) {
    const indexes = await CryptoModule.generateBloomIndexes(identifier);
    for (const index of indexes) {
      const bytePos = Math.floor(index / 8);
      const bitPos = index % 8;
      if (bytePos >= this.bitArray.length) continue;
      
      if ((this.bitArray[bytePos] & (1 << bitPos)) === 0) {
        return false;
      }
    }
    return true;
  }

  static createEmpty(sizeBits) {
    const sizeBytes = Math.ceil(sizeBits / 8);
    return new BloomFilter(new Uint8Array(sizeBytes));
  }

  async add(identifier) {
    const indexes = await CryptoModule.generateBloomIndexes(identifier);
    for (const index of indexes) {
      const bytePos = Math.floor(index / 8);
      const bitPos = index % 8;
      if (bytePos < this.bitArray.length) {
        this.bitArray[bytePos] |= (1 << bitPos);
      }
    }
  }
}