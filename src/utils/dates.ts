// Explicit .ts extensions: this module is imported by `node --test`, which resolves strictly.
import { dayKey } from './formatters.ts';

/**
 * Midnight of the local day `date` falls on. Built from local parts on purpose: the ledger
 * buckets by the day the user saw, not by UTC.
 */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** `date` shifted by whole local days, keeping its clock time (safe across month boundaries). */
export function addLocalDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  );
}

/** True when `date`'s local day is later than `now`'s local day. */
export function isFutureDay(date: Date, now: Date = new Date()): boolean {
  // Zero-padded `YYYY-MM-DD` sorts lexically, so no date arithmetic is needed.
  return dayKey(date) > dayKey(now);
}

/** Clamps a picked day to today, so a picker quirk can never write a future-dated row. */
export function clampToToday(day: Date, now: Date = new Date()): Date {
  return isFutureDay(day, now) ? now : day;
}

/**
 * The same clock time on another calendar day.
 *
 * This exists because `new Date('2026-11-10')` parses as UTC midnight, which is 07:00 on the 10th
 * in UTC+7 — and 23:00 on the 9th in UTC−5. Building from local parts keeps the day the user
 * tapped, which is what the reports bucket by.
 */
export function withLocalDay(timeSource: Date, day: Date): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
    timeSource.getMilliseconds()
  );
}
