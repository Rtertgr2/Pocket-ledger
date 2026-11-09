#!/usr/bin/env node
/**
 * Phase 1 self-check. Runs the real DDL from src/services/db/schema.ts on a temp SQLite DB
 * with the host `sqlite3` CLI, so the schema and its constraints are verified without a device.
 * Usage: node scripts/check-phase1.mjs
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DDL, MIGRATIONS, POST_MIGRATION_DDL, SCHEMA_VERSION } from '../src/services/db/schema.ts';
import { formatSatang, parseAmountToSatang } from '../src/utils/money.ts';

const dir = mkdtempSync(join(tmpdir(), 'phase1-'));
const dbFile = join(dir, 'check.db');
const PRAGMAS = 'PRAGMA foreign_keys = ON;\n';
const SEED = `
INSERT INTO accounts (id, name, initial_balance_satang)
VALUES ('cash', 'เงินสด', 50000), ('kbank', 'KBank', 200000);
INSERT INTO transactions (id, account_id, type, amount_satang, transaction_date)
VALUES ('t1', 'cash', 'EXPENSE', 2000, '2026-10-29T10:00:00Z');
INSERT INTO transactions (id, account_id, destination_account_id, type, amount_satang, transaction_date)
VALUES ('t2', 'cash', 'kbank', 'TRANSFER', 10000, '2026-10-29T11:00:00Z');
`;

/** Runs SQL, returns parsed rows (requires the statement to produce output). */
function query(sql) {
  const out = execFileSync('sqlite3', ['-json', '-bail', dbFile], {
    input: PRAGMAS + sql,
    encoding: 'utf8',
  });
  return JSON.parse(out || '[]');
}

/** Runs SQL expected to violate a constraint. */
function mustFail(sql) {
  assert.throws(
    () => execFileSync('sqlite3', ['-bail', dbFile], { input: PRAGMAS + sql, stdio: 'pipe' }),
    undefined,
    `expected SQLite to reject: ${sql}`
  );
}

