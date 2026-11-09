import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import type { StateCreator } from 'zustand';
import {
  countSearchResults,
  deleteTransactionById,
  insertTransaction,
  searchTransactions,
  sumExpensesInRange,
  sumIncomeInRange,
  updateTransactionById,
  type TransactionFilter,
} from '../../services/db/transactions';
import { clearLedger } from '../../services/db/reset';
import { getAccountBalance } from '../../services/db/accounts';
import { calculateDailyBurnRate, daysInMonth, monthRange } from '../../utils/calculations';
import type {
  CreateTransactionDTO,
  ReconcileBalanceDTO,
  Transaction,
  TransferFundsDTO,
  UpdateTransactionDTO,
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
  /** The month's income, so the overview chips never guess from a partial page. */
  monthIncomeSatang: number;
  /** What the ledger is filtering by; the screen owns the controls, the store owns the query. */
  ledgerFilter: TransactionFilter;
  /** Rows the filter matches in total, so "12 รายการ" is not just the pages loaded so far. */
  filterCount: number;
  setLedgerFilter: (db: SQLiteDatabase, filter: TransactionFilter) => Promise<void>;
  clearFilter: (db: SQLiteDatabase) => Promise<void>;
  addTransaction: (db: SQLiteDatabase, dto: CreateTransactionDTO) => Promise<void>;
  /** Rewrites a row in place, then re-reads balances and reports so no screen shows stale money. */
  updateTransaction: (db: SQLiteDatabase, dto: UpdateTransactionDTO) => Promise<void>;
  transferFunds: (db: SQLiteDatabase, dto: TransferFundsDTO) => Promise<void>;
  deleteTransaction: (db: SQLiteDatabase, id: string) => Promise<void>;
  /** Puts a deleted row back under its original id, so an undo cannot create a duplicate on merge. */
  restoreTransaction: (db: SQLiteDatabase, transaction: Transaction) => Promise<void>;
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
    monthIncomeSatang: 0,
    ledgerFilter: {},
    filterCount: 0,

    setLedgerFilter: async (db, filter) => {
      set({ ledgerFilter: filter });
      await get().fetchTransactions(db);
    },

    clearFilter: async (db) => {
      set({ ledgerFilter: {} });
      await get().fetchTransactions(db);
    },

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

    updateTransaction: async (db, dto) => {
      if (dto.type === 'TRANSFER' && dto.account_id === dto.destination_account_id) {
        throw new Error('source and destination must differ');
      }
      const changes = await updateTransactionById(db, dto.id, {
        account_id: dto.account_id,
        destination_account_id: dto.type === 'TRANSFER' ? dto.destination_account_id ?? null : null,
        type: dto.type,
        amount_satang: dto.amount_satang,
        note: dto.note,
        category: dto.category,
        is_excluded_from_average: dto.is_excluded_from_average,
        transaction_date: dto.transaction_date,
      });
      if (changes === 0) throw new Error(`transaction ${dto.id} not found`);
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

    restoreTransaction: async (db, transaction) => {
      await insertTransaction(db, {
        id: transaction.id,
        account_id: transaction.account_id,
        destination_account_id: transaction.destination_account_id,
        type: transaction.type,
        amount_satang: transaction.amount_satang,
        note: transaction.note,
        category: transaction.category,
        is_excluded_from_average: transaction.is_excluded_from_average,
        transaction_date: transaction.transaction_date,
      });
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
      const filter = get().ledgerFilter;
      // One extra row tells us whether another page exists; the count is what the header shows.
      const [rows, filterCount] = await Promise.all([
        searchTransactions(db, filter, LEDGER_PAGE_SIZE + 1),
        countSearchResults(db, filter),
      ]);
      set({
        transactions: rows.slice(0, LEDGER_PAGE_SIZE),
        hasMore: rows.length > LEDGER_PAGE_SIZE,
        filterCount,
      });
    },

    loadMoreTransactions: async (db) => {
      const { transactions, hasMore, ledgerFilter } = get();
      if (!hasMore) return;
      const rows = await searchTransactions(db, ledgerFilter, LEDGER_PAGE_SIZE + 1, transactions.length);
      set({
        transactions: [...transactions, ...rows.slice(0, LEDGER_PAGE_SIZE)],
        hasMore: rows.length > LEDGER_PAGE_SIZE,
      });
    },

    fetchBurnRate: async (db, now = new Date()) => {
      const { startIso, endIso } = monthRange(now.getFullYear(), now.getMonth());
      const [monthExpenseSatang, monthIncomeSatang] = await Promise.all([
        sumExpensesInRange(db, startIso, endIso),
        sumIncomeInRange(db, startIso, endIso),
      ]);
      set({
        monthExpenseSatang,
        monthIncomeSatang,
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
