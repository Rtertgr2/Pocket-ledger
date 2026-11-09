import type { SQLiteDatabase } from 'expo-sqlite';
import type { ReportExpense, Transaction, TransactionType } from '../../types';

export interface InsertTransactionInput {
  id: string;
  account_id: string;
  destination_account_id?: string | null;
  type: TransactionType;
  amount_satang: number;
  note?: string | null;
  category?: string | null;
  is_excluded_from_average?: number;
  transaction_date: string;
  /** Only the undo path sets these: restoring a deleted row must keep its original timestamps. */
  created_at?: string | null;
  updated_at?: string | null;
}

/** Every editable column of a row, except the id and the timestamps. */
export interface UpdateTransactionInput {
  account_id: string;
  destination_account_id?: string | null;
  type: TransactionType;
  amount_satang: number;
  note?: string | null;
  category?: string | null;
  is_excluded_from_average?: number;
  transaction_date: string;
}

export async function insertTransaction(
  db: SQLiteDatabase,
  input: InsertTransactionInput
): Promise<void> {
  // `created_at` and `updated_at` come from the same clock inside one statement, so a new row
  // starts with them equal and only an edit can move `updated_at`. An undo passes the deleted
  // row's own values, so restoring it does not rewrite the row's history.
  await db.runAsync(
    `INSERT INTO transactions
       (id, account_id, destination_account_id, type, amount_satang, note, category,
        is_excluded_from_average, transaction_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), COALESCE(?, CURRENT_TIMESTAMP))`,
    input.id,
    input.account_id,
    input.destination_account_id ?? null,
    input.type,
    input.amount_satang,
    input.note ?? null,
    input.category ?? null,
    input.is_excluded_from_average ?? 0,
    input.transaction_date,
    input.created_at ?? null,
    input.updated_at ?? null
  );
}

/**
 * Rewrites an existing row; `created_at` is left alone so the audit trail keeps both ends.
 * Returns the number of rows changed — 0 means the id did not exist.
 */
export async function updateTransactionById(
  db: SQLiteDatabase,
  id: string,
  input: UpdateTransactionInput
): Promise<number> {
  const result = await db.runAsync(
    `UPDATE transactions
        SET account_id = ?, destination_account_id = ?, type = ?, amount_satang = ?,
            note = ?, category = ?, is_excluded_from_average = ?, transaction_date = ?,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    input.account_id,
    input.destination_account_id ?? null,
    input.type,
    input.amount_satang,
    input.note ?? null,
    input.category ?? null,
    input.is_excluded_from_average ?? 0,
    input.transaction_date,
    id
  );
  return result.changes;
}

/** One row by id, for the edit forms. The store's list is paged and filtered, so it cannot be trusted. */
export function getTransactionById(db: SQLiteDatabase, id: string): Promise<Transaction | null> {
  return db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', id);
}

/** Returns the number of rows removed; 0 means the id did not exist. */
export async function deleteTransactionById(db: SQLiteDatabase, id: string): Promise<number> {
  const result = await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
  return result.changes;
}

/** Total rows, not just the loaded pages — the settings screen reports the real size. */
export async function countTransactions(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM transactions');
  return row?.total ?? 0;
}

/**
 * What the ledger screen is filtering by. Every field is optional and they combine with AND.
 * `query` matches the note, the category and the source account's name, because those are the
 * three things a user can see on a row and would think to type. `from` is inclusive and `to` is
 * exclusive, both ISO instants, so a day range built from local midnights stays correct.
 */
export interface TransactionFilter {
  query?: string;
  type?: TransactionType;
  category?: string;
  accountId?: string;
  from?: string;
  to?: string;
}

/**
 * One WHERE for both the page query and the count, so "12 รายการ" can never disagree with the
 * rows below it — the mismatch is exactly the bug that filtering in JS would hide.
 */
function buildWhere(filter: TransactionFilter): { where: string; params: string[] } {
  const clauses: string[] = [];
  const params: string[] = [];

  if (filter.type) {
    clauses.push('t.type = ?');
    params.push(filter.type);
  }
  if (filter.category) {
    clauses.push('t.category = ?');
    params.push(filter.category);
  }
  if (filter.accountId) {
    // Transfers touch two accounts; a row belongs to either side of the move.
    clauses.push('(t.account_id = ? OR t.destination_account_id = ?)');
    params.push(filter.accountId, filter.accountId);
  }
  if (filter.from) {
    clauses.push('t.transaction_date >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    clauses.push('t.transaction_date < ?');
    params.push(filter.to);
  }
  const query = filter.query?.trim();
  if (query) {
    const like = `%${query}%`;
    clauses.push('(t.note LIKE ? OR t.category LIKE ? OR a.name LIKE ?)');
    params.push(like, like, like);
  }

  return { where: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

/**
 * One page of the ledger, filtered in SQL. Filtering in JS would only ever search the pages
 * already loaded, which is a wrong answer the user cannot see.
 */
export function searchTransactions(
  db: SQLiteDatabase,
  filter: TransactionFilter = {},
  limit = 200,
  offset = 0
): Promise<Transaction[]> {
  const { where, params } = buildWhere(filter);
  return db.getAllAsync<Transaction>(
    `SELECT t.* FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       ${where}
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset
  );
}

