import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkForUpdate,
  compareVersions,
  isNewerVersion,
  parseFeed,
  UPDATE_FEED_FORMAT,
} from './feed.ts';

const feedBody = {
  format: UPDATE_FEED_FORMAT,
  version: '1.0.1',
  notes: '  เพิ่มรายงานรายเดือน  ',
  apkUrl: 'https://updates.example.test/pocket-ledger-1.0.1.apk',
  publishedAt: '2026-10-30T10:00:00.000Z',
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
  assert.equal(isNewerVersion('1.0.0', '1.0.1'), true);
  assert.equal(isNewerVersion('1.0.1', '1.0.1'), false);
  assert.equal(isNewerVersion('1.0.1', '1.0.0'), false);
});

test('parseFeed reads the manifest and trims the notes', () => {
  const release = parseFeed(feedBody);

  assert.equal(release.version, '1.0.1');
  assert.equal(release.notes, 'เพิ่มรายงานรายเดือน');
  assert.equal(release.apkUrl, 'https://updates.example.test/pocket-ledger-1.0.1.apk');
});

test('parseFeed rejects a foreign document, a missing version and an insecure APK link', () => {
  assert.match(
    assertRejection({ ...feedBody, format: 'other.app.update' }),
    /ไม่ใช่ช่องทางอัปเดตของ Pocket Ledger/
  );
  assert.match(assertRejection({ ...feedBody, version: '' }), /ไม่มีหมายเลขเวอร์ชัน/);
  assert.match(
    assertRejection({ ...feedBody, apkUrl: 'http://updates.example.test/app.apk' }),
    /ไม่มีลิงก์ APK ที่ใช้ได้/
  );
  assert.match(assertRejection(null), /รูปแบบที่ไม่รู้จัก/);
});

test('checkForUpdate asks the feed for the newest version and compares it', async () => {
  let requested = '';
  const result = await checkForUpdate({
    currentVersion: '1.0.0',
    feedUrl: 'https://updates.example.test/latest.json',
    fetchImpl: (async (url: string) => {
      requested = url;
      return jsonResponse(feedBody);
    }) as unknown as typeof fetch,
  });

  // A cache-buster keeps a CDN or an over-eager cache from serving yesterday's manifest.
  assert.match(requested, /^https:\/\/updates\.example\.test\/latest\.json\?t=\d+$/);
  assert.equal(result.available, true);
  assert.equal(result.latest.version, '1.0.1');
});

test('checkForUpdate reports up to date when the feed is not newer', async () => {
  const result = await checkForUpdate({
    currentVersion: '1.0.1',
    fetchImpl: (async () => jsonResponse(feedBody)) as unknown as typeof fetch,
  });

  assert.equal(result.available, false);
});

test('checkForUpdate turns an empty feed, a server error and a dead connection into Thai messages', async () => {
  await assert.rejects(
    checkForUpdate({
      currentVersion: '1.0.0',
      fetchImpl: (async () => jsonResponse({}, 404)) as unknown as typeof fetch,
    }),
    /ยังไม่มีการเผยแพร่เวอร์ชัน/
  );

  await assert.rejects(
    checkForUpdate({
      currentVersion: '1.0.0',
      fetchImpl: (async () => jsonResponse({}, 503)) as unknown as typeof fetch,
    }),
    /ตอบกลับ 503/
  );

  await assert.rejects(
    checkForUpdate({
      currentVersion: '1.0.0',
      fetchImpl: (async () => {
        throw new Error('offline');
      }) as unknown as typeof fetch,
    }),
    /เชื่อมต่อเซิร์ฟเวอร์อัปเดตไม่ได้/
  );
});

function assertRejection(body: unknown): string {
  try {
    parseFeed(body);
  } catch (error) {
    return error instanceof Error ? error.message : '';
  }
  assert.fail('parseFeed accepted a document it should have rejected');
}
