#!/usr/bin/env node
/**
 * Writes the released version into `app.json` before a build, so the APK carries the same version
 * the GitHub Release tag does. `expo prebuild` reads `app.json`, so this has to run first.
 *
 * `versionCode` is monotonic across builds (Android refuses an update whose versionCode is not
 * higher), which is why it comes from the CI run number rather than the version string.
 *
 * Usage: node scripts/stamp-version.mjs 1.0.0 42
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [version, code] = process.argv.slice(2);

if (!version || !/^\d+\.\d+\.\d+([.-][0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`stamp-version: expected a semver version, got "${version ?? ''}"`);
  process.exit(1);
}

const versionCode = Number(code);
if (!Number.isInteger(versionCode) || versionCode < 1) {
  console.error(`stamp-version: expected a positive integer versionCode, got "${code ?? ''}"`);
  process.exit(1);
}

const file = new URL('../app.json', import.meta.url);
const config = JSON.parse(readFileSync(file, 'utf8'));

config.expo.version = version;
config.expo.android = { ...config.expo.android, versionCode };

writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
console.log(`stamped app.json: version ${version} (versionCode ${versionCode})`);