/** Every row the filter matches, not just the loaded pages. */
export async function countSearchResults(
  db: SQLiteDatabase,
  filter: TransactionFilter = {}
): Promise<number> {
  const { where, params } = buildWhere(filter);
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       ${where}`,
    ...params
  );
  return row?.total ?? 0;
}

/**
 * Income and expense per local day, over everything the filter matches. The ledger screen keeps
 * only the pages it has loaded, so a day's header must not be summed from those rows — a day with
 * more rows than one page would quietly show a total that is too small.
 *
 * The day key is the local date, matching `dayKey` in the formatters, so the numbers line up with
 * the section headers as well as with the reports.
 */
export function dayTotals(
  db: SQLiteDatabase,
  filter: TransactionFilter = {}
): Promise<{ day: string; income: number; expense: number }[]> {
  const { where, params } = buildWhere(filter);
  return db.getAllAsync<{ day: string; income: number; expense: number }>(
    `SELECT date(t.transaction_date, 'localtime') AS day,
            COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount_satang END), 0) AS income,
            COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount_satang END), 0) AS expense
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       ${where}
      GROUP BY day`,
    ...params
  );
}

/** Newest first. `created_at` breaks ties so two same-second rows keep a stable order. */
export function listTransactions(db: SQLiteDatabase, limit = 200, offset = 0): Promise<Transaction[]> {
  return searchTransactions(db, {}, limit, offset);
}

/** Burn-rate numerator: eligible EXPENSE rows inside [startIso, endIso). */
export async function sumExpensesInRange(
  db: SQLiteDatabase,
  startIso: string,
  endIso: string
): Promise<number> {
  const row = await db.getFirstAsync<{ satang: number }>(
    `SELECT COALESCE(SUM(amount_satang), 0) AS satang
       FROM transactions
      WHERE type = 'EXPENSE'
        AND is_excluded_from_average = 0
        AND transaction_date >= ?
        AND transaction_date < ?`,
    startIso,
    endIso
  );
  return row?.satang ?? 0;
}

/**
 * The first stat on the report screen: income in [startIso, endIso), with balance adjustments
 * left out so a reconcile never shows up as salary.
 */
export async function sumIncomeInRange(
  db: SQLiteDatabase,
  startIso: string,
  endIso: string
): Promise<number> {
  const row = await db.getFirstAsync<{ satang: number }>(
    `SELECT COALESCE(SUM(amount_satang), 0) AS satang
       FROM transactions
      WHERE type = 'INCOME'
        AND is_excluded_from_average = 0
        AND transaction_date >= ?
        AND transaction_date < ?`,
    startIso,
    endIso
  );
  return row?.satang ?? 0;
}

/**
 * The rows a report needs: eligible (not excluded) expenses in [startIso, endIso).
 * Deliberately mirrors `sumExpensesInRange` so a chart can never disagree with the burn rate.
 */
export function listExpensesInRange(
  db: SQLiteDatabase,
  startIso: string,
  endIso: string
): Promise<ReportExpense[]> {
  return db.getAllAsync<ReportExpense>(
    `SELECT amount_satang, category, transaction_date
       FROM transactions
      WHERE type = 'EXPENSE'
        AND is_excluded_from_average = 0
        AND transaction_date >= ?
        AND transaction_date < ?
      ORDER BY transaction_date ASC`,
    startIso,
    endIso
  );
}
