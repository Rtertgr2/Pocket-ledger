import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { spacing } from '../../theme';
import { addLocalDays, clampToToday, isFutureDay, startOfLocalDay, withLocalDay } from '../../utils/dates';
import { dayKey, formatDate } from '../../utils/formatters';
import { Chip } from './Chip';

interface DateFieldProps {
  /** The row's ISO date. Its local clock time is kept when only the day changes. */
  value: string;
  onChange: (iso: string) => void;
}

/**
 * The entry date: two shorthand chips plus the system date picker for anything older.
 * Picking a day never re-times the entry, so a back-dated row keeps the hour it was recorded at
 * and reports bucket by the day the user chose.
 */
export function DateField({ value, onChange }: DateFieldProps) {
  const styles = useStyles();
  const [showPicker, setShowPicker] = useState(false);

  const selected = new Date(value);
  const today = startOfLocalDay(new Date());
  const yesterday = addLocalDays(today, -1);
  const isToday = dayKey(selected) === dayKey(today);
  const isYesterday = dayKey(selected) === dayKey(yesterday);
  // A row saved with a future date (restored backup, clock change) must still be readable here.
  const isElsewhere = !isToday && !isYesterday;

  function pick(day: Date) {
    onChange(withLocalDay(selected, clampToToday(day)).toISOString());
  }

  return (
    <View style={styles.field}>
      <View style={styles.head}>
        <Text style={styles.label}>วันที่</Text>
        <Text style={styles.value}>{formatDate(selected)}</Text>
      </View>

      <View style={styles.chips}>
        <Chip label="วันนี้" selected={isToday} onPress={() => pick(today)} />
        <Chip label="เมื่อวาน" selected={isYesterday} onPress={() => pick(yesterday)} />
        <Chip
          label={isElsewhere ? formatDate(selected) : 'เลือกวันที่…'}
          selected={isElsewhere}
          onPress={() => setShowPicker(true)}
        />
      </View>

      {isElsewhere && !isFutureDay(selected) ? (
        <Text style={styles.hint}>บันทึกย้อนหลังเป็น {formatDate(selected)}</Text>
      ) : null}

      {showPicker ? (
        <DateTimePicker
          value={selected}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
          maximumDate={today}
          onChange={(event, day) => {
            setShowPicker(false);
            if (event.type === 'set' && day) pick(day);
          }}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  field: { gap: spacing.sm },
  head: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
  },
  label: { fontSize: 12, fontWeight: '600' as const, color: palette.muted },
  value: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
  hint: { fontSize: 12, color: palette.muted },
}));
