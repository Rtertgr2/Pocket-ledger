import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateDailyBurnRate, daysInMonth, monthRange } from './calculations.ts';

test('monthRange uses local month boundaries as UTC ISO', () => {
  const { startIso, endIso } = monthRange(2026, 10); // November 2026
  assert.equal(startIso, new Date(2026, 10, 1).toISOString());
  assert.equal(endIso, new Date(2026, 11, 1).toISOString());
});

test('daysInMonth handles leap years', () => {
  assert.equal(daysInMonth(2026, 1), 28);
  assert.equal(daysInMonth(2028, 1), 29);
  assert.equal(daysInMonth(2026, 9), 31);
});

test('burn rate spreads the month expenses over the whole month', () => {
  assert.equal(calculateDailyBurnRate(310000, 31), 10000); // 3,100.00 THB over 31 days
  assert.equal(calculateDailyBurnRate(0, 30), 0);
  assert.equal(calculateDailyBurnRate(100, 31), 3); // rounds to whole satang
});
