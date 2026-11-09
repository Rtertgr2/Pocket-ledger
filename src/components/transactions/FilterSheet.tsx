import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { radius, spacing } from '../../theme';
import { Button } from '../common/Button';
import { Chip } from '../common/Chip';
import { PressableScale } from '../common/PressableScale';

/** Type and date are the two filters that need a sheet; account and category stay quick chips. */
export type TypeFilter = 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type RangeFilter = 'ALL' | '7' | '30' | 'MONTH';
export type EditedFilter = 'ALL' | 'EDITED';

const TYPE_OPTIONS: { key: TypeFilter; label: string }[] = [
  { key: 'ALL', label: 'ทั้งหมด' },
  { key: 'EXPENSE', label: 'รายจ่าย' },
  { key: 'INCOME', label: 'รายรับ' },
  { key: 'TRANSFER', label: 'โอนเงิน' },
];

const RANGE_OPTIONS: { key: RangeFilter; label: string }[] = [
  { key: 'ALL', label: 'ทุกช่วงเวลา' },
  { key: '7', label: '7 วันล่าสุด' },
  { key: '30', label: '30 วันล่าสุด' },
  { key: 'MONTH', label: 'เดือนนี้' },
];

const EDITED_OPTIONS: { key: EditedFilter; label: string }[] = [
  { key: 'ALL', label: 'ทั้งหมด' },
  { key: 'EDITED', label: 'เฉพาะที่แก้ไข' },
];

interface FilterSheetProps {
  /** The applied filter, used as the starting draft. The parent mounts the sheet per opening. */
  type: TypeFilter;
  range: RangeFilter;
  edited: EditedFilter;
  onApply: (type: TypeFilter, range: RangeFilter, edited: EditedFilter) => void;
  onReset: () => void;
  onClose: () => void;
}

/**
 * The bottom sheet behind the funnel button. It only edits a draft; nothing is queried until
 * "ใช้ตัวกรอง" is pressed, so a half-set filter never flashes an empty ledger.
 */
export function FilterSheet({ type, range, edited, onApply, onReset, onClose }: FilterSheetProps) {
  const styles = useStyles();
  const { palette } = useTheme();
  const [draftType, setDraftType] = useState(type);
  const [draftRange, setDraftRange] = useState(range);
  const [draftEdited, setDraftEdited] = useState(edited);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="ปิดตัวกรอง">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <Text style={styles.title}>กรองรายการ</Text>
            <PressableScale accessibilityRole="button" accessibilityLabel="ปิด" onPress={onClose}>
              <Ionicons name="close" size={20} color={palette.muted} />
            </PressableScale>
          </View>

          <View style={styles.group}>
            <Text style={styles.groupLabel}>ประเภท</Text>
            <View style={styles.chips}>
              {TYPE_OPTIONS.map((option) => (
                <Chip
                  key={option.key}
                  label={option.label}
                  selected={option.key === draftType}
                  onPress={() => setDraftType(option.key)}
                />
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <Text style={styles.groupLabel}>ช่วงวันที่</Text>
            <View style={styles.chips}>
              {RANGE_OPTIONS.map((option) => (
                <Chip
                  key={option.key}
                  label={option.label}
                  selected={option.key === draftRange}
                  onPress={() => setDraftRange(option.key)}
                />
              ))}
            </View>
          </View>

          <View style={styles.group}>
            <Text style={styles.groupLabel}>สถานะ</Text>
            <View style={styles.chips}>
              {EDITED_OPTIONS.map((option) => (
                <Chip
                  key={option.key}
                  label={option.label}
                  selected={option.key === draftEdited}
                  onPress={() => setDraftEdited(option.key)}
                />
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <Button label="ล้างตัวกรอง" variant="secondary" onPress={onReset} style={styles.action} />
            <Button
              label="ใช้ตัวกรอง"
              onPress={() => onApply(draftType, draftRange, draftEdited)}
              style={styles.action}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((palette) => ({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end' as const,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: palette.bg,
  },
  handle: {
    alignSelf: 'center' as const,
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.border,
  },
  head: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  title: { fontSize: 18, fontWeight: '700' as const, color: palette.text },
  group: { gap: spacing.sm },
  groupLabel: { fontSize: 12, fontWeight: '600' as const, color: palette.muted },
  chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
  actions: { flexDirection: 'row' as const, gap: spacing.sm },
  action: { flex: 1 },
}));
