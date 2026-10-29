import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Screen } from '../../components/common/Screen';
import { TextField } from '../../components/common/TextField';
import { useToast } from '../../components/common/Toast';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { readBackupEndpoint, readBackupSecret, writeBackupConfig, type ThemeMode } from '../../services/storage/settings';
import { useAppStore } from '../../store/useAppStore';
import { radius, spacing } from '../../theme';
import { formatBaht } from '../../utils/money';

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'ตามระบบ' },
  { mode: 'light', label: 'สว่าง' },
  { mode: 'dark', label: 'มืด' },
];

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { mode, setMode } = useTheme();
  const styles = useStyles();

  const accounts = useAppStore((s) => s.accounts);
  const fetchAccounts = useAppStore((s) => s.fetchAccounts);

  const [endpoint, setEndpoint] = useState(() => readBackupEndpoint());
  const [secret, setSecret] = useState(() => readBackupSecret());

  // Accounts can change in a modal, so the list re-reads on focus like the other tabs.
  useFocusEffect(
    useCallback(() => {
      fetchAccounts(db).catch(() => {
        // A read failure leaves the last known list on screen; the next focus retries.
      });
    }, [db, fetchAccounts])
  );

  function saveBackup() {
    writeBackupConfig(endpoint, secret);
    showToast('บันทึกการตั้งค่าสำรองข้อมูลแล้ว');
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>ตั้งค่า</Text>
          <Text style={styles.subtitle}>ข้อมูลทั้งหมดเก็บอยู่ในเครื่องคุณ</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>ธีม</Text>
          <View style={styles.segment}>
            {THEME_OPTIONS.map((option) => {
              const selected = option.mode === mode;
              return (
                <Pressable
                  key={option.mode}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setMode(option.mode)}
                  style={[styles.segmentItem, selected ? styles.segmentSelected : null]}
                >
                  <Text style={[styles.segmentLabel, selected ? styles.segmentLabelSelected : null]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>เลือก “ตามระบบ” เพื่อเปลี่ยนตามการตั้งค่าของมือถือ</Text>
        </Card>

        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>บัญชี</Text>
            <Text style={styles.link} onPress={() => router.push('/account/new')}>
              + เพิ่มบัญชี
            </Text>
          </View>
          {accounts.length === 0 ? (
            <Text style={styles.hint}>ยังไม่มีบัญชี</Text>
          ) : (
            accounts.map((account) => (
              <Pressable
                key={account.id}
                accessibilityRole="button"
                accessibilityHint="เปิดหน้าจัดการบัญชี"
                onPress={() => router.push({ pathname: '/account/[id]', params: { id: account.id } })}
                style={({ pressed }) => [styles.accountRow, pressed ? styles.pressed : null]}
              >
                <View style={[styles.dot, { backgroundColor: account.color_hex }]} />
                <View style={styles.accountTexts}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.hint}>{account.is_active === 1 ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}</Text>
                </View>
                <Text style={styles.balance}>{formatBaht(account.balance_satang)}</Text>
              </Pressable>
            ))
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>สำรองข้อมูลขึ้น Google Sheets</Text>
          <TextField
            label="Web App URL"
            value={endpoint}
            onChangeText={setEndpoint}
            placeholder="https://script.google.com/macros/s/…/exec"
            keyboardType="url"
          />
          <TextField
            label="Secret key"
            value={secret}
            onChangeText={setSecret}
            placeholder="รหัสลับที่ตั้งไว้ใน Apps Script"
            secureTextEntry
          />
          <Button label="บันทึกการตั้งค่า" onPress={saveBackup} />
          <Text style={styles.hint}>
            เก็บไว้ในเครื่องเท่านั้น ยังไม่มีการส่งข้อมูลออกไป — ระบบอัปโหลดจะมาใน Phase 5
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>ข้อมูลในเครื่อง</Text>
          <Text style={styles.hint}>
            ฐานข้อมูล: pocket-ledger.db (SQLite, ออฟไลน์ 100%){'\n'}
            ทุกยอดเงินคำนวณจากรายการ ไม่มียอดที่พิมพ์ค้างไว้
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((palette) => ({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { paddingTop: spacing.md, gap: 2 },
  title: { fontSize: 24, fontWeight: '800' as const, color: palette.text },
  subtitle: { fontSize: 12, color: palette.muted },
  card: { gap: spacing.sm },
  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: palette.text },
  link: { fontSize: 13, fontWeight: '600' as const, color: palette.primary },
  hint: { fontSize: 12, color: palette.muted },
  segment: {
    flexDirection: 'row' as const,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center' as const,
  },
  segmentSelected: { backgroundColor: palette.surface },
  segmentLabel: { fontSize: 13, fontWeight: '600' as const, color: palette.muted },
  segmentLabelSelected: { color: palette.text },
  accountRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  accountTexts: { flex: 1, gap: 1 },
  accountName: { fontSize: 14, fontWeight: '600' as const, color: palette.text },
  balance: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
}));
