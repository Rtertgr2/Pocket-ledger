import type { Transaction } from '../types';

const THAI_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const TYPE_LABEL = { INCOME: 'รายรับ', EXPENSE: 'รายจ่าย', TRANSFER: 'โอนเงิน' } as const;

/** The line a user would say out loud: the note if there is one, otherwise the type. */
export function transactionTitle(transaction: Transaction): string {
  return transaction.note?.trim() || TYPE_LABEL[transaction.type];
}

/** Local calendar day key (`2026-10-29`), used to bucket transactions by the day the user saw. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "วันนี้" / "เมื่อวาน" / "28 ต.ค. 2026" — the section header for a day of transactions. */
export function formatDayLabel(date: Date, now: Date = new Date()): string {
  if (dayKey(date) === dayKey(now)) return 'วันนี้';
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKey(date) === dayKey(yesterday)) return 'เมื่อวาน';
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "14:05" in local time. */
export function formatTime(isoDate: string): string {
  const date = new Date(isoDate);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export interface TransactionSection {
  /** Stable key so `SectionList` does not re-render every row on each pass. */
  key: string;
  title: string;
  data: Transaction[];
}

/** Groups newest-first transactions into day sections, preserving their order. */
export function groupByDay(transactions: Transaction[], now: Date = new Date()): TransactionSection[] {
  const sections: TransactionSection[] = [];
  const byKey = new Map<string, TransactionSection>();

  for (const transaction of transactions) {
    const date = new Date(transaction.transaction_date);
    const key = dayKey(date);
    let section = byKey.get(key);
    if (!section) {
      section = { key, title: formatDayLabel(date, now), data: [] };
      byKey.set(key, section);
      sections.push(section);
    }
    section.data.push(transaction);
  }

  return sections;
}
