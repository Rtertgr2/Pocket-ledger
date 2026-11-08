import type { SQLiteDatabase } from 'expo-sqlite';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';
import type { Transaction } from '../types';
import { transactionTitle } from '../utils/formatters';
import { formatBaht } from '../utils/money';
import { useDeleteTransaction } from './useDeleteTransaction';

/**
 * Long-press menu for a ledger row: edit, delete, cancel. Deleting still asks for confirmation
 * until undo lands, but the menu no longer makes the row look read-only.
 */
export function useTransactionMenu(db: SQLiteDatabase) {
  const confirmDelete = useDeleteTransaction(db);

  return useCallback(
    (transaction: Transaction) => {
      const isTransfer = transaction.type === 'TRANSFER';
      Alert.alert(
        transactionTitle(transaction),
        `${formatBaht(transaction.amount_satang)} · ต้องการทำอะไรกับรายการนี้`,
        [
          {
            text: 'แก้ไข',
            onPress: () =>
              router.push({
                pathname: isTransfer ? '/transfer' : '/add',
                params: { id: transaction.id },
              }),
          },
          { text: 'ลบ', style: 'destructive', onPress: () => confirmDelete(transaction) },
          { text: 'ยกเลิก', style: 'cancel' },
        ]
      );
    },
    [confirmDelete]
  );
}
