import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AccountPicker } from '../components/common/AccountPicker';
import { AmountInput } from '../components/common/AmountInput';
import { Button } from '../components/common/Button';
import { FormScreen } from '../components/common/FormScreen';
import { useToast } from '../components/common/Toast';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing } from '../theme';
import { formatBaht, parseAmountToSatang } from '../utils/money';

export default function ReconcileScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ accountId?: string }>();

  const accounts = useAppStore((s) => s.accounts).filter((account) => account.is_active === 1);
  const reconcileBalance = useAppStore((s) => s.reconcileBalance);

  const [accountId, setAccountId] = useState<string | null>(
    params.accountId ?? accounts[0]?.id ?? null
  );
  const [amountText, setAmountText] = useState('');
  const [saving, setSaving] = useState(false);

  const account = accounts.find((item) => item.id === accountId);
  const actual = parseAmountToSatang(amountText);
  const delta = actual !== null && account ? actual - account.balance_satang : null;
  const canSave = Boolean(accountId) && actual !== null && delta !== null && delta !== 0 && !saving;

  async function onSave() {
    if (!accountId || actual === null || delta === null || delta === 0) return;
    setSaving(true);
    try {
      await reconcileBalance(db, { account_id: accountId, actual_balance_satang: actual });
      showToast('ปรับยอดเรียบร้อย');
      router.back();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'ปรับยอดไม่สำเร็จ', 'error');
      setSaving(false);
    }
  }

  return (
    <FormScreen footer={<Button label={saving ? 'กำลังบันทึก…' : 'ยืนยันการปรับยอด'} onPress={onSave} disabled={!canSave} />}>
      <AccountPicker label="บัญชี" accounts={accounts} selectedId={accountId} onSelect={setAccountId} />

      {account ? (
        <Text style={styles.current}>
          ยอดในระบบตอนนี้ {formatBaht(account.balance_satang)}
        </Text>
      ) : null}

      <AmountInput value={amountText} onChangeText={setAmountText} placeholder="ยอดเงินจริง" />

      {delta === null ? (
        <Text style={styles.hint}>กรอกยอดเงินจริงในบัญชี เพื่อให้ระบบคำนวณส่วนต่าง</Text>
      ) : delta === 0 ? (
        <Text style={styles.hint}>ยอดตรงกับในระบบแล้ว ไม่มีอะไรต้องบันทึก</Text>
      ) : (
        <View style={styles.delta}>
          <Text style={styles.deltaLabel}>
            ระบบจะบันทึกเป็น{delta > 0 ? 'รายรับ' : 'รายจ่าย'}
          </Text>
          <Text style={[styles.deltaAmount, { color: delta > 0 ? colors.income : colors.expense }]}>
            {delta > 0 ? '+' : '-'}
            {formatBaht(Math.abs(delta))}
          </Text>
          <Text style={styles.hint}>รายการปรับยอดจะไม่ถูกนับในค่าเฉลี่ยรายวัน</Text>
        </View>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  current: { fontSize: 13, color: colors.muted },
  hint: { fontSize: 12, color: colors.muted },
  delta: { gap: spacing.xs, backgroundColor: colors.surfaceMuted, borderRadius: 14, padding: spacing.lg },
  deltaLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  deltaAmount: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
