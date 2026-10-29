export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

/** Row shape of `accounts`. All money is integer satang (1 baht = 100). */
export interface Account {
  id: string;
  name: string;
  initial_balance_satang: number;
  color_hex: string;
  icon_name: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/** An account plus its derived balance, i.e. a row of `v_account_balances`. */
export interface AccountBalance extends Account {
  balance_satang: number;
}

/** Row shape of `transactions`. `destination_account_id` is set only for TRANSFER. */
export interface Transaction {
  id: string;
  account_id: string;
  destination_account_id: string | null;
  type: TransactionType;
  amount_satang: number;
  note: string | null;
  is_excluded_from_average: number;
  transaction_date: string;
  created_at: string;
}

export interface CreateAccountDTO {
  name: string;
  initial_balance_satang: number;
  color_hex?: string;
  icon_name?: string;
}

export interface CreateTransactionDTO {
  account_id: string;
  type: Exclude<TransactionType, 'TRANSFER'>;
  amount_satang: number;
  note?: string;
  is_excluded_from_average?: number;
  transaction_date?: string;
}

export interface TransferFundsDTO {
  account_id: string;
  destination_account_id: string;
  amount_satang: number;
  note?: string;
  transaction_date?: string;
}

export interface ReconcileBalanceDTO {
  account_id: string;
  actual_balance_satang: number;
}
