import assert from 'node:assert/strict';
import test from 'node:test';
import type { Account, Transaction } from '../../types';
import { buildBackup, missingAccountIds, parseBackup } from './format.ts';

function account(partial: Partial<Account> = {}): Account {
  return {
    id: 'a1',
    name: 'เงินสด',
    initial_balance_satang: 50000,
    color_hex: '#2E7D32',
    icon_name: 'wallet',
    is_active: 1,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...partial,
  };
}

function transaction(partial: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    account_id: 'a1',
    destination_account_id: null,
    type: 'EXPENSE',
    amount_satang: 1250,
    note: 'กาแฟ',
    category: 'อาหาร',
    is_excluded_from_average: 0,
    transaction_date: '2026-10-29T03:00:00.000Z',
    created_at: '2026-10-29T03:00:00.000Z',
    updated_at: '2026-10-29T03:00:00.000Z',
    ...partial,
  };
}

test('buildBackup wraps the snapshot and parseBackup reads it back unchanged', () => {
  const backup = buildBackup([account()], [transaction()], new Date('2026-10-30T10:00:00.000Z'));
  const result = parseBackup(JSON.stringify(backup));

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.backup.exportedAt, '2026-10-30T10:00:00.000Z');
  assert.deepEqual(result.backup.accounts, [account()]);
  assert.deepEqual(result.backup.transactions, [transaction()]);
});

test('parseBackup rejects files that are not ours, of another version, or unreadable', () => {
  assert.equal(parseBackup('not json').ok, false);

  const foreign = JSON.stringify({ format: 'other.app', version: 1, accounts: [], transactions: [] });
  assert.match(assertRejection(parseBackup(foreign)), /ไม่ใช่ไฟล์สำรองของ Pocket Ledger/);

  const future = JSON.stringify({ format: 'pocket-ledger.backup', version: 99, accounts: [], transactions: [] });
  assert.match(assertRejection(parseBackup(future)), /ยังไม่รองรับ/);

  const ancient = JSON.stringify({ format: 'pocket-ledger.backup', version: 0, accounts: [], transactions: [] });
  assert.match(assertRejection(parseBackup(ancient)), /ยังไม่รองรับ/);

  const missingList = JSON.stringify({ format: 'pocket-ledger.backup', version: 1, accounts: [] });
  assert.match(assertRejection(parseBackup(missingList)), /ไม่ครบถ้วน/);
});

test('parseBackup rejects bad rows instead of importing them', () => {
  const negative = buildBackup([account()], [{ ...transaction(), amount_satang: 0 }]);
  assert.match(assertRejection(parseBackup(JSON.stringify(negative))), /รายการลำดับที่ 1/);

  const transferWithoutDestination = buildBackup([account()], [
    { ...transaction(), type: 'TRANSFER', destination_account_id: null },
  ]);
  assert.match(assertRejection(parseBackup(JSON.stringify(transferWithoutDestination))), /รายการลำดับที่ 1/);

  const duplicate = buildBackup([account(), account()], []);
  assert.match(assertRejection(parseBackup(JSON.stringify(duplicate))), /บัญชีรหัสซ้ำ/);
});

test('parseBackup fills optional account columns so old files still restore', () => {
  const sparse = JSON.stringify({
    format: 'pocket-ledger.backup',
    version: 1,
    exportedAt: '2026-10-30T10:00:00.000Z',
    accounts: [{ id: 'a9', name: 'กระเป๋า', initial_balance_satang: 0 }],
    transactions: [],
  });

  const result = parseBackup(sparse);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.backup.accounts[0].color_hex, '#2E7D32');
  assert.equal(result.backup.accounts[0].is_active, 1);
});

test('parseBackup accepts a v1 file and fills updated_at from created_at', () => {
  // Shape of a file exported by 1.0.x: no `updated_at`, timestamps in SQLite's own format.
  const v1 = JSON.stringify({
    format: 'pocket-ledger.backup',
    version: 1,
    exportedAt: '2026-10-30T10:00:00.000Z',
    accounts: [
      { id: 'a9', name: 'กระเป๋า', initial_balance_satang: 0, created_at: '2026-10-01 00:00:00' },
    ],
    transactions: [
      {
        id: 't9',
        account_id: 'a9',
        type: 'EXPENSE',
        amount_satang: 500,
        transaction_date: '2026-10-29T03:00:00.000Z',
        created_at: '2026-10-29 03:00:00',
      },
    ],
  });

  const result = parseBackup(v1);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  // The backup is normalised to the current format, because that is what gets written to SQLite.
  assert.equal(result.backup.version, 2);
  assert.equal(result.backup.transactions[0].updated_at, '2026-10-29 03:00:00');
  assert.equal(result.backup.accounts[0].updated_at, '2026-10-01 00:00:00');
});

test('parseBackup keeps the edit time of a row that was edited', () => {
  const edited = transaction({ created_at: '2026-10-29 03:00:00', updated_at: '2026-10-30 09:15:00' });
  const result = parseBackup(JSON.stringify(buildBackup([account()], [edited])));

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.backup.transactions[0].created_at, '2026-10-29 03:00:00');
  assert.equal(result.backup.transactions[0].updated_at, '2026-10-30 09:15:00');
});

test('missingAccountIds reports accounts a transaction would point at but cannot find', () => {
  const backup = buildBackup(
    [account()],
    [
      transaction({ id: 't1' }),
      transaction({ id: 't2', account_id: 'ghost' }),
      transaction({ id: 't3', type: 'TRANSFER', destination_account_id: 'bank' }),
    ]
  );

  assert.deepEqual(missingAccountIds(backup, ['bank']), ['ghost']);
  assert.deepEqual(missingAccountIds(backup, []), ['ghost', 'bank']);
});

function assertRejection(result: ReturnType<typeof parseBackup>): string {
  assert.equal(result.ok, false);
  return result.ok ? '' : result.error;
}
