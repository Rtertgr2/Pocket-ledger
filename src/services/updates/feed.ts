/**
 * The update feed.
 *
 * The app reads one small JSON document and nothing else:
 *
 * ```json
 * {
 *   "format": "pocket-ledger.update",
 *   "version": "1.0.1",
 *   "notes": "…",
 *   "apkUrl": "https://…/pocket-ledger-1.0.1.apk",
 *   "publishedAt": "2026-10-30T10:00:00.000Z"
 * }
 * ```
 *
 * It is served by the Worker in `update-feed/worker.js` from an R2 bucket, deliberately on hosting
 * we control: the app must be able to reach the feed without a token, and GitHub's own releases
 * are not reliable for that (see the Phase 6 spec). Nothing is downloaded or installed here — the
 * phone's browser opens `apkUrl`.
 *
 * The installed version is passed in rather than read here, so this module stays free of React
 * Native imports and its ordering rules can be tested with plain `node --test`.
 */

export const UPDATE_FEED_URL =
  'https://site-6a17a08d00724d9eb2a569b25a05432e.freebuff.page/latest.json';

export const UPDATE_FEED_FORMAT = 'pocket-ledger.update';

/** 10s, matching the backup push: anything slower feels broken on a phone. */
export const UPDATE_TIMEOUT_MS = 10_000;

export class UpdateError extends Error {}

export interface ReleaseInfo {
  /** The version the feed advertises (`1.0.1`, no `v` prefix). */
  version: string;
  notes: string;
  /** Direct APK download. */
  apkUrl: string;
  publishedAt: string;
}

export interface UpdateCheck {
  currentVersion: string;
  latest: ReleaseInfo;
  /** True when the feed is strictly newer than the installed version. */
  available: boolean;
}

/** Splits `1.2.3-beta.4` into `[1,2,3]` and `beta.4`, tolerating a leading `v`. */
function splitVersion(raw: string): { numbers: number[]; prerelease: string } {
  const trimmed = raw.trim().replace(/^v/i, '');
  const dash = trimmed.indexOf('-');
  const core = dash < 0 ? trimmed : trimmed.slice(0, dash);
  const prerelease = dash < 0 ? '' : trimmed.slice(dash + 1);

  const numbers = core.split('.').map((part) => {
    const digits = part.match(/^\d+/);
    return digits ? Number(digits[0]) : 0;
  });

  return { numbers, prerelease };
}

/**
 * Orders two versions the way Android users expect: `1.10.0` is newer than `1.9.9`, and a
 * prerelease (`1.1.0-dev.3`) sorts below its release (`1.1.0`).
 */
export function compareVersions(a: string, b: string): number {
  const left = splitVersion(a);
  const right = splitVersion(b);
  const length = Math.max(left.numbers.length, right.numbers.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (left.numbers[index] ?? 0) - (right.numbers[index] ?? 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }

  if (left.prerelease === right.prerelease) return 0;
  if (!left.prerelease) return 1;
  if (!right.prerelease) return -1;
  return left.prerelease > right.prerelease ? 1 : -1;
}

export function isNewerVersion(installed: string, latest: string): boolean {
  return compareVersions(latest, installed) > 0;
}

/** Validates the feed once, so the UI never has to ask whether a field exists. */
export function parseFeed(body: unknown): ReleaseInfo {
  if (typeof body !== 'object' || body === null) {
    throw new UpdateError('เซิร์ฟเวอร์อัปเดตตอบกลับในรูปแบบที่ไม่รู้จัก');
  }

  const record = body as Record<string, unknown>;
  if (record.format !== undefined && record.format !== UPDATE_FEED_FORMAT) {
    throw new UpdateError('ไฟล์นี้ไม่ใช่ช่องทางอัปเดตของ Pocket Ledger');
  }

  const version = typeof record.version === 'string' ? record.version.trim() : '';
  const apkUrl = typeof record.apkUrl === 'string' ? record.apkUrl.trim() : '';
  if (!version) throw new UpdateError('ช่องทางอัปเดตไม่มีหมายเลขเวอร์ชัน');
  if (!/^https:\/\//i.test(apkUrl)) throw new UpdateError('ช่องทางอัปเดตไม่มีลิงก์ APK ที่ใช้ได้');

  return {
    version: version.replace(/^v/i, ''),
    notes: typeof record.notes === 'string' ? record.notes.trim() : '',
    apkUrl,
    publishedAt: typeof record.publishedAt === 'string' ? record.publishedAt : '',
  };
}

export interface CheckOptions {
  /** The version the running build reports (`app.json` → `expo.version`). */
  currentVersion: string;
  feedUrl?: string;
  /** Overridable so the timeout and error paths are testable without the network. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * One GET, one verdict. Every failure is an `UpdateError` phrased for a toast, because the button
 * lives in Settings where there is no room for a diagnostic.
 */
export async function checkForUpdate({
  currentVersion,
  feedUrl = UPDATE_FEED_URL,
  timeoutMs = UPDATE_TIMEOUT_MS,
  fetchImpl = fetch,
}: CheckOptions): Promise<UpdateCheck> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(`${feedUrl}?t=${Date.now()}`, {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new UpdateError(`ตรวจสอบไม่สำเร็จ: หมดเวลา (${Math.round(timeoutMs / 1000)} วินาที)`);
    }
    throw new UpdateError('เชื่อมต่อเซิร์ฟเวอร์อัปเดตไม่ได้ — ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404) {
    throw new UpdateError('ยังไม่มีการเผยแพร่เวอร์ชันบนช่องทางอัปเดต');
  }
  if (!response.ok) {
    throw new UpdateError(`เซิร์ฟเวอร์อัปเดตตอบกลับ ${response.status} — ลองใหม่ภายหลัง`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new UpdateError('อ่านข้อมูลเวอร์ชันล่าสุดไม่ได้');
  }

  const latest = parseFeed(body);
  return { currentVersion, latest, available: isNewerVersion(currentVersion, latest.version) };
}
