import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AccountPicker } from '../components/common/AccountPicker';
import { AmountInput } from '../components/common/AmountInput';
import { Button } from '../components/common/Button';
import { FormScreen } from '../components/common/FormScreen';
import { TextField } from '../components/common/TextField';
import { useToast } from '../components/common/Toast';
import { makeStyles } from '../providers/ThemeProvider';
import { useAppStore } from '../store/useAppStore';
import { radius, spacing } from '../theme';
import { parseAmountToSatang } from '../utils/money';

type EntryType = 'EXPENSE' | 'INCOME';

export default function AddTransactionScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const styles = useStyles();
  const params = useLocalSearchParams<{ accountId?: string }>();

  const accounts = useAppStore((s) => s.accounts).filter((account) => account.is_active === 1);
  const addTransaction = useAppStore((s) => s.addTransaction);

  const [type, setType] = useState<EntryType>('EXPENSE');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState<string | null>(
    params.accountId ?? accounts[0]?.id ?? null
  );
  const [saving, setSaving] = useState(false);

  const satang = parseAmountToSatang(amountText);
  const canSave = Boolean(accountId) && satang !== null && satang > 0 && !saving;

  async function onSave() {
    if (!accountId || satang === null || satang <= 0) return;
    setSaving(true);
    try {
      await addTransaction(db, {
        account_id: accountId,
        type,
        amount_satang: satang,
        note: note.trim() || undefined,
      });
      showToast('บันทึกสำเร็จ');
      router.back();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ', 'error');
      setSaving(false);
    }
  }

  return (
    <FormScreen footer={<Button label={saving ? 'กำลังบันทึก…' : 'บันทึก'} onPress={onSave} disabled={!canSave} />}>
      <View style={styles.toggle}>
        {(['EXPENSE', 'INCOME'] as const).map((option) => {
          const selected = option === type;
          return (
            <Pressable
              key={option}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setType(option)}
              style={[styles.toggleItem, selected ? styles.toggleSelected : null]}
            >
              <Text style={[styles.toggleLabel, selected ? styles.toggleLabelSelected : null]}>
                {option === 'EXPENSE' ? 'รายจ่าย' : 'รายรับ'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <AmountInput value={amountText} onChangeText={setAmountText} />

      <AccountPicker label="บัญชี" accounts={accounts} selectedId={accountId} onSelect={setAccountId} />

      <TextField
        label="บันทึกช่วยจำ (ไม่บังคับ)"
        value={note}
        onChangeText={setNote}
        placeholder="เช่น กาแฟ, ค่าโดยสาร"
        maxLength={120}
      />

      {amountText.length > 0 && (satang === null || satang === 0) ? (
        <Text style={styles.error}>จำนวนเงินไม่ถูกต้อง</Text>
      ) : null}
    </FormScreen>
  );
}

const useStyles = makeStyles((palette) => ({
  toggle: {
    flexDirection: 'row' as const,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  toggleItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center' as const,
  },
  toggleSelected: { backgroundColor: palette.surface },
  toggleLabel: { fontSize: 14, fontWeight: '600' as const, color: palette.muted },
  toggleLabelSelected: { color: palette.text },
  error: { fontSize: 12, color: palette.expense },
}));
