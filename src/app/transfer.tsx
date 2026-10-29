import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AccountPicker } from '../components/common/AccountPicker';
import { AmountInput } from '../components/common/AmountInput';
import { Button } from '../components/common/Button';
import { FormScreen } from '../components/common/FormScreen';
import { TextField } from '../components/common/TextField';
import { useToast } from '../components/common/Toast';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';
import { parseAmountToSatang } from '../utils/money';

export default function TransferScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();

  const accounts = useAppStore((s) => s.accounts).filter((account) => account.is_active === 1);
  const transferFunds = useAppStore((s) => s.transferFunds);

  const [fromId, setFromId] = useState<string | null>(accounts[0]?.id ?? null);
  const [toId, setToId] = useState<string | null>(accounts[1]?.id ?? null);
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const satang = parseAmountToSatang(amountText);
  const canSave = Boolean(fromId && toId && fromId !== toId) && satang !== null && satang > 0 && !saving;

  async function onSave() {
    if (!fromId || !toId || satang === null || satang <= 0) return;
    setSaving(true);
    try {
      await transferFunds(db, {
        account_id: fromId,
        destination_account_id: toId,
        amount_satang: satang,
        note: note.trim() || undefined,
      });
      showToast('โอนเงินสำเร็จ');
      router.back();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'โอนเงินไม่สำเร็จ', 'error');
      setSaving(false);
    }
  }

  if (accounts.length < 2) {
    return (
      <FormScreen footer={<Button label="ปิด" variant="secondary" onPress={() => router.back()} />}>
        <Text style={styles.notice}>ต้องมีอย่างน้อย 2 บัญชีจึงจะโอนเงินได้</Text>
        <Button label="เพิ่มบัญชี" onPress={() => router.replace('/account/new')} />
      </FormScreen>
    );
  }

  return (
    <FormScreen footer={<Button label={saving ? 'กำลังบันทึก…' : 'ยืนยันการโอน'} onPress={onSave} disabled={!canSave} />}>
      <AmountInput value={amountText} onChangeText={setAmountText} />
      <AccountPicker label="จากบัญชี" accounts={accounts} selectedId={fromId} onSelect={setFromId} />
      <AccountPicker
        label="ไปยังบัญชี"
        accounts={accounts}
        selectedId={toId}
        onSelect={setToId}
        disabledId={fromId}
      />
      <TextField
        label="บันทึกช่วยจำ (ไม่บังคับ)"
        value={note}
        onChangeText={setNote}
        placeholder="เช่น ถอนเงินเข้าบัญชีหลัก"
        maxLength={120}
      />
      <Text style={styles.hint}>การโอนไม่นับเป็นรายจ่าย จึงไม่กระทบค่าเฉลี่ยต่อวัน</Text>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  notice: { fontSize: 14, color: colors.muted },
  hint: { fontSize: 12, color: colors.muted },
});
