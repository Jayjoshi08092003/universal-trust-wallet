name: Enterprise Extension CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-sign:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Ensure strict JSON formatting
      run: |
        jq . extension/manifest.json > /dev/null
        jq . docs/rules.json > /dev/null
        jq . docs/ledger.json > /dev/null

    - name: Hydrate Private Key for Signing
      run: echo "${{ secrets.ED25519_PRIVATE_KEY }}" > private.pem

    - name: Sign Production Assets
      run: node tools/sign.js

    - name: Verify Signatures Exist
      run: |
        test -f docs/verified-alumni.bin.sig || exit 1
        test -f docs/rules.json.sig || exit 1

    - name: Create Extension Bundle
      run: cd extension && zip -r ../universal-trust-wallet.zip ./*

    - name: Upload Artifact
      uses: actions/upload-artifact@v3
      with:
        name: extension-bundle
        path: universal-trust-wallet.zip