import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkForUpdate,
  compareVersions,
  findApkUrl,
  isNewerVersion,
  parseRelease,
} from './releases.ts';

const releaseBody = {
  tag_name: 'v1.1.0',
  name: 'Pocket Ledger 1.1.0',
  body: '  เพิ่มรายงานรายเดือน  ',
  html_url: 'https://github.com/Rtertgr2/Pocket-ledger/releases/tag/v1.1.0',
  assets: [
    { name: 'SHA256SUMS.txt', browser_download_url: 'https://example.test/SHA256SUMS.txt' },
    { name: 'pocket-ledger-1.1.0.apk', browser_download_url: 'https://example.test/app.apk' },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('compareVersions orders numerically, not lexically', () => {
  assert.equal(compareVersions('1.9.9', '1.10.0'), -1);
  assert.equal(compareVersions('1.10.0', '1.9.9'), 1);
  assert.equal(compareVersions('v1.0.0', '1.0.0'), 0);
  assert.equal(compareVersions('1.0', '1.0.0'), 0);
  assert.equal(compareVersions('2.0.0', '1.99.99'), 1);
});

test('compareVersions sorts a prerelease below its release', () => {
  assert.equal(compareVersions('1.1.0-dev.3', '1.1.0'), -1);
  assert.equal(compareVersions('1.1.0', '1.1.0-dev.3'), 1);
});

test('isNewerVersion keeps the installed build on equal or newer versions', () => {
  assert.equal(isNewerVersion('1.0.0', '1.1.0'), true);
  assert.equal(isNewerVersion('1.1.0', '1.1.0'), false);
  assert.equal(isNewerVersion('1.1.0', '1.0.9'), false);
});

test('parseRelease strips the tag prefix and prefers the plain APK asset', () => {
  const release = parseRelease(releaseBody);

  assert.equal(release.version, '1.1.0');
  assert.equal(release.tag, 'v1.1.0');
  assert.equal(release.notes, 'เพิ่มรายงานรายเดือน');
  assert.equal(release.apkUrl, 'https://example.test/app.apk');
  assert.match(release.pageUrl, /releases\/tag\/v1\.1\.0$/);
});

test('parseRelease falls back to the release page when there is no APK', () => {
  const release = parseRelease({ ...releaseBody, assets: [] });

  assert.equal(release.apkUrl, null);
  assert.equal(findApkUrl([]), null);
});

test('parseRelease rejects a body without a version', () => {
  assert.throws(() => parseRelease({ name: 'no tag' }), /ไม่มีหมายเลขเวอร์ชัน/);
  assert.throws(() => parseRelease(null), /รูปแบบที่ไม่รู้จัก/);
});

test('checkForUpdate reports an available update when the release is newer', async () => {
  let requested = '';
  const result = await checkForUpdate({
    currentVersion: '1.0.0',
    fetchImpl: (async (url: string) => {
      requested = url;
      return jsonResponse(releaseBody);
    }) as unknown as typeof fetch,
  });

  assert.match(requested, /releases\/latest$/);
  assert.equal(result.available, true);
  assert.equal(result.latest.version, '1.1.0');
});

test('checkForUpdate reports up to date when the release is not newer', async () => {
  const result = await checkForUpdate({
    currentVersion: '1.1.0',
    fetchImpl: (async () => jsonResponse(releaseBody)) as unknown as typeof fetch,
  });

  assert.equal(result.available, false);
});

test('checkForUpdate turns 404, 403 and a dead connection into Thai messages', async () => {
  await assert.rejects(
    checkForUpdate({
      currentVersion: '1.0.0',
      fetchImpl: (async () => jsonResponse({}, 404)) as unknown as typeof fetch,
    }),
    /ยังไม่มีการเผยแพร่เวอร์ชันบน GitHub/
  );

  await assert.rejects(
    checkForUpdate({
      currentVersion: '1.0.0',
      fetchImpl: (async () => jsonResponse({}, 403)) as unknown as typeof fetch,
    }),
    /จำกัดจำนวนการตรวจสอบ/
  );

  await assert.rejects(
    checkForUpdate({
      currentVersion: '1.0.0',
      fetchImpl: (async () => {
        throw new Error('offline');
      }) as unknown as typeof fetch,
    }),
    /เชื่อมต่อ GitHub ไม่ได้/
  );
});
