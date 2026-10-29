import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import type { StateCreator } from 'zustand';
import { insertAccount, listAccounts, updateAccount as updateAccountRow, type UpdateAccountInput } from '../../services/db/accounts';
import type { AccountBalance } from '../../types';
import type { AppStore } from '../useAppStore';

export interface CreateAccountInput {
  name: string;
  initial_balance_satang: number;
  color_hex?: string;
}

export interface AccountSlice {
  accounts: AccountBalance[];
  totalSatang: number;
  loading: boolean;
  fetchAccounts: (db: SQLiteDatabase) => Promise<void>;
  createAccount: (db: SQLiteDatabase, input: CreateAccountInput) => Promise<void>;
  updateAccount: (db: SQLiteDatabase, input: UpdateAccountInput) => Promise<void>;
}

export const createAccountSlice: StateCreator<AppStore, [], [], AccountSlice> = (set, get) => ({
  accounts: [],
  totalSatang: 0,
  loading: false,

  fetchAccounts: async (db) => {
    set({ loading: true });
    try {
      const accounts = await listAccounts(db);
      set({
        accounts,
        totalSatang: accounts
          .filter((account) => account.is_active === 1)
          .reduce((sum, account) => sum + account.balance_satang, 0),
      });
    } finally {
      set({ loading: false });
    }
  },

  createAccount: async (db, input) => {
    await insertAccount(db, {
      id: randomUUID(),
      name: input.name,
      initial_balance_satang: input.initial_balance_satang,
      color_hex: input.color_hex,
    });
    await get().fetchAccounts(db);
  },

  updateAccount: async (db, input) => {
    await updateAccountRow(db, input);
    await get().fetchAccounts(db);
  },
});
