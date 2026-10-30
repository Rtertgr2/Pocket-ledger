import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import type { StateCreator } from 'zustand';
import {
  deleteTransactionById,
  insertTransaction,
  listTransactions,
  sumExpensesInRange,
} from '../../services/db/transactions';
import { clearLedger } from '../../services/db/reset';
import { getAccountBalance } from '../../services/db/accounts';
import { calculateDailyBurnRate, daysInMonth, monthRange } from '../../utils/calculations';
import type {
  CreateTransactionDTO,
  ReconcileBalanceDTO,
  Transaction,
  TransferFundsDTO,
} from '../../types';
import type { AppStore } from '../useAppStore';

/** One page of the ledger. Kept small enough that a year of entries still streams in. */
export const LEDGER_PAGE_SIZE = 50;

export interface TransactionSlice {
  /** Newest first, only the pages loaded so far. */
  transactions: Transaction[];
  hasMore: boolean;
  burnRateSatang: number;
  monthExpenseSatang: number;
  addTransaction: (db: SQLiteDatabase, dto: CreateTransactionDTO) => Promise<void>;
  transferFunds: (db: SQLiteDatabase, dto: TransferFundsDTO) => Promise<void>;
  deleteTransaction: (db: SQLiteDatabase, id: string) => Promise<void>;
  /** Wipes every account and transaction; settings are kept. */
  clearAllData: (db: SQLiteDatabase) => Promise<void>;
  reconcileBalance: (db: SQLiteDatabase, dto: ReconcileBalanceDTO) => Promise<void>;
  /** Reloads the first page; every write calls this so the list cannot go stale. */
  fetchTransactions: (db: SQLiteDatabase) => Promise<void>;
  loadMoreTransactions: (db: SQLiteDatabase) => Promise<void>;
  fetchBurnRate: (db: SQLiteDatabase, now?: Date) => Promise<void>;
  refreshAll: (db: SQLiteDatabase) => Promise<void>;
}

export const createTransactionSlice: StateCreator<AppStore, [], [], TransactionSlice> = (
  set,
  get
) => {
  /** Every write is followed by a re-read: SQLite stays the only truth. */
  async function refresh(db: SQLiteDatabase): Promise<void> {
    await get().refreshAll(db);
  }

  return {
    transactions: [],
    hasMore: false,
    burnRateSatang: 0,
    monthExpenseSatang: 0,

    addTransaction: async (db, dto) => {
      await insertTransaction(db, {
        id: randomUUID(),
        account_id: dto.account_id,
        type: dto.type,
        amount_satang: dto.amount_satang,
        note: dto.note,
        category: dto.category,
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

    clearAllData: async (db) => {
      await clearLedger(db);
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

    fetchTransactions: async (db) => {
      // One extra row tells us whether another page exists without a COUNT query.
      const rows = await listTransactions(db, LEDGER_PAGE_SIZE + 1);
      set({ transactions: rows.slice(0, LEDGER_PAGE_SIZE), hasMore: rows.length > LEDGER_PAGE_SIZE });
    },

    loadMoreTransactions: async (db) => {
      const { transactions, hasMore } = get();
      if (!hasMore) return;
      const rows = await listTransactions(db, LEDGER_PAGE_SIZE + 1, transactions.length);
      set({
        transactions: [...transactions, ...rows.slice(0, LEDGER_PAGE_SIZE)],
        hasMore: rows.length > LEDGER_PAGE_SIZE,
      });
    },

    fetchBurnRate: async (db, now = new Date()) => {
      const { startIso, endIso } = monthRange(now.getFullYear(), now.getMonth());
      const monthExpenseSatang = await sumExpensesInRange(db, startIso, endIso);
      set({
        monthExpenseSatang,
        burnRateSatang: calculateDailyBurnRate(
          monthExpenseSatang,
          daysInMonth(now.getFullYear(), now.getMonth())
        ),
      });
    },

    refreshAll: async (db) => {
      await get().fetchAccounts(db);
      await get().fetchTransactions(db);
      await get().fetchBurnRate(db);
    },
  };
};
