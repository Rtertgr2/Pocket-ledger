import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { FormScreen } from '../../components/common/FormScreen';
import { TextField } from '../../components/common/TextField';
import { useToast } from '../../components/common/Toast';
import { makeStyles } from '../../providers/ThemeProvider';
import { useAppStore } from '../../store/useAppStore';
import { ACCOUNT_COLORS, spacing } from '../../theme';
import { formatBaht } from '../../utils/money';

export default function EditAccountScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const styles = useStyles();
  const params = useLocalSearchParams<{ id?: string }>();

  const accounts = useAppStore((s) => s.accounts);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const account = accounts.find((item) => item.id === params.id);

  const [name, setName] = useState(account?.name ?? '');
  const [color, setColor] = useState<string>(account?.color_hex ?? ACCOUNT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  if (!account) {
    return (
      <FormScreen footer={<Button label="ปิด" variant="secondary" onPress={() => router.back()} />}>
        <Text style={styles.hint}>ไม่พบบัญชีนี้</Text>
      </FormScreen>
    );
  }

  const isActive = account.is_active === 1;

  async function save(nextActive: number) {
    if (saving) return;
    setSaving(true);
    try {
      await updateAccount(db, {
        id: account!.id,
        name: name.trim() || account!.name,
        color_hex: color,
        is_active: nextActive,
      });
      showToast(nextActive === 0 ? 'ปิดใช้งานบัญชีแล้ว' : 'บันทึกการแก้ไขแล้ว');
      router.back();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ', 'error');
      setSaving(false);
    }
  }

  return (
    <FormScreen footer={<Button label={saving ? 'กำลังบันทึก…' : 'บันทึก'} onPress={() => save(account.is_active)} disabled={saving} />}>
      <Card style={styles.summary}>
        <Text style={styles.balance}>{formatBaht(account.balance_satang)}</Text>
        <Text style={styles.hint}>
          {isActive ? 'ใช้งานอยู่' : 'ปิดใช้งานอยู่'} · ยอดนี้คำนวณจากรายการทั้งหมดของบัญชี
        </Text>
      </Card>

      <TextField label="ชื่อบัญชี" value={name} onChangeText={setName} maxLength={40} />

      <View style={styles.colors}>
        <Text style={styles.label}>สีการ์ด</Text>
        <View style={styles.swatches}>
          {ACCOUNT_COLORS.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={`สี ${option}`}
              accessibilityState={{ selected: option === color }}
              onPress={() => setColor(option)}
              style={[
                styles.swatch,
                { backgroundColor: option },
                option === color ? styles.swatchSelected : null,
              ]}
            />
          ))}
        </View>
      </View>

      <Button
        label={isActive ? 'ปิดใช้งานบัญชีนี้' : 'เปิดใช้งานบัญชีนี้'}
        variant={isActive ? 'danger' : 'primary'}
        onPress={() => save(isActive ? 0 : 1)}
        disabled={saving}
      />
      <Text style={styles.hint}>
        ปิดใช้งานแล้วบัญชีจะไม่ถูกนับในยอดรวมและไม่ให้เลือกบันทึกรายการ แต่ประวัติยังอยู่ครบ
      </Text>
    </FormScreen>
  );
}

const useStyles = makeStyles((palette) => ({
  summary: { gap: spacing.xs },
  balance: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  label: { fontSize: 13, fontWeight: '600' as const, color: palette.muted },
  colors: { gap: spacing.sm },
  swatches: { flexDirection: 'row' as const, gap: spacing.sm },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: 'transparent' },
  swatchSelected: { borderColor: palette.text },
  hint: { fontSize: 12, color: palette.muted },
}));
