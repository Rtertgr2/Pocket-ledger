/** Fixed category lists. Kept as constants so reports and the form never disagree. */
export const EXPENSE_CATEGORIES = [
  'อาหาร',
  'เดินทาง',
  'บิล/ค่าบริการ',
  'ช้อปปิ้ง',
  'สุขภาพ',
  'ที่พัก',
  'บันเทิง',
  'อื่น ๆ',
] as const;

export const INCOME_CATEGORIES = ['เงินเดือน', 'รายได้เสริม', 'ขายของ', 'ของขวัญ', 'อื่น ๆ'] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

/** Rows written before categories existed, and rows the user skipped, land here. */
export const UNCATEGORIZED_LABEL = 'ไม่ระบุหมวด';

export function categoriesFor(type: 'INCOME' | 'EXPENSE'): readonly string[] {
  return type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function categoryLabel(category: string | null | undefined): string {
  return category?.trim() || UNCATEGORIZED_LABEL;
}