try {
  // Fresh install: DDL, no migrations, then the post-migration index statements (initDatabase's order).
  execFileSync('sqlite3', ['-bail', dbFile], {
    input:
      PRAGMAS +
      [...DDL, ...POST_MIGRATION_DDL].map((s) => `${s};`).join('\n') +
      SEED,
  });

  assert.equal(
    query("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND name='idx_transactions_category'")[0].n,
    1,
    'a fresh install gets the category index'
  );

  // Balances are derived from transactions, in integer satang.
  assert.deepEqual(
    query("SELECT id, balance_satang AS b FROM v_account_balances ORDER BY id").map((r) => [r.id, r.b]),
    [
      ['cash', 38000],
      ['kbank', 210000],
    ],
    'derived balances'
  );

  // Deleting a transaction restores the balance — there is no rollback code to get wrong.
  query(`INSERT INTO transactions (id, account_id, type, amount_satang, transaction_date)
         VALUES ('t4', 'cash', 'EXPENSE', 500, '2026-10-29T12:00:00Z')`);
  assert.equal(query("SELECT balance_satang FROM v_account_balances WHERE id = 'cash'")[0].balance_satang, 37500);
  query("DELETE FROM transactions WHERE id = 't4'");
  assert.equal(query("SELECT balance_satang FROM v_account_balances WHERE id = 'cash'")[0].balance_satang, 38000);

  // Burn-rate numerator: EXPENSE only, excludes TRANSFER and excluded rows.
  assert.equal(
    query(`SELECT COUNT(*) AS n, SUM(amount_satang) AS s FROM transactions
           WHERE type = 'EXPENSE' AND is_excluded_from_average = 0
             AND transaction_date >= '2026-10-01' AND transaction_date < '2026-11-01'`)[0].s,
    2000,
    'monthly eligible expense sum must ignore the transfer'
  );

  // Schema constraints.
  mustFail(`INSERT INTO transactions (id, account_id, type, amount_satang, transaction_date)
            VALUES ('bad1', 'cash', 'EXPENSE', 0, '2026-10-29T12:00:00Z')`);
  mustFail(`INSERT INTO transactions (id, account_id, type, amount_satang, transaction_date)
            VALUES ('bad2', 'ghost', 'EXPENSE', 100, '2026-10-29T12:00:00Z')`);
  mustFail(`INSERT INTO transactions (id, account_id, destination_account_id, type, amount_satang, transaction_date)
            VALUES ('bad3', 'cash', 'cash', 'TRANSFER', 100, '2026-10-29T12:00:00Z')`);
  mustFail(`INSERT INTO transactions (id, account_id, type, amount_satang, transaction_date)
            VALUES ('bad4', 'cash', 'TRANSFER', 100, '2026-10-29T12:00:00Z')`);
  mustFail(`DELETE FROM accounts WHERE id = 'cash'`); // ON DELETE RESTRICT keeps history

  // Money parsing / formatting (pure JS, no float multiplication).
  const cases = [
    ['1,234.56', 123456],
    ['1234.56', 123456],
    ['12', 1200],
    ['12,5', 1250],
    ['0.005', 1],
    ['0', 0],
    ['1.005', 101],
  ];
  for (const [input, expected] of cases) {
    assert.equal(parseAmountToSatang(input), expected, `parse ${input}`);
  }
  for (const bad of ['', 'abc', '-5', '1.2.3', '1,2,3']) {
    assert.equal(parseAmountToSatang(bad), null, `reject ${bad}`);
  }
  assert.equal(formatSatang(123456), '1234.56');
  assert.equal(formatSatang(-5), '-0.05');
  assert.equal(formatSatang(0), '0.00');

  // sumExpensesInRange's statement: excluded rows and transfers never enter the numerator.
  query(`INSERT INTO transactions (id, account_id, type, amount_satang, transaction_date, is_excluded_from_average)
         VALUES ('t3', 'kbank', 'EXPENSE', 999900, '2026-10-15T03:00:00Z', 1)`);
  assert.equal(
    query(`SELECT COALESCE(SUM(amount_satang),0) AS s FROM transactions
           WHERE type='EXPENSE' AND is_excluded_from_average=0
             AND transaction_date >= '2026-10-01T00:00:00.000Z' AND transaction_date < '2026-11-01T00:00:00.000Z'`)[0].s,
    2000,
    'excluded expense must not enter the burn-rate numerator'
  );
  assert.equal(
    query(`SELECT COALESCE(SUM(amount_satang),0) AS s FROM transactions
           WHERE type='EXPENSE' AND is_excluded_from_average=0
             AND transaction_date >= '2026-11-01T00:00:00.000Z'`)[0].s,
    0,
    'a month with no eligible expenses sums to zero'
  );

  // Deleting one transfer row restores both sides, because balances are derived.
  assert.equal(query("SELECT balance_satang AS b FROM v_account_balances WHERE id='cash'")[0].b, 38000);
  assert.equal(query("SELECT balance_satang AS b FROM v_account_balances WHERE id='kbank'")[0].b, -789900);
  query("DELETE FROM transactions WHERE id = 't2'");
  assert.equal(query("SELECT balance_satang AS b FROM v_account_balances WHERE id='cash'")[0].b, 48000);
  assert.equal(query("SELECT balance_satang AS b FROM v_account_balances WHERE id='kbank'")[0].b, -799900);

  // clearLedger's order: transactions first (accounts are ON DELETE RESTRICT), then accounts.
  // The statement order is what makes "ล้างข้อมูลทั้งหมด" possible at all.
  query('DELETE FROM transactions');
  query('DELETE FROM accounts');
  assert.equal(query('SELECT COUNT(*) AS n FROM transactions')[0].n, 0, 'clearLedger empties transactions');
  assert.equal(query('SELECT COUNT(*) AS n FROM accounts')[0].n, 0, 'clearLedger empties accounts');

  // The ledger's day headers come from one aggregate over the whole filtered set (`dayTotals`),
  // not from the loaded page. The day key must be the local date — the same key `dayKey` builds —
  // or a header would not match the section it sits above.
  query(`
    INSERT INTO accounts (id, name, initial_balance_satang) VALUES ('day', 'วัน', 0), ('day2', 'อีกวัน', 0);
    INSERT INTO transactions (id, account_id, destination_account_id, type, amount_satang, transaction_date, created_at, updated_at) VALUES
      ('d1', 'day', NULL, 'EXPENSE', 2500, '2026-10-29T03:00:00Z', '2026-10-29T03:00:00Z', '2026-10-29T03:00:00Z'),
      ('d2', 'day', NULL, 'EXPENSE', 1500, '2026-10-29T04:00:00Z', '2026-10-29T04:00:00Z', '2026-10-29T09:15:00Z'),
      ('d3', 'day', NULL, 'INCOME', 90000, '2026-10-29T05:00:00Z', '2026-10-29T05:00:00Z', '2026-10-29T05:00:00Z'),
      ('d4', 'day', 'day2', 'TRANSFER', 1000, '2026-10-29T06:00:00Z', '2026-10-29T06:00:00Z', '2026-10-29T06:00:00Z');
  `);

  const localDay = (iso) => {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const dayRows = query(`
    SELECT date(t.transaction_date, 'localtime') AS day,
           COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount_satang END), 0) AS income,
           COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount_satang END), 0) AS expense
      FROM transactions t JOIN accounts a ON a.id = t.account_id
     GROUP BY day
  `);
  assert.equal(dayRows.length, 1, 'one local day of rows is one section');
  assert.equal(dayRows[0].day, localDay('2026-10-29T03:00:00Z'), 'the day key is the local date');
  assert.equal(dayRows[0].expense, 4000, 'expense totals add up; transfers are not spending');
  assert.equal(dayRows[0].income, 90000, 'income totals add up; transfers are not income');

  // The "edited" filter (S1) and the "แก้ไขแล้ว" badge (S2) read the same predicate: a row whose
  // updated_at moved past the moment it was saved. A row saved and never touched is not edited.
  const editedRows = query(
    `SELECT id FROM transactions WHERE updated_at IS NOT NULL AND updated_at > created_at ORDER BY id`
  );
  assert.deepEqual(
    editedRows.map((row) => row.id),
    ['d2'],
    'only a row written after its creation counts as edited'
  );

  // Migration v2 -> v3: the path an installed 1.0.x device takes on first launch after update.
  // The old database is built from today's DDL with what v3 added removed, so the test cannot drift.
  const migrateFile = join(dir, 'migrate.db');
  const migrate = (sql) =>
    execFileSync('sqlite3', ['-json', '-bail', migrateFile], {
      input: PRAGMAS + sql,
      encoding: 'utf8',
    });
  const migrateRows = (sql) => JSON.parse(migrate(sql) || '[]');

  migrate(
    DDL.map((s) => `${s};`).join('\n') +
      `
      ALTER TABLE transactions DROP COLUMN updated_at;
      PRAGMA user_version = 2;
      INSERT INTO accounts (id, name, initial_balance_satang) VALUES ('old', 'เดิม', 10000);
      INSERT INTO transactions (id, account_id, type, amount_satang, transaction_date, created_at)
        VALUES ('oldt', 'old', 'EXPENSE', 2500, '2026-10-29T10:00:00Z', '2026-10-29 03:00:00');
      `
  );

  migrate(
    [...(MIGRATIONS[3] ?? []), ...POST_MIGRATION_DDL].map((s) => `${s};`).join('\n') +
      `\nPRAGMA user_version = ${SCHEMA_VERSION};`
  );

  const columns = migrateRows("SELECT name FROM pragma_table_info('transactions')").map((r) => r.name);
  assert.ok(columns.includes('updated_at'), 'migration adds transactions.updated_at');
  assert.deepEqual(
    migrateRows("SELECT created_at, updated_at FROM transactions WHERE id = 'oldt'")[0],
    { created_at: '2026-10-29 03:00:00', updated_at: '2026-10-29 03:00:00' },
    'existing rows keep their data and are backfilled from created_at'
  );
  assert.equal(
    migrateRows("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND name='idx_transactions_category'")[0].n,
    1,
    'migration creates the category index'
  );
  assert.equal(migrateRows('PRAGMA user_version')[0].user_version, SCHEMA_VERSION);
  assert.equal(
    migrateRows('SELECT COUNT(*) AS n FROM transactions')[0].n,
    1,
    'migration must not lose existing rows'
  );

  // The edit path (updateTransactionById's statement): updated_at moves, created_at stays,
  // and the derived balance follows the new amount without any extra bookkeeping.
  migrate(`UPDATE transactions
             SET amount_satang = 3000, updated_at = CURRENT_TIMESTAMP
           WHERE id = 'oldt'`);
  const edited = migrateRows(
    "SELECT created_at, updated_at, amount_satang FROM transactions WHERE id = 'oldt'"
  )[0];
  assert.equal(edited.created_at, '2026-10-29 03:00:00', 'an edit must not touch created_at');
  assert.ok(edited.updated_at > '2026-10-29 03:00:00', 'an edit must move updated_at');
  assert.equal(edited.amount_satang, 3000);
  assert.equal(
    migrateRows("SELECT balance_satang AS b FROM v_account_balances WHERE id = 'old'")[0].b,
    7000,
    'balance follows the edited amount (10000 - 3000)'
  );

  // Upgrade straight from v1 (an install that never took 1.0.1): category arrives in v2, then
  // updated_at in v3. This is the path that breaks if an index on a migrated column lives in DDL.
  const v1File = join(dir, 'migrate-v1.db');
  const migrateV1 = (sql) =>
    execFileSync('sqlite3', ['-json', '-bail', v1File], {
      input: PRAGMAS + sql,
      encoding: 'utf8',
    });
  const migrateV1Rows = (sql) => JSON.parse(migrateV1(sql) || '[]');

  migrateV1(
    DDL.map((s) => `${s};`).join('\n') +
      `
      ALTER TABLE transactions DROP COLUMN updated_at;
      ALTER TABLE transactions DROP COLUMN category;
      PRAGMA user_version = 1;
      INSERT INTO accounts (id, name, initial_balance_satang) VALUES ('old', 'เดิม', 10000);
      INSERT INTO transactions (id, account_id, type, amount_satang, transaction_date, created_at)
        VALUES ('oldt', 'old', 'EXPENSE', 2500, '2026-10-29T10:00:00Z', '2026-10-29 03:00:00');
      `
  );

  migrateV1(
    [...(MIGRATIONS[2] ?? []), ...(MIGRATIONS[3] ?? []), ...POST_MIGRATION_DDL]
      .map((s) => `${s};`)
      .join('\n')
  );

  const v1Columns = migrateV1Rows("SELECT name FROM pragma_table_info('transactions')").map((r) => r.name);
  assert.ok(v1Columns.includes('category'), 'v1 -> v3 adds category');
  assert.ok(v1Columns.includes('updated_at'), 'v1 -> v3 adds updated_at');
  assert.equal(
    migrateV1Rows("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='index' AND name='idx_transactions_category'")[0].n,
    1,
    'v1 -> v3 creates the category index'
  );
  assert.equal(
    migrateV1Rows('SELECT COUNT(*) AS n FROM transactions')[0].n,
    1,
    'v1 -> v3 must not lose existing rows'
  );

  console.log(
    'Phase 1 check passed: schema, constraints, derived balances, transfer exclusion, ledger wipe, money parsing, v2->v3 and v1->v3 migrations.'
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
