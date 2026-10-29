import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import type { StateCreator } from 'zustand';
import {
  deleteTransactionById,
  insertTransaction,
  listRecentTransactions,
  sumExpensesInRange,
} from '../../services/db/transactions';
import { getAccountBalance } from '../../services/db/accounts';
import { calculateDailyBurnRate, daysInMonth, monthRange } from '../../utils/calculations';
import type {
  CreateTransactionDTO,
  ReconcileBalanceDTO,
  Transaction,
  TransferFundsDTO,
} from '../../types';
import type { AppStore } from '../useAppStore';

export interface TransactionSlice {
  recent: Transaction[];
  burnRateSatang: number;
  addTransaction: (db: SQLiteDatabase, dto: CreateTransactionDTO) => Promise<void>;
  transferFunds: (db: SQLiteDatabase, dto: TransferFundsDTO) => Promise<void>;
  deleteTransaction: (db: SQLiteDatabase, id: string) => Promise<void>;
  reconcileBalance: (db: SQLiteDatabase, dto: ReconcileBalanceDTO) => Promise<void>;
  fetchStats: (db: SQLiteDatabase, now?: Date) => Promise<void>;
}

export const createTransactionSlice: StateCreator<AppStore, [], [], TransactionSlice> = (
  set,
  get
) => {
  /** Every write is followed by a re-read: SQLite stays the only truth. */
  async function refresh(db: SQLiteDatabase): Promise<void> {
    await get().fetchAccounts(db);
    await get().fetchStats(db);
  }

  return {
    recent: [],
    burnRateSatang: 0,

    addTransaction: async (db, dto) => {
      await insertTransaction(db, {
        id: randomUUID(),
        account_id: dto.account_id,
        type: dto.type,
        amount_satang: dto.amount_satang,
        note: dto.note,
        is_excluded_from_average: dto.is_excluded_from_average,
        transaction_date: dto.transaction_date ?? new Date().toISOString(),
      });
      await refresh(db);
    },

    transferFunds: async (db, dto) => {
      if (dto.account_id === dto.destination_account_id) {
        throw new Error('source and destination must differ');
      }
      await insertTransaction(db, {
        id: randomUUID(),
        account_id: dto.account_id,
        destination_account_id: dto.destination_account_id,
        type: 'TRANSFER',
        amount_satang: dto.amount_satang,
        note: dto.note,
        is_excluded_from_average: 1,
        transaction_date: dto.transaction_date ?? new Date().toISOString(),
      });
      await refresh(db);
    },

    deleteTransaction: async (db, id) => {
      const changes = await deleteTransactionById(db, id);
      if (changes === 0) throw new Error(`transaction ${id} not found`);
      await refresh(db);
    },

    reconcileBalance: async (db, dto) => {
      const delta = dto.actual_balance_satang - (await getAccountBalance(db, dto.account_id));
      if (delta === 0) return; // nothing to record, and a 0 amount would violate the CHECK
      await insertTransaction(db, {
        id: randomUUID(),
        account_id: dto.account_id,
        type: delta > 0 ? 'INCOME' : 'EXPENSE',
        amount_satang: Math.abs(delta),
        note: 'ปรับปรุงยอดคงเหลือ',
        is_excluded_from_average: 1,
        transaction_date: new Date().toISOString(),
      });
      await refresh(db);
    },

    fetchStats: async (db, now = new Date()) => {
      const { startIso, endIso } = monthRange(now.getFullYear(), now.getMonth());
      const [expenseSum, recent] = await Promise.all([
        sumExpensesInRange(db, startIso, endIso),
        listRecentTransactions(db, 5),
      ]);
      set({
        burnRateSatang: calculateDailyBurnRate(
          expenseSum,
          daysInMonth(now.getFullYear(), now.getMonth())
        ),
        recent,
      });
    },
  };
};
