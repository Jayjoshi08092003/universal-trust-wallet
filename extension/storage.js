export class StorageManager {
  static async getLocal(key) {
    return new Promise(resolve => {
      chrome.storage.local.get([key], result => resolve(result[key] || null));
    });
  }

  static async setLocal(key, val) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [key]: val }, resolve);
    });
  }

  static async getSession(key) {
    return new Promise(resolve => {
      chrome.storage.session.get([key], result => resolve(result[key] || null));
    });
  }

  static async setSession(key, val) {
    return new Promise(resolve => {
      chrome.storage.session.set({ [key]: val }, resolve);
    });
  }
}