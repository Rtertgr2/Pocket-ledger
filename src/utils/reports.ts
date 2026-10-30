// Explicit .ts extensions: this module is imported by `node --test`, which resolves strictly.
import { categoryLabel } from '../categories.ts';
import type { ReportExpense, Transaction } from '../types';
import { daysInMonth } from './calculations.ts';
import { dayKey } from './formatters.ts';

export interface DailyTotal {
  /** 1-based day of the month, so the chart can label the axis without date maths. */
  day: number;
  satang: number;
}

/**
 * One bucket per day of the month. Days outside the month are skipped, and the bucket is chosen
 * from the local date so a late-night entry stays on the day the user saw.
 */
export function dailyExpenseTotals(
  expenses: ReportExpense[],
  year: number,
  monthIndex: number
): DailyTotal[] {
  const totals: DailyTotal[] = Array.from({ length: daysInMonth(year, monthIndex) }, (_, index) => ({
    day: index + 1,
    satang: 0,
  }));

  for (const expense of expenses) {
    const date = new Date(expense.transaction_date);
    if (date.getFullYear() !== year || date.getMonth() !== monthIndex) continue;
    const bucket = totals[date.getDate() - 1];
    if (bucket) bucket.satang += expense.amount_satang;
  }

  return totals;
}

export interface CategoryTotal {
  category: string;
  satang: number;
  /** 0..1 of the month's expenses; used for the bar width. */
  share: number;
}

/** Biggest first, uncategorised rows included under one label. */
export function categoryTotals(expenses: ReportExpense[]): CategoryTotal[] {
  const sums = new Map<string, number>();
  let total = 0;

  for (const expense of expenses) {
    const key = categoryLabel(expense.category);
    sums.set(key, (sums.get(key) ?? 0) + expense.amount_satang);
    total += expense.amount_satang;
  }

  return [...sums.entries()]
    .map(([category, satang]) => ({ category, satang, share: total > 0 ? satang / total : 0 }))
    .sort((a, b) => b.satang - a.satang || a.category.localeCompare(b.category));
}

/**
 * Today's expenses by category — the hero ring and its pills on the dashboard.
 * Same eligibility as every other report number (no transfers, no balance adjustments) so the
 * ring, the pills and the burn rate can never disagree, and the bucket is chosen from the local
 * day the user is looking at.
 */
export function todayExpenseTotals(transactions: Transaction[], now: Date = new Date()): CategoryTotal[] {
  const today = dayKey(now);
  const expenses = transactions.filter(
    (transaction) =>
      transaction.type === 'EXPENSE' &&
      transaction.is_excluded_from_average === 0 &&
      dayKey(new Date(transaction.transaction_date)) === today
  );
  return categoryTotals(expenses);
}

/** The tallest bar, used to scale every other bar to the chart height. */
export function peakDailyTotal(totals: DailyTotal[]): number {
  return totals.reduce((peak, total) => Math.max(peak, total.satang), 0);
}
