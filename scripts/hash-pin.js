#!/usr/bin/env node
/**
 * Generate SHA-256 hash for admin PIN.
 * Usage: node scripts/hash-pin.js your-secret-pin
 * Put the output in js/config.js as adminAccessHash
 */

const crypto = require('crypto');
const pin = process.argv[2];

if (!pin) {
  console.error('Usage: node scripts/hash-pin.js <your-pin>');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(pin).digest('hex');
console.log(hash);
