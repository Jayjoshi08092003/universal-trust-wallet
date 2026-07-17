// A self-contained admin script that utilizes WebCrypto to generate the identical HMAC-SHA-256 Bloom indexes
const CONFIG = {
  INSTITUTION_SECRET: "utw-enterprise-v2-hmac-secret-key",
  BLOOM_SIZE_BITS: 1048576, // 1MB filter
  HASH_COUNT: 5
};

let importedRecords = new Set();
let duplicates = 0;

document.getElementById('csvFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('progress').textContent = 'Reading file...';
    const text = await file.text();
    
    document.getElementById('progress').textContent = 'Parsing & Deduplicating...';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    importedRecords.clear();
    duplicates = 0;

    for (const line of lines) {
        if (importedRecords.has(line)) {
            duplicates++;
        } else {
            importedRecords.add(line);
        }
    }

    document.getElementById('statRecords').textContent = importedRecords.size;
    document.getElementById('statDuplicates').textContent = duplicates;
    
    // FPR = (1 - e^(-k * n / m))^k
    const n = importedRecords.size;
    const m = CONFIG.BLOOM_SIZE_BITS;
    const k = CONFIG.HASH_COUNT;
    const fpr = Math.pow(1 - Math.exp(-k * n / m), k);
    document.getElementById('statFPR').textContent = (fpr * 100).toFixed(4) + '%';

    document.getElementById('btnGenerateAlumni').disabled = false;
    document.getElementById('btnGenerateActive').disabled = false;
    document.getElementById('btnGenerateRevoked').disabled = false;
    document.getElementById('progress').textContent = 'Ready to generate.';
});

async function getHmacKey() {
    const enc = new TextEncoder();
    return await crypto.subtle.importKey(
        'raw', enc.encode(CONFIG.INSTITUTION_SECRET),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
}

async function generateBloomFilter() {
    document.getElementById('progress').textContent = 'Generating cryptography indexes...';
    const key = await getHmacKey();
    const enc = new TextEncoder();
    const sizeBytes = Math.ceil(CONFIG.BLOOM_SIZE_BITS / 8);
    const bitArray = new Uint8Array(sizeBytes);

    let processed = 0;
    for (const record of importedRecords) {
        const signature = await crypto.subtle.sign('HMAC', key, enc.encode(record));
        const hashArray = new Uint32Array(signature);
        
        for (let i = 0; i < Math.min(CONFIG.HASH_COUNT, hashArray.length); i++) {
            const index = hashArray[i] % CONFIG.BLOOM_SIZE_BITS;
            const bytePos = Math.floor(index / 8);
            const bitPos = index % 8;
            bitArray[bytePos] |= (1 << bitPos);
        }
        processed++;
        if (processed % 1000 === 0) {
            document.getElementById('progress').textContent = `Hashed ${processed} / ${importedRecords.size}...`;
            await new Promise(r => setTimeout(r, 0)); // yield
        }
    }

    const digest = await crypto.subtle.digest('SHA-256', bitArray);
    const checksum = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    document.getElementById('statChecksum').textContent = checksum;

    document.getElementById('progress').textContent = 'Ready.';
    return bitArray;
}

function triggerDownload(buffer, filename) {
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

document.getElementById('btnGenerateAlumni').addEventListener('click', async () => {
    triggerDownload(await generateBloomFilter(), 'verified-alumni.bin');
});
document.getElementById('btnGenerateActive').addEventListener('click', async () => {
    triggerDownload(await generateBloomFilter(), 'current-active.bin');
});
document.getElementById('btnGenerateRevoked').addEventListener('click', async () => {
    triggerDownload(await generateBloomFilter(), 'revoked.bin');
});