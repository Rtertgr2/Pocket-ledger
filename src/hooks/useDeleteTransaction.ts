import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useToast } from '../components/common/Toast';
import { useAppStore } from '../store/useAppStore';
import type { Transaction } from '../types';
import { transactionTitle } from '../utils/formatters';
import { formatBaht } from '../utils/money';

/** Deleting a row is reversible only by re-entry, so it always asks first. */
export function useDeleteTransaction(db: SQLiteDatabase) {
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const { showToast } = useToast();

  return useCallback(
    (transaction: Transaction) => {
      Alert.alert(
        'ลบรายการนี้?',
        `${transactionTitle(transaction)} · ${formatBaht(transaction.amount_satang)}`,
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'ลบ',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteTransaction(db, transaction.id);
                showToast('ลบรายการแล้ว');
              } catch (error) {
                showToast(error instanceof Error ? error.message : 'ลบไม่สำเร็จ', 'error');
              }
            },
          },
        ]
      );
    },
    [db, deleteTransaction, showToast]
  );
}
