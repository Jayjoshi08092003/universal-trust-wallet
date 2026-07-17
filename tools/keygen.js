const crypto = require('crypto');
const fs = require('fs');

console.log("Generating Ed25519 Keypair...");

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

// Export private key
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
fs.writeFileSync('private.pem', privPem);

// Export public key
const pubPem = publicKey.export({ type: 'spki', format: 'pem' });
fs.writeFileSync('public.pem', pubPem);

// Extract raw Base64 for the extension configuration
const pubDer = publicKey.export({ type: 'spki', format: 'der' });
console.log("\nCopy this string into your extension/config.js PUBLIC_KEY_B64:\n");
console.log(pubDer.toString('base64'));
console.log("\nKeys successfully written to private.pem and public.pem.");