#!/usr/bin/env node
/**
 * Publishes one release to the update feed: the APK first, the manifest last, so the feed never
 * advertises a version whose file is not there yet.
 *
 *   UPLOAD_TOKEN=… node scripts/publish-feed.mjs dist/pocket-ledger-1.0.1.apk 1.0.1 "แก้บั๊ก…"
 *
 * Options:
 *   --base <url>   feed base URL (default: the production site in src/services/updates/feed.ts)
 *   --keep <n>     also print the exact rollback command for the previous manifest
 *
 * The token is read from the environment only; it is never written to a file or printed.
 */
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';

const DEFAULT_BASE = 'https://site-6a17a08d00724d9eb2a569b25a05432e.freebuff.page';
const MAX_BYTES = 60 * 1024 * 1024;

const args = process.argv.slice(2);
const flags = new Map();
const positional = [];

for (let index = 0; index < args.length; index += 1) {
  if (args[index].startsWith('--')) {
    const name = args[index].slice(2);
    const value = args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : 'true';
    flags.set(name, value);
    if (value !== 'true') index += 1;
  } else {
    positional.push(args[index]);
  }
}

const [apkPath, version, notes = ''] = positional;
const base = (flags.get('base') ?? DEFAULT_BASE).replace(/\/+$/, '');
const token = process.env.UPLOAD_TOKEN ?? '';

function fail(message) {
  console.error(`publish-feed: ${message}`);
  process.exit(1);
}

if (!apkPath) fail('usage: publish-feed.mjs <apk> <version> [notes] [--base <url>]');
if (!version || !/^\d+\.\d+\.\d+([.-][0-9A-Za-z.-]+)?$/.test(version)) {
  fail(`expected a semver version, got "${version ?? ''}"`);
}
if (!token) fail('UPLOAD_TOKEN is not set');

const bytes = readFileSync(apkPath);
if (bytes.length > MAX_BYTES) {
  fail(`${basename(apkPath)} is ${(bytes.length / 1048576).toFixed(1)}MB; the feed accepts up to 60MB`);
}

const apkName = `pocket-ledger-${version}.apk`;
const apkUrl = `${base}/${apkName}`;

async function put(key, body, contentType) {
  const response = await fetch(`${base}/admin/${key}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
      'Content-Length': String(body.length),
    },
    body,
  });

  const text = await response.text();
  if (!response.ok) fail(`upload of ${key} failed (${response.status}): ${text}`);
  return text;
}

const manifest = {
  format: 'pocket-ledger.update',
  version,
  notes,
  apkUrl,
  publishedAt: new Date().toISOString(),
};

console.log(`uploading ${apkName} (${(bytes.length / 1048576).toFixed(1)}MB)…`);
console.log(await put(apkName, bytes, 'application/vnd.android.package-archive'));

console.log('uploading latest.json…');
console.log(
  await put('latest.json', Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`), 'application/json')
);

console.log(`\nfeed:    ${base}/latest.json`);
console.log(`version: ${version}`);
console.log(`apk:     ${apkUrl}`);
