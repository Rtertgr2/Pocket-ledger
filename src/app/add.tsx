import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { categoriesFor } from '../categories';
import { AmountInput } from '../components/common/AmountInput';
import { Button } from '../components/common/Button';
import { Chip } from '../components/common/Chip';
import { FormScreen } from '../components/common/FormScreen';
import { Segmented } from '../components/common/Segmented';
import { TextField } from '../components/common/TextField';
import { useToast } from '../components/common/Toast';
import { makeStyles } from '../providers/ThemeProvider';
import { useAppStore } from '../store/useAppStore';
import { spacing } from '../theme';
import { parseAmountToSatang } from '../utils/money';

type EntryType = 'EXPENSE' | 'INCOME';

const TYPE_OPTIONS = [
  { key: 'EXPENSE', label: 'รายจ่าย' },
  { key: 'INCOME', label: 'รายรับ' },
] as const;

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
  const [category, setCategory] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(
    params.accountId ?? accounts[0]?.id ?? null
  );
  const [saving, setSaving] = useState(false);

  const satang = parseAmountToSatang(amountText);
  const canSave = Boolean(accountId) && satang !== null && satang > 0 && !saving;

  function switchType(next: EntryType) {
    setType(next);
    // The two lists share only "อื่น ๆ", so a category from the other side would be a typo.
    setCategory(null);
  }

  async function onSave() {
    if (!accountId || satang === null || satang <= 0) return;
    setSaving(true);
    try {
      await addTransaction(db, {
        account_id: accountId,
        type,
        amount_satang: satang,
        note: note.trim() || undefined,
        category: category ?? undefined,
      });
      showToast('บันทึกสำเร็จ');
      router.back();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ', 'error');
      setSaving(false);
    }
  }

  return (
    <FormScreen
      footer={<Button label={saving ? 'กำลังบันทึก…' : 'บันทึก'} onPress={onSave} disabled={!canSave} />}
    >
      <Segmented options={TYPE_OPTIONS} value={type} onChange={switchType} label="ประเภทรายการ" />

      <AmountInput value={amountText} onChangeText={setAmountText} />

      <View style={styles.field}>
        <Text style={styles.label}>บัญชี</Text>
        <View style={styles.chips}>
          {accounts.map((account) => (
            <Chip
              key={account.id}
              label={account.name}
              selected={account.id === accountId}
              onPress={() => setAccountId(account.id)}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>หมวดหมู่ (ไม่บังคับ)</Text>
        <View style={styles.chips}>
          {categoriesFor(type).map((option) => (
            <Chip
              key={option}
              label={option}
              selected={option === category}
              onPress={() => setCategory(option === category ? null : option)}
            />
          ))}
        </View>
      </View>

      <TextField
        label="หมายเหตุ (ไม่บังคับ)"
        value={note}
        onChangeText={setNote}
        placeholder="เช่น กาแฟเย็น"
        maxLength={120}
      />

      {amountText.length > 0 && (satang === null || satang === 0) ? (
        <Text style={styles.error}>จำนวนเงินไม่ถูกต้อง</Text>
      ) : null}
    </FormScreen>
  );
}

const useStyles = makeStyles((palette) => ({
  field: { gap: spacing.sm },
  label: { fontSize: 12, fontWeight: '600' as const, color: palette.muted },
  chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
  error: { fontSize: 12, color: palette.expense },
}));
