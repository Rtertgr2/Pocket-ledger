import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReportExpense, Transaction } from '../types';
import {
  categoryTotals,
  dailyExpenseTotals,
  peakDailyTotal,
  todayExpenseTotals,
} from './reports.ts';

function expense(partial: Partial<ReportExpense>): ReportExpense {
  return {
    amount_satang: 1000,
    category: 'อาหาร',
    transaction_date: new Date(2026, 9, 5, 12, 0).toISOString(),
    ...partial,
  };
}

test('dailyExpenseTotals buckets by local day for the requested month only', () => {
  const totals = dailyExpenseTotals(
    [
      expense({ amount_satang: 1500, transaction_date: new Date(2026, 9, 5, 0, 10).toISOString() }),
      expense({ amount_satang: 500, transaction_date: new Date(2026, 9, 5, 23, 50).toISOString() }),
      expense({ amount_satang: 9000, transaction_date: new Date(2026, 8, 30, 12, 0).toISOString() }),
    ],
    2026,
    9
  );

  assert.equal(totals.length, 31, 'October has 31 buckets');
  assert.equal(totals[4].satang, 2000, 'both 5th-of-month rows land in one bucket');
  assert.equal(totals[3].satang, 0);
  assert.equal(
    totals.reduce((sum, day) => sum + day.satang, 0),
    2000,
    'the September row is excluded'
  );
});

test('dailyExpenseTotals respects month length in February', () => {
  assert.equal(dailyExpenseTotals([], 2028, 1).length, 29);
  assert.equal(dailyExpenseTotals([], 2026, 1).length, 28);
});

test('categoryTotals sums by label, folds null into one bucket and sorts by amount', () => {
  const totals = categoryTotals([
    expense({ category: 'อาหาร', amount_satang: 1000 }),
    expense({ category: 'เดินทาง', amount_satang: 3000 }),
    expense({ category: 'อาหาร', amount_satang: 1000 }),
    expense({ category: null, amount_satang: 1000 }),
  ]);

  assert.deepEqual(
    totals.map((entry) => [entry.category, entry.satang]),
    [
      ['เดินทาง', 3000],
      ['อาหาร', 2000],
      ['ไม่ระบุหมวด', 1000],
    ]
  );
  assert.equal(totals[0].share, 0.5, '3000 of 6000 total');
  assert.equal(
    totals.reduce((sum, entry) => sum + entry.share, 0).toFixed(2),
    '1.00'
  );
});

test('categoryTotals on an empty month reports nothing rather than dividing by zero', () => {
  assert.deepEqual(categoryTotals([]), []);
});

function transaction(partial: Partial<Transaction>): Transaction {
  const now = new Date(2026, 9, 30, 13, 0);
  return {
    id: 't1',
    account_id: 'a1',
    destination_account_id: null,
    type: 'EXPENSE',
    amount_satang: 1000,
    note: null,
    category: 'อาหาร',
    is_excluded_from_average: 0,
    transaction_date: now.toISOString(),
    created_at: now.toISOString(),
    ...partial,
  };
}

test('todayExpenseTotals keeps only today\u2019s eligible expenses, grouped by category', () => {
  const now = new Date(2026, 9, 30, 13, 0);
  const totals = todayExpenseTotals(
    [
      transaction({ amount_satang: 1000, transaction_date: new Date(2026, 9, 30, 8, 0).toISOString() }),
      transaction({ amount_satang: 500, transaction_date: new Date(2026, 9, 30, 9, 30).toISOString() }),
      transaction({ amount_satang: 9999, transaction_date: new Date(2026, 9, 29, 15, 0).toISOString() }),
      transaction({ amount_satang: 777, is_excluded_from_average: 1 }),
      transaction({ amount_satang: 444, type: 'INCOME' }),
      transaction({ amount_satang: 321, type: 'TRANSFER' }),
    ],
    now
  );

  assert.deepEqual(
    totals.map((entry) => [entry.category, entry.satang]),
    [['อาหาร', 1500]],
    'yesterday, adjustments, income and transfers never reach the ring'
  );
  assert.equal(totals[0].share, 1);
});

test('todayExpenseTotals on an empty day reports nothing', () => {
  assert.deepEqual(todayExpenseTotals([], new Date(2026, 9, 30)), []);
});

test('peakDailyTotal finds the tallest bar', () => {
  assert.equal(peakDailyTotal([{ day: 1, satang: 0 }, { day: 2, satang: 700 }]), 700);
  assert.equal(peakDailyTotal([]), 0);
});
