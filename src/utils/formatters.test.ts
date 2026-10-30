import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDayLabel, groupByDay, transactionTitle } from './formatters.ts';
import { formatBaht, formatSatangGrouped } from './money.ts';
import type { Transaction } from '../types';

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: 't',
    account_id: 'cash',
    destination_account_id: null,
    type: 'EXPENSE',
    amount_satang: 100,
    note: null,
    category: null,
    is_excluded_from_average: 0,
    transaction_date: new Date(2026, 9, 29, 10, 0).toISOString(),
    created_at: '',
    ...partial,
  };
}

const now = new Date(2026, 9, 29, 18, 0);

test('formatDayLabel names today and yesterday, otherwise a Thai date', () => {
  assert.equal(formatDayLabel(new Date(2026, 9, 29, 0, 10), now), 'วันนี้');
  assert.equal(formatDayLabel(new Date(2026, 9, 28, 23, 50), now), 'เมื่อวาน');
  assert.equal(formatDayLabel(new Date(2026, 9, 20, 9, 0), now), '20 ต.ค. 2026');
});

test('groupByDay keeps newest-first order and one section per local day', () => {
  const transactions = [
    tx({ id: 'a', transaction_date: new Date(2026, 9, 29, 9, 0).toISOString() }),
    tx({ id: 'b', transaction_date: new Date(2026, 9, 29, 0, 10).toISOString() }),
    tx({ id: 'c', transaction_date: new Date(2026, 9, 28, 22, 0).toISOString() }),
  ];

  const sections = groupByDay(transactions, now);
  assert.deepEqual(
    sections.map((section) => [section.title, section.data.map((item) => item.id)]),
    [
      ['วันนี้', ['a', 'b']],
      ['เมื่อวาน', ['c']],
    ]
  );
});

test('transactionTitle prefers the note and falls back to the type', () => {
  assert.equal(transactionTitle(tx({ note: ' กาแฟ ' })), 'กาแฟ');
  assert.equal(transactionTitle(tx({ note: null, type: 'TRANSFER' })), 'โอนเงิน');
});

test('money formats with grouped thousands and a signed zero-safe fraction', () => {
  assert.equal(formatSatangGrouped(123456), '1,234.56');
  assert.equal(formatSatangGrouped(123456789), '1,234,567.89');
  assert.equal(formatSatangGrouped(-5050), '-50.50');
  assert.equal(formatBaht(0), '฿0.00');
});
