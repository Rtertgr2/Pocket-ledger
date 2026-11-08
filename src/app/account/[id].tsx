import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ColorSwatchPicker } from '../../components/common/ColorSwatchPicker';
import { FormScreen } from '../../components/common/FormScreen';
import { TextField } from '../../components/common/TextField';
import { useToast } from '../../components/common/Toast';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { useAppStore } from '../../store/useAppStore';
import { ACCOUNT_COLORS, radius, readableTextOn, spacing } from '../../theme';
import { formatBaht } from '../../utils/money';

export default function EditAccountScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { palette } = useTheme();
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
    <FormScreen
      footer={
        <Button
          label={saving ? 'กำลังบันทึก…' : 'บันทึก'}
          onPress={() => save(account.is_active)}
          disabled={saving}
        />
      }
    >
      <Card style={styles.summary}>
        <View style={styles.summaryTop}>
          <View style={[styles.badge, { backgroundColor: account.color_hex }]}>
            <Text style={[styles.badgeText, { color: readableTextOn(account.color_hex) }]}>
              {account.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: isActive ? palette.incomeSoft : palette.tile },
            ]}
          >
            <Text
              style={[styles.statusText, { color: isActive ? palette.income : palette.muted }]}
            >
              {isActive ? 'ใช้งานอยู่' : 'ปิดใช้งานอยู่'}
            </Text>
          </View>
        </View>
        <Text style={styles.balanceLabel}>ยอดคงเหลือ</Text>
        <Text style={styles.balance}>{formatBaht(account.balance_satang)}</Text>
        <Text style={styles.hint}>ยอดนี้คำนวณจากรายการทั้งหมดของบัญชี</Text>
      </Card>

      <TextField label="ชื่อบัญชี" value={name} onChangeText={setName} maxLength={40} />

      <View style={styles.field}>
        <Text style={styles.label}>สีการ์ด</Text>
        <ColorSwatchPicker value={color} onChange={setColor} />
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
  summaryTop: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.sm,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  badgeText: { fontSize: 15, fontWeight: '800' as const },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: { fontSize: 11, fontWeight: '700' as const },
  balanceLabel: { fontSize: 12, color: palette.muted },
  balance: {
    fontSize: 30,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  field: { gap: spacing.sm },
  label: { fontSize: 12, fontWeight: '600' as const, color: palette.muted },
  hint: { fontSize: 12, color: palette.muted },
}));
