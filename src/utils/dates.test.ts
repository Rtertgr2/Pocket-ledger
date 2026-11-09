import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addLocalDays,
  clampToToday,
  isFutureDay,
  startOfLocalDay,
  withLocalDay,
} from './dates.ts';
import { dayKey } from './formatters.ts';

test('withLocalDay keeps the clock time and moves only the calendar day', () => {
  const entry = new Date(2026, 9, 30, 16, 31);
  const moved = withLocalDay(entry, new Date(2026, 8, 5, 23, 59));

  assert.equal(moved.getFullYear(), 2026);
  assert.equal(moved.getMonth(), 8, 'September');
  assert.equal(moved.getDate(), 5);
  assert.equal(moved.getHours(), 16, 'the time the user recorded is preserved');
  assert.equal(moved.getMinutes(), 31);
});

test('a picked day survives the trip through the stored ISO string', () => {
  const picked = new Date(2026, 10, 10);
  const iso = withLocalDay(new Date(2026, 10, 9, 8, 0), picked).toISOString();

  // The bug this guards: `new Date('2026-11-10')` is UTC midnight, so the day can slip.
  assert.equal(dayKey(new Date(iso)), '2026-11-10');
  assert.equal(new Date(iso).getDate(), 10);
});

test('a late-evening entry keeps its own day and does not roll past midnight', () => {
  const iso = withLocalDay(new Date(2026, 9, 5, 23, 50), new Date(2026, 9, 1)).toISOString();
  const back = new Date(iso);

  assert.equal(dayKey(back), '2026-10-01', 'still the 1st where the user is');
  assert.equal(back.getHours(), 23, 'and still late at night');
});

test('isFutureDay compares local calendar days, not instants', () => {
  const lateToday = new Date(2026, 10, 9, 23, 30);
  const now = new Date(2026, 10, 9, 6, 0);

  assert.equal(isFutureDay(new Date(2026, 10, 10), now), true);
  assert.equal(isFutureDay(lateToday, now), false, 'tonight is not the future');
  assert.equal(isFutureDay(new Date(2026, 10, 8, 23, 59), now), false);
});

test('clampToToday pulls a future day back to now', () => {
  const now = new Date(2026, 10, 9, 12, 0);

  assert.equal(clampToToday(new Date(2026, 10, 20), now), now);
  const past = new Date(2026, 9, 1);
  assert.equal(clampToToday(past, now), past);
});

test('addLocalDays crosses months and years without touching the time', () => {
  const newYearsEve = new Date(2026, 11, 31, 21, 15);

  assert.equal(dayKey(addLocalDays(newYearsEve, 1)), '2027-01-01');
  assert.equal(addLocalDays(newYearsEve, 1).getHours(), 21);

  const marchFirst = new Date(2026, 2, 1, 9, 0);
  assert.equal(dayKey(addLocalDays(marchFirst, -1)), '2026-02-28', '2026 is not a leap year');
});

test('startOfLocalDay zeroes the clock time', () => {
  const start = startOfLocalDay(new Date(2026, 9, 30, 16, 31, 12, 300));

  assert.equal(dayKey(start), '2026-10-30');
  assert.equal(start.getHours(), 0);
  assert.equal(start.getMinutes(), 0);
  assert.equal(start.getMilliseconds(), 0);
});
