import { create } from 'zustand';
import { createAccountSlice, type AccountSlice } from './slices/accountSlice';
import { createTransactionSlice, type TransactionSlice } from './slices/transactionSlice';

/** SQLite is the source of truth; this store only mirrors what it last read. No persist middleware. */
export type AppStore = AccountSlice & TransactionSlice;

export const useAppStore = create<AppStore>()((...args) => ({
  ...createAccountSlice(...args),
  ...createTransactionSlice(...args),
}));
