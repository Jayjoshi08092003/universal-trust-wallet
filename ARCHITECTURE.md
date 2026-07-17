# System Architecture

* **Zero-Server Paradigm**: Relies entirely on static file hosting (GitHub pages). No backend database connections occur.
* **Network Deduplication Layer**: `NetworkManager` queues duplicate rapid background fetch calls to conserve bandwidth.
* **Fallback Mechanisms**: Utilizes HTTP `ETag` and `If-Modified-Since` alongside offline-aware caching.
* **Cryptography**: Utilizes WebCrypto APIs (`crypto.subtle`) directly in the Service Worker and Admin pages to prevent shipping large cryptographically dense libraries.