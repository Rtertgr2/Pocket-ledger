import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { AccountPicker } from '../components/common/AccountPicker';
import { AmountInput } from '../components/common/AmountInput';
import { Button } from '../components/common/Button';
import { FormScreen } from '../components/common/FormScreen';
import { TextField } from '../components/common/TextField';
import { useToast } from '../components/common/Toast';
import { makeStyles, useTheme } from '../providers/ThemeProvider';
import { useAppStore } from '../store/useAppStore';
import { radius, spacing } from '../theme';
import { formatBaht, parseAmountToSatang } from '../utils/money';

export default function TransferScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { palette } = useTheme();
  const styles = useStyles();

  const accounts = useAppStore((s) => s.accounts).filter((account) => account.is_active === 1);
  const transferFunds = useAppStore((s) => s.transferFunds);

  const [fromId, setFromId] = useState<string | null>(accounts[0]?.id ?? null);
  const [toId, setToId] = useState<string | null>(accounts[1]?.id ?? null);
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const satang = parseAmountToSatang(amountText);
  const canSave =
    Boolean(fromId && toId && fromId !== toId) && satang !== null && satang > 0 && !saving;

  const from = accounts.find((account) => account.id === fromId);
  const to = accounts.find((account) => account.id === toId);

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
    <FormScreen
      footer={
        <Button
          label={saving ? 'กำลังบันทึก…' : 'ยืนยันการโอน'}
          onPress={onSave}
          disabled={!canSave}
        />
      }
    >
      <AmountInput value={amountText} onChangeText={setAmountText} />

      <AccountPicker
        label="จากบัญชี"
        accounts={accounts}
        selectedId={fromId}
        onSelect={setFromId}
      />

      <View style={styles.direction}>
        <View style={styles.rule} />
        <View style={styles.directionBadge}>
          <Ionicons name="arrow-down" size={15} color={palette.primaryText} />
        </View>
        <View style={styles.rule} />
      </View>

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

      {satang !== null && satang > 0 && from && to && from.id !== to.id ? (
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>หลังโอน</Text>
          <View style={styles.previewRow}>
            <Text style={styles.previewAccount} numberOfLines={1}>
              {from.name}
            </Text>
            <Text style={styles.previewAmount}>{formatBaht(from.balance_satang - satang)}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewAccount} numberOfLines={1}>
              {to.name}
            </Text>
            <Text style={[styles.previewAmount, styles.previewIn]}>
              {formatBaht(to.balance_satang + satang)}
            </Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.hint}>การโอนไม่นับเป็นรายจ่าย จึงไม่กระทบค่าเฉลี่ยต่อวัน</Text>
    </FormScreen>
  );
}

const useStyles = makeStyles((palette) => ({
  notice: { fontSize: 14, color: palette.muted },
  hint: { fontSize: 12, color: palette.muted },
  direction: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginVertical: -spacing.sm,
  },
  rule: { flex: 1, height: 1, backgroundColor: palette.border },
  directionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: palette.tile,
  },
  preview: {
    gap: 6,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
    color: palette.muted,
  },
  previewRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
  },
  previewAccount: { flex: 1, fontSize: 13, color: palette.text },
  previewAmount: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  previewIn: { color: palette.income },
}));
