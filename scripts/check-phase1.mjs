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
import { DDL } from '../src/services/db/schema.ts';
import { formatSatang, parseAmountToSatang } from '../src/utils/money.ts';

const dir = mkdtempSync(join(tmpdir(), 'phase1-'));
const dbFile = join(dir, 'check.db');
const PRAGMAS = 'PRAGMA foreign_keys = ON;\n';
const SEED = `
INSERT INTO accounts (id, name, initial_balance_satang, current_balance_satang)
VALUES ('cash', 'เงินสด', 50000, 50000), ('kbank', 'KBank', 200000, 200000);
INSERT INTO transactions (id, account_id, type, amount_satang, transaction_date)
VALUES ('t1', 'cash', 'EXPENSE', 2000, '2026-10-29T10:00:00Z');
UPDATE accounts SET current_balance_satang = current_balance_satang - 2000 WHERE id = 'cash';
INSERT INTO transactions (id, account_id, destination_account_id, type, amount_satang, transaction_date)
VALUES ('t2', 'cash', 'kbank', 'TRANSFER', 10000, '2026-10-29T11:00:00Z');
UPDATE accounts SET current_balance_satang = current_balance_satang - 10000 WHERE id = 'cash';
UPDATE accounts SET current_balance_satang = current_balance_satang + 10000 WHERE id = 'kbank';
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
  execFileSync('sqlite3', ['-bail', dbFile], {
    input: PRAGMAS + DDL.map((s) => `${s};`).join('\n') + SEED,
  });

  // Balances follow the inserts above, in integer satang.
  assert.deepEqual(
    query("SELECT id, current_balance_satang AS b FROM accounts ORDER BY id").map((r) => [r.id, r.b]),
    [
      ['cash', 38000],
      ['kbank', 210000],
    ],
    'account balances'
  );

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

  console.log('Phase 1 check passed: schema, constraints, balances, transfer exclusion, money parsing.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
