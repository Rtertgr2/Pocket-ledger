import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AmountInput } from '../../components/common/AmountInput';
import { Button } from '../../components/common/Button';
import { FormScreen } from '../../components/common/FormScreen';
import { TextField } from '../../components/common/TextField';
import { useToast } from '../../components/common/Toast';
import { useAppStore } from '../../store/useAppStore';
import { colors, spacing } from '../../theme';
import { parseAmountToSatang } from '../../utils/money';

export default function NewAccountScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const createAccount = useAppStore((s) => s.createAccount);

  const [name, setName] = useState('');
  const [balanceText, setBalanceText] = useState('');
  const [saving, setSaving] = useState(false);

  // An empty balance field means "start at zero"; anything typed must parse.
  const initialSatang = balanceText.trim() === '' ? 0 : parseAmountToSatang(balanceText);
  const canSave = name.trim().length > 0 && initialSatang !== null && !saving;

  async function onSave() {
    if (!canSave || initialSatang === null) return;
    setSaving(true);
    try {
      await createAccount(db, {
        name: name.trim(),
        initial_balance_satang: initialSatang,
      });
      showToast('เพิ่มบัญชีสำเร็จ');
      router.back();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'เพิ่มบัญชีไม่สำเร็จ', 'error');
      setSaving(false);
    }
  }

  return (
    <FormScreen footer={<Button label={saving ? 'กำลังบันทึก…' : 'สร้างบัญชี'} onPress={onSave} disabled={!canSave} />}>
      <TextField
        label="ชื่อบัญชี"
        value={name}
        onChangeText={setName}
        placeholder="เช่น KBank, เงินสด, TrueMoney"
        autoFocus
        maxLength={40}
      />
      <View style={styles.balance}>
        <Text style={styles.label}>ยอดเงินเริ่มต้น (ไม่บังคับ)</Text>
        <AmountInput value={balanceText} onChangeText={setBalanceText} autoFocus={false} />
      </View>
      <Text style={styles.hint}>
        ยอดเริ่มต้นคือเงินที่มีอยู่จริงในบัญชีตอนนี้ รายการถัดไปจะบวก–ลบจากยอดนี้
      </Text>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  balance: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  hint: { fontSize: 12, color: colors.muted },
});
