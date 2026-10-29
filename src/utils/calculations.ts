/** Month windows are [start, end) in local time, returned as UTC ISO strings for comparison. */
export function monthRange(year: number, monthIndex: number): { startIso: string; endIso: string } {
  return {
    startIso: new Date(year, monthIndex, 1).toISOString(),
    endIso: new Date(year, monthIndex + 1, 1).toISOString(),
  };
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Daily Burn Rate = eligible month expenses / days in the month, in whole satang. */
export function calculateDailyBurnRate(expenseSumSatang: number, dayCount: number): number {
  return dayCount > 0 ? Math.round(expenseSumSatang / dayCount) : 0;
}
