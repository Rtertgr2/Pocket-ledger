import { randomUUID } from 'expo-crypto';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { categoriesFor } from '../categories';
import { QuickPresets } from '../components/add/QuickPresets';
import { SavePresetDialog } from '../components/add/SavePresetDialog';
import { AmountInput } from '../components/common/AmountInput';
import { Button } from '../components/common/Button';
import { Chip } from '../components/common/Chip';
import { DateField } from '../components/common/DateField';
import { FormScreen } from '../components/common/FormScreen';
import { Segmented } from '../components/common/Segmented';
import { TextField } from '../components/common/TextField';
import { useToast } from '../components/common/Toast';
import { makeStyles, useTheme } from '../providers/ThemeProvider';
import { getTransactionById } from '../services/db/transactions';
import {
  readLastEntry,
  readQuickEntry,
  writeLastEntry,
  writeQuickEntry,
} from '../services/storage/settings';
import { useAppStore } from '../store/useAppStore';
import { spacing } from '../theme';
import type { Transaction } from '../types';
import { formatBaht, formatSatang, parseAmountToSatang } from '../utils/money';
import { MAX_PRESETS, type QuickPreset } from '../utils/preset';

type EntryType = 'EXPENSE' | 'INCOME';

const TYPE_OPTIONS = [
  { key: 'EXPENSE', label: 'รายจ่าย' },
  { key: 'INCOME', label: 'รายรับ' },
] as const;

