const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH || 'private.pem';

if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error("Critical: private.pem not found. Run keygen.js first.");
    process.exit(1);
}

const privateKeyStr = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
const privateKey = crypto.createPrivateKey(privateKeyStr);

const targetFiles = [
    'docs/verified-alumni.bin',
    'docs/current-active.bin',
    'docs/revoked.bin',
    'docs/ledger.json',
    'docs/rules.json'
];

for (const filepath of targetFiles) {
    if (!fs.existsSync(filepath)) {
        console.warn(`Warning: Target file missing, skipping: ${filepath}`);
        continue;
    }

    const data = fs.readFileSync(filepath);
    const signature = crypto.sign(null, data, privateKey);
    
    const sigPath = `${filepath}.sig`;
    fs.writeFileSync(sigPath, signature.toString('hex'));
    console.log(`Signed: ${filepath} -> ${sigPath}`);
}