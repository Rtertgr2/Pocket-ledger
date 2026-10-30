import type { BackupFile } from './format';

/** The Apps Script round-trip is a single POST; 10s is the spec's ceiling before giving up. */
export const PUSH_TIMEOUT_MS = 10_000;

/** Every failure the UI can show is one of these, already phrased for a toast. */
export class BackupError extends Error {}

export interface PushOptions {
  url: string;
  secret: string;
  backup: BackupFile;
  /** Overridable so the timeout path can be tested without waiting ten seconds. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** The exact body Code.gs reads — exported so the contract is asserted in a test. */
export function buildPushPayload(backup: BackupFile, secret: string): Record<string, unknown> {
  return {
    secret_key: secret,
    timestamp: new Date().toISOString(),
    accounts: backup.accounts,
    transactions: backup.transactions,
  };
}

/**
 * One-way push: `{ secret_key, timestamp, accounts, transactions }` to the user's Apps Script
 * Web App. Nothing is written back into SQLite — the device stays the source of truth, which is
 * why every failure message ends with "ข้อมูลในเครื่องยังปลอดภัย".
 */
export async function pushBackupToSheet({
  url,
  secret,
  backup,
  timeoutMs = PUSH_TIMEOUT_MS,
  fetchImpl = fetch,
}: PushOptions): Promise<{ count: number }> {
  const endpoint = url.trim();
  if (!endpoint) throw new BackupError('กรุณาระบุ Web App URL ในหน้าตั้งค่าก่อน');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPushPayload(backup, secret)),
      signal: controller.signal,
    });
  } catch (error) {
    // Apps Script answers with a redirect first; a dropped connection is the common failure.
    if (controller.signal.aborted) {
      throw new BackupError(`หมดเวลารอเซิร์ฟเวอร์ (${Math.round(timeoutMs / 1000)} วินาที) — ข้อมูลในเครื่องยังปลอดภัย`);
    }
    throw new BackupError(
      error instanceof Error && error.message
        ? `เชื่อมต่อคลาวด์ไม่ได้: ${error.message}`
        : 'เชื่อมต่อคลาวด์ไม่ได้ — ข้อมูลในเครื่องยังปลอดภัย'
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 || response.status === 403) {
    throw new BackupError('Secret key ไม่ถูกต้อง — ตรวจสอบรหัสใน Apps Script แล้วลองใหม่');
  }
  if (!response.ok) {
    throw new BackupError(`เซิร์ฟเวอร์ตอบกลับ ${response.status} — ข้อมูลในเครื่องยังปลอดภัย`);
  }

  const payload = await readJson(response);
  if (payload?.status === 'error') {
    throw new BackupError(payload.message ?? 'Apps Script ปฏิเสธการสำรองข้อมูล');
  }

  return { count: typeof payload?.count === 'number' ? payload.count : backup.transactions.length };
}

async function readJson(response: Response): Promise<{ status?: string; count?: number; message?: string } | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) return null;
    const record = body as Record<string, unknown>;
    return {
      status: typeof record.status === 'string' ? record.status : undefined,
      count: typeof record.count === 'number' ? record.count : undefined,
      message: typeof record.message === 'string' ? record.message : undefined,
    };
  } catch {
    // A 200 with an HTML body (misconfigured deployment) is not a success we can verify.
    return null;
  }
}
