import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useToast } from '../components/common/Toast';
import { pushBackupToSheet } from '../services/backup/cloud';
import { shareBackupFile, pickBackupText } from '../services/backup/files';
import { buildBackup, missingAccountIds, parseBackup } from '../services/backup/format';
import { insertBackup, listAllAccounts, listAllTransactions } from '../services/db/backup';
import { readBackupEndpoint, readBackupSecret } from '../services/storage/settings';
import { useAppStore } from '../store/useAppStore';
import type { BackupFile } from '../services/backup/format';

/**
 * The three Phase 5 flows behind one hook, so the settings screen stays a layout.
 * Every failure ends in a toast that says the data on the device is still safe.
 */
export function useBackup(db: SQLiteDatabase) {
  const { showToast } = useToast();
  const refreshAll = useAppStore((s) => s.refreshAll);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pushing, setPushing] = useState(false);

  const snapshot = useCallback(async (): Promise<BackupFile> => {
    const [accounts, transactions] = await Promise.all([
      listAllAccounts(db),
      listAllTransactions(db),
    ]);
    return buildBackup(accounts, transactions);
  }, [db]);

  const exportToFile = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const backup = await snapshot();
      await shareBackupFile(backup);
      showToast(`เตรียมไฟล์สำรอง ${backup.transactions.length} รายการแล้ว`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'ส่งออกไฟล์ไม่สำเร็จ', 'error');
    } finally {
      setExporting(false);
    }
  }, [exporting, showToast, snapshot]);

  const importFromFile = useCallback(async () => {
    if (importing) return;
    setImporting(true);
    try {
      const raw = await pickBackupText();
      if (raw === null) return; // the user backed out of the picker: silence is correct

      const parsed = parseBackup(raw);
      if (!parsed.ok) {
        showToast(parsed.error, 'error');
        return;
      }

      // Check references before writing, so a foreign file cannot leave a half restore behind.
      const existing = await listAllAccounts(db);
      const missing = missingAccountIds(parsed.backup, existing.map((account) => account.id));
      if (missing.length > 0) {
        showToast(`ไฟล์อ้างถึงบัญชีที่ไม่มีอยู่ในเครื่อง (${missing.length} บัญชี) — ยังไม่นำเข้า`, 'error');
        return;
      }

      const result = await insertBackup(db, parsed.backup);
      await refreshAll(db);
      showToast(
        result.transactions + result.accounts === 0
          ? 'ข้อมูลในไฟล์มีอยู่ครบแล้ว'
          : `นำเข้าสำเร็จ: ${result.transactions} รายการใหม่ · ${result.accounts} บัญชีใหม่`
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'นำเข้าไฟล์ไม่สำเร็จ', 'error');
    } finally {
      setImporting(false);
    }
  }, [db, importing, refreshAll, showToast]);

  const pushToCloud = useCallback(async () => {
    if (pushing) return;
    const url = readBackupEndpoint();
    if (!url.trim()) {
      showToast('กรุณาระบุ Web App URL แล้วบันทึกก่อน', 'error');
      return;
    }

    setPushing(true);
    try {
      const backup = await snapshot();
      const { count } = await pushBackupToSheet({
        url,
        secret: readBackupSecret(),
        backup,
      });
      showToast(`สำรองข้อมูลสำเร็จ (${count} รายการ)`);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'การสำรองข้อมูลล้มเหลว ข้อมูลในเครื่องยังปลอดภัย',
        'error'
      );
    } finally {
      setPushing(false);
    }
  }, [pushing, showToast, snapshot]);

  return { exporting, importing, pushing, exportToFile, importFromFile, pushToCloud };
}