export default function AddTransactionScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { palette } = useTheme();
  const styles = useStyles();
  const params = useLocalSearchParams<{ accountId?: string; id?: string }>();
  const editingId = params.id ?? null;

  const accounts = useAppStore((s) => s.accounts).filter((account) => account.is_active === 1);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const updateTransaction = useAppStore((s) => s.updateTransaction);

  // A4: open on the account and category used last, so the common case is two taps.
  const [lastUsed] = useState(() => readLastEntry());

  const [type, setType] = useState<EntryType>(lastUsed?.type ?? 'EXPENSE');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<string | null>(() =>
    lastUsed?.category && categoriesFor(lastUsed.type).includes(lastUsed.category)
      ? lastUsed.category
      : null
  );
  const [accountId, setAccountId] = useState<string | null>(
    params.accountId ??
      accounts.find((account) => account.id === lastUsed?.account_id)?.id ??
      accounts[0]?.id ??
      null
  );
  const [dateIso, setDateIso] = useState(() => new Date().toISOString());
  const [presets, setPresets] = useState<QuickPreset[]>(() => readQuickEntry());
  const [namingPreset, setNamingPreset] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(editingId));
  // The full row, so the fields this form cannot edit survive a save untouched.
  const [editing, setEditing] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await getTransactionById(db, editingId);
        if (cancelled) return;
        // Transfers are edited by their own form; anything else here would rewrite it wrong.
        if (!row || row.type === 'TRANSFER') {
          showToast('ไม่พบรายการที่ต้องการแก้ไข', 'error');
          router.back();
          return;
        }
        setEditing(row);
        setType(row.type);
        setAmountText(formatSatang(row.amount_satang));
        setNote(row.note ?? '');
        setCategory(row.category);
        setAccountId(row.account_id);
        setDateIso(row.transaction_date);
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : 'โหลดรายการไม่สำเร็จ', 'error');
          router.back();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, editingId, showToast]);

  const satang = parseAmountToSatang(amountText);
  const canSave = Boolean(accountId) && satang !== null && satang > 0 && !saving;

  // A row saved under a category that has since left the list still has to show its own value.
  const options = useMemo(() => {
    const list = categoriesFor(type);
    return category && !list.includes(category) ? [category, ...list] : list;
  }, [category, type]);

  function switchType(next: EntryType) {
    setType(next);
    // The two lists share only "อื่น ๆ", so a category from the other side would be a typo.
    setCategory(null);
  }

  /**
   * Records the entry without leaving the form, so a run of small payments is typed in one go.
   * Amount and note are cleared for the next entry; account, category and date stay, because they
   * usually do not change from one entry to the next.
   */
  async function onSaveAndContinue() {
    if (!accountId || satang === null || satang <= 0) return;
    setSaving(true);
    try {
      await addTransaction(db, {
        account_id: accountId,
        type,
        amount_satang: satang,
        note: note.trim() || undefined,
        category: category ?? undefined,
        transaction_date: dateIso,
      });
      writeLastEntry({ type, account_id: accountId, category });
      setAmountText('');
      setNote('');
      showToast('บันทึกแล้ว — จดต่อได้เลย');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function onSave() {
    if (!accountId || satang === null || satang <= 0) return;
    setSaving(true);
    try {
      if (editing) {
        await updateTransaction(db, {
          id: editing.id,
          account_id: accountId,
          type,
          amount_satang: satang,
          note: note.trim() || null,
          category: category ?? null,
          is_excluded_from_average: editing.is_excluded_from_average,
          transaction_date: dateIso,
        });
        showToast('บันทึกการแก้ไขแล้ว');
      } else {
        await addTransaction(db, {
          account_id: accountId,
          type,
          amount_satang: satang,
          note: note.trim() || undefined,
          category: category ?? undefined,
          transaction_date: dateIso,
        });
        writeLastEntry({ type, account_id: accountId, category });
        showToast('บันทึกสำเร็จ');
      }
      router.back();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ', 'error');
      setSaving(false);
    }
  }

  /** A preset only fills the form; the user still presses save, so a mistap records nothing. */
  function applyPreset(preset: QuickPreset) {
    setType(preset.type);
    setAmountText(formatSatang(preset.amount_satang));
    // The account a preset points at may since have been closed: fall back to the first active
    // one instead of leaving the form with no account selected and save disabled.
    setAccountId(
      accounts.some((account) => account.id === preset.account_id)
        ? preset.account_id
        : accounts[0]?.id ?? null
    );
    setCategory(preset.category);
    // Using a preset pulls it to the front: the row is ordered by what gets used, not by when it
    // was created, so the three entries a user rotates through stay under the thumb.
    if (presets[0]?.id !== preset.id) {
      const reordered = [preset, ...presets.filter((item) => item.id !== preset.id)];
      writeQuickEntry(reordered);
      setPresets(reordered);
    }
  }

  function savePreset(name: string) {
    if (presets.length >= MAX_PRESETS) {
      setNamingPreset(false);
      showToast(`รายการโปรดเต็ม ${MAX_PRESETS} รายการ — ลบในหน้าตั้งค่าก่อน`, 'error');
      return;
    }
    const next: QuickPreset[] = [
      ...presets,
      {
        id: randomUUID(),
        label: name,
        amount_satang: satang ?? 0,
        account_id: accountId ?? '',
        category,
        type,
      },
    ];
    writeQuickEntry(next);
    setPresets(next);
    setNamingPreset(false);
    showToast('บันทึกเป็นรายการโปรดแล้ว');
  }

  if (loading) {
    return (
      <FormScreen footer={<></>}>
        <ActivityIndicator style={styles.loading} color={palette.primaryText} />
      </FormScreen>
    );
  }

  const isEditing = Boolean(editing);
  const presetSummary = `${type === 'INCOME' ? 'รายรับ' : 'รายจ่าย'} ${formatBaht(satang ?? 0)} · ${
    accounts.find((account) => account.id === accountId)?.name ?? 'ยังไม่เลือกบัญชี'
  }${category ? ` · ${category}` : ''}`;

  return (
    <FormScreen
      footer={
        <View style={styles.footer}>
          <Button
            label={saving ? 'กำลังบันทึก…' : isEditing ? 'บันทึกการแก้ไข' : 'บันทึก'}
            onPress={onSave}
            disabled={!canSave}
          />
          {isEditing ? null : (
            <Button
              label="บันทึกแล้วจดต่อ"
              variant="secondary"
              onPress={onSaveAndContinue}
              disabled={!canSave}
            />
          )}
        </View>
      }
    >
      <Stack.Screen options={{ title: isEditing ? 'แก้ไขรายการ' : 'บันทึกรายการ' }} />

      <Segmented options={TYPE_OPTIONS} value={type} onChange={switchType} label="ประเภทรายการ" />

      <QuickPresets presets={presets} onApply={applyPreset} />

      <AmountInput value={amountText} onChangeText={setAmountText} autoFocus={!isEditing} />

      <DateField value={dateIso} onChange={setDateIso} />

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
        {/* One row that scrolls: wrapping the 7 categories onto three lines pushed the save
            button off a 360dp-wide screen. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chipRow}
        >
          {options.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={option === category}
              onPress={() => setCategory(option === category ? null : option)}
            />
          ))}
        </ScrollView>
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

      <Button
        label="บันทึกเป็นรายการโปรด"
        variant="secondary"
        disabled={!accountId || satang === null || satang <= 0}
        onPress={() => setNamingPreset(true)}
      />

      {namingPreset ? (
        <SavePresetDialog
          defaultName={note.trim() || category || 'รายการโปรด'}
          summary={presetSummary}
          onCancel={() => setNamingPreset(false)}
          onConfirm={savePreset}
        />
      ) : null}
    </FormScreen>
  );
}

const useStyles = makeStyles((palette) => ({
  field: { gap: spacing.sm },
  label: { fontSize: 12, fontWeight: '600' as const, color: palette.muted },
  chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
  chipRow: { flexDirection: 'row' as const, gap: spacing.sm, paddingRight: spacing.lg },
  footer: { gap: spacing.sm },
  error: { fontSize: 12, color: palette.expense },
  loading: { paddingVertical: spacing.xxl },
}));
