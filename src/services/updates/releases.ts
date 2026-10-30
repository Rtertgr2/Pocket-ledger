/**
 * The in-app update check reads the latest published GitHub Release of this repository. It is a
 * read-only GET against the public Releases API: nothing is downloaded or installed from here —
 * the phone's browser takes over the APK URL.
 *
 * No token is involved, so the endpoint is subject to the unauthenticated rate limit (60/hour per
 * IP). That is fine for a manual "check for update" button; it is not a background poller.
 *
 * The installed version is passed in rather than read here: this module stays free of React Native
 * imports so its ordering rules can be tested with plain `node --test`.
 */

export const RELEASE_REPO = 'Rtertgr2/Pocket-ledger';
export const LATEST_RELEASE_URL = `https://api.github.com/repos/${RELEASE_REPO}/releases/latest`;
export const RELEASES_PAGE_URL = `https://github.com/${RELEASE_REPO}/releases`;

/** 10s, matching the backup push: anything slower feels broken on a phone. */
export const UPDATE_TIMEOUT_MS = 10_000;

export class UpdateError extends Error {}

export interface ReleaseInfo {
  /** Tag without its leading `v`: what the app compares against its own version. */
  version: string;
  tag: string;
  title: string;
  notes: string;
  /** The release page — the fallback link when the release carries no APK asset. */
  pageUrl: string;
  /** Direct APK download, or `null` when the release only has the page. */
  apkUrl: string | null;
}

export interface UpdateCheck {
  currentVersion: string;
  latest: ReleaseInfo;
  /** True when the release is strictly newer than the installed version. */
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

  // Same core: a release beats a prerelease, and two prereleases fall back to string order.
  if (left.prerelease === right.prerelease) return 0;
  if (!left.prerelease) return 1;
  if (!right.prerelease) return -1;
  return left.prerelease > right.prerelease ? 1 : -1;
}

export function isNewerVersion(installed: string, latest: string): boolean {
  return compareVersions(latest, installed) > 0;
}

/**
 * Picks the APK to hand to the browser. CI publishes exactly one `*.apk` per release, but a
 * release may also carry a checksum or a renamed copy, so prefer the plain app name.
 */
export function findApkUrl(assets: readonly { name: string; browser_download_url: string }[]): string | null {
  const apks = assets.filter((asset) => asset.name.toLowerCase().endsWith('.apk'));
  if (apks.length === 0) return null;
  const plain = apks.find((asset) => /^pocket-ledger-.*\.apk$/i.test(asset.name));
  return (plain ?? apks[0]).browser_download_url;
}

/** Validates the API body once, so the UI never has to ask whether a field exists. */
export function parseRelease(body: unknown): ReleaseInfo {
  if (typeof body !== 'object' || body === null) {
    throw new UpdateError('GitHub ตอบกลับในรูปแบบที่ไม่รู้จัก — ลองใหม่อีกครั้ง');
  }

  const record = body as Record<string, unknown>;
  const tag = typeof record.tag_name === 'string' ? record.tag_name : '';
  const pageUrl = typeof record.html_url === 'string' ? record.html_url : '';

  if (!tag) throw new UpdateError('Release ล่าสุดไม่มีหมายเลขเวอร์ชัน');

  const assets = Array.isArray(record.assets)
    ? record.assets
        .filter((asset): asset is Record<string, unknown> => typeof asset === 'object' && asset !== null)
        .map((asset) => ({
          name: typeof asset.name === 'string' ? asset.name : '',
          browser_download_url:
            typeof asset.browser_download_url === 'string' ? asset.browser_download_url : '',
        }))
        .filter((asset) => asset.name && asset.browser_download_url)
    : [];

  return {
    version: tag.replace(/^v/i, ''),
    tag,
    title: typeof record.name === 'string' && record.name ? record.name : tag,
    notes: typeof record.body === 'string' ? record.body.trim() : '',
    pageUrl: pageUrl || RELEASES_PAGE_URL,
    apkUrl: findApkUrl(assets),
  };
}

export interface CheckOptions {
  /** The version the running build reports (`app.json` → `expo.version`). */
  currentVersion: string;
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
  timeoutMs = UPDATE_TIMEOUT_MS,
  fetchImpl = fetch,
}: CheckOptions): Promise<UpdateCheck> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(LATEST_RELEASE_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new UpdateError(`ตรวจสอบไม่สำเร็จ: หมดเวลา (${Math.round(timeoutMs / 1000)} วินาที)`);
    }
    throw new UpdateError('เชื่อมต่อ GitHub ไม่ได้ — ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404) {
    throw new UpdateError('ยังไม่มีการเผยแพร่เวอร์ชันบน GitHub');
  }
  if (response.status === 403) {
    throw new UpdateError('GitHub จำกัดจำนวนการตรวจสอบชั่วคราว — ลองใหม่ภายหลัง');
  }
  if (!response.ok) {
    throw new UpdateError(`GitHub ตอบกลับ ${response.status} — ลองใหม่อีกครั้ง`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new UpdateError('อ่านข้อมูล Release จาก GitHub ไม่ได้');
  }

  const latest = parseRelease(body);
  return { currentVersion, latest, available: isNewerVersion(currentVersion, latest.version) };
}
