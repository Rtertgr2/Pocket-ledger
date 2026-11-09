import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback } from 'react';
import { useToast } from '../components/common/Toast';
import { useAppStore } from '../store/useAppStore';
import type { Transaction } from '../types';
import { transactionTitle } from '../utils/formatters';
import { formatBaht } from '../utils/money';

/**
 * Deleting is immediate and undoable instead of confirmed.
 *
 * Since editing exists, a confirmed delete is mostly friction: the row is gone, the user sees the
 * toast and can put it back with one tap. The undo re-inserts under the original id, so a later
 * backup merge recognises it as the same row rather than a duplicate.
 */
export function useDeleteTransaction(db: SQLiteDatabase) {
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const restoreTransaction = useAppStore((s) => s.restoreTransaction);
  const { showToast } = useToast();

  return useCallback(
    async (transaction: Transaction) => {
      const label = `${transactionTitle(transaction)} · ${formatBaht(transaction.amount_satang)}`;
      try {
        await deleteTransaction(db, transaction.id);
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'ลบไม่สำเร็จ', 'error');
        return;
      }

      showToast(`ลบแล้ว: ${label}`, 'success', {
        label: 'เลิกทำ',
        onPress: () => {
          restoreTransaction(db, transaction)
            .then(() => showToast('คืนรายการแล้ว'))
            .catch((error: unknown) =>
              showToast(error instanceof Error ? error.message : 'คืนรายการไม่สำเร็จ', 'error')
            );
        },
      });
    },
    [db, deleteTransaction, restoreTransaction, showToast]
  );
}
