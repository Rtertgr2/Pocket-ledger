import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { BackupFile } from './format';

/** `pocket-ledger-backup-2026-10-30.json` — dated so several exports can live side by side. */
export function backupFileName(now: Date = new Date()): string {
  return `pocket-ledger-backup-${now.toISOString().slice(0, 10)}.json`;
}

/**
 * Writes the snapshot into the cache directory and hands it to the system share sheet, so the
 * user decides where it lands (Drive, Files, messaging). Returns the file URI for callers that
 * want to show it; nothing is uploaded from here.
 */
export async function shareBackupFile(backup: BackupFile, now: Date = new Date()): Promise<string> {
  const file = new File(Paths.cache, backupFileName(now));
  file.create({ overwrite: true, intermediates: true });
  await file.write(JSON.stringify(backup, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('เครื่องนี้ไม่รองรับการแชร์ไฟล์ — ลองส่งออกผ่านแอปอื่นอีกครั้ง');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'บันทึกไฟล์สำรอง',
    UTI: 'public.json',
  });
  return file.uri;
}

/**
 * Opens the system picker and returns the file's text, or `null` when the user backs out.
 * `copyToCacheDirectory` is required for `File` to read the pick straight away.
 */
export async function pickBackupText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const asset = result.assets?.[0];
  if (!asset) return null;
  return new File(asset.uri).text();
}
