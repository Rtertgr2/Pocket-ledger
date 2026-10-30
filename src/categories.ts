/** Fixed expense categories. Kept as a constant list so reports and the form never disagree. */
export const EXPENSE_CATEGORIES = [
  'อาหาร',
  'เดินทาง',
  'บิล/ค่าบริการ',
  'ช้อปปิ้ง',
  'สุขภาพ',
  'บันเทิง',
  'อื่น ๆ',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Rows written before categories existed, and rows the user skipped, land here. */
export const UNCATEGORIZED_LABEL = 'ไม่ระบุหมวด';

export function categoryLabel(category: string | null | undefined): string {
  return category?.trim() || UNCATEGORIZED_LABEL;
}
