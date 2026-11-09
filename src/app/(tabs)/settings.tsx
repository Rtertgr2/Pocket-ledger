import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState, type ComponentProps, type ReactNode } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { useBackup } from '../../hooks/useBackup';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { PressableScale } from '../../components/common/PressableScale';
import { Screen } from '../../components/common/Screen';
import { Segmented } from '../../components/common/Segmented';
import { TextField } from '../../components/common/TextField';
import { useToast } from '../../components/common/Toast';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { SCHEMA_VERSION } from '../../services/db/schema';
import { countTransactions } from '../../services/db/transactions';
import {
  clearLastEntry,
  readBackupEndpoint,
  readBackupSecret,
  readQuickEntry,
  writeBackupConfig,
  writeQuickEntry,
  type ThemeMode,
} from '../../services/storage/settings';
import { checkForUpdate as fetchLatestRelease } from '../../services/updates/feed';
import { useAppStore } from '../../store/useAppStore';
import { radius, spacing, readableTextOn } from '../../theme';
import { formatBaht } from '../../utils/money';
import { MAX_PRESETS, type QuickPreset } from '../../utils/preset';

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'light', label: 'สว่าง' },
  { mode: 'system', label: 'ตามระบบ' },
  { mode: 'dark', label: 'มืด' },
];

/** A group of cards under the small muted label the reference UI uses to chapter settings. */
function Group({ label, children }: { label: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      {children}
    </View>
  );
}

/** Card header: tinted icon tile, title, and the one-line explanation under it. */
function BlockHead({
  icon,
  title,
  sub,
  action,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  const styles = useStyles();
  const { palette } = useTheme();
  return (
    <View style={styles.blockHead}>
      <View style={styles.tile}>
        <Ionicons name={icon} size={18} color={palette.primaryText} />
      </View>
      <View style={styles.blockTexts}>
        <Text style={styles.blockTitle}>{title}</Text>
        {sub ? <Text style={styles.blockSub}>{sub}</Text> : null}
      </View>
      {action ? <View style={styles.blockAction}>{action}</View> : null}
    </View>
  );
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { mode, setMode, palette } = useTheme();
  const styles = useStyles();

  const accounts = useAppStore((s) => s.accounts);
  const fetchAccounts = useAppStore((s) => s.fetchAccounts);
  const clearAllData = useAppStore((s) => s.clearAllData);
  const { exporting, importing, pushing, exportToFile, importFromFile, pushToCloud } = useBackup(db);

  const [endpoint, setEndpoint] = useState(() => readBackupEndpoint());
  const [secret, setSecret] = useState(() => readBackupSecret());
  const [transactionCount, setTransactionCount] = useState(0);
  // Presets are added from the add form, so the list is re-read every time this tab is opened.
  const [presets, setPresets] = useState<QuickPreset[]>(() => readQuickEntry());
  const [checking, setChecking] = useState(false);
  const [updateNote, setUpdateNote] = useState('ตรวจสอบเวอร์ชันล่าสุดจากช่องทางอัปเดตของแอป');

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  // Accounts can change in a modal, so the list re-reads on focus like the other tabs.
  useFocusEffect(
    useCallback(() => {
      fetchAccounts(db).catch(() => {
        // A read failure leaves the last known list on screen; the next focus retries.
      });
      countTransactions(db)
        .then(setTransactionCount)
        .catch(() => {
          // Same contract as the account read: keep the last known number.
        });
      setPresets(readQuickEntry());
    }, [db, fetchAccounts])
  );

  function saveBackup() {
    writeBackupConfig(endpoint, secret);
    showToast('บันทึกการตั้งค่าสำรองข้อมูลแล้ว');
  }

  function removePreset(id: string) {
    const next = presets.filter((preset) => preset.id !== id);
    writeQuickEntry(next);
    setPresets(next);
    showToast('ลบรายการโปรดแล้ว');
  }

  function clearRemembered() {
    clearLastEntry();
    showToast('ล้างบัญชี/หมวดที่จำไว้แล้ว');
  }

  /** Irreversible, so it always asks first and names what survives (the theme). */
  function confirmClear() {
    Alert.alert(
      'ล้างข้อมูลทั้งหมด?',
      'รายการและบัญชีทั้งหมดจะถูกลบถาวรจากเครื่องนี้ การตั้งค่าธีมยังอยู่',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ล้างข้อมูล',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData(db);
              setTransactionCount(0);
              showToast('ล้างข้อมูลแล้ว');
            } catch (error) {
              showToast(error instanceof Error ? error.message : 'ล้างข้อมูลไม่สำเร็จ', 'error');
            }
          },
        },
      ]
    );
  }

  /**
   * Reads the latest GitHub Release and, when it is newer, offers the APK in the browser. Nothing
   * is downloaded or installed by the app itself, so a failed check never touches the ledger.
   */
  async function checkForUpdate() {
    if (checking) return;
    setChecking(true);
    setUpdateNote('กำลังตรวจสอบเวอร์ชันล่าสุด…');

    try {
      const result = await fetchLatestRelease({ currentVersion: appVersion });
      const { latest } = result;

      if (!result.available) {
        setUpdateNote(`คุณใช้เวอร์ชันล่าสุดแล้ว (v${appVersion})`);
        showToast(`เวอร์ชันล่าสุด v${latest.version}`);
        return;
      }

      setUpdateNote(`มีเวอร์ชันใหม่ v${latest.version} · เครื่องนี้ใช้ v${appVersion}`);
      Alert.alert(
        `มีเวอร์ชันใหม่ v${latest.version}`,
        latest.notes ? excerpt(latest.notes, 300) : 'ดาวน์โหลด APK แล้วติดตั้งทับได้เลย ข้อมูลในเครื่องยังอยู่ครบ',
        [
          { text: 'ไว้ก่อน', style: 'cancel' },
          {
            text: 'ดาวน์โหลด APK',
            onPress: () => {
              Linking.openURL(latest.apkUrl).catch(() => {
                showToast('เปิดเบราว์เซอร์ไม่ได้', 'error');
              });
            },
          },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ตรวจสอบอัปเดตไม่สำเร็จ';
      setUpdateNote(message);
      showToast(message, 'error');
    } finally {
      setChecking(false);
    }
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>ตั้งค่า</Text>
          <Text style={styles.subtitle}>ข้อมูลทั้งหมดเก็บอยู่ในเครื่องคุณ</Text>
        </View>

        <Group label="การแสดงผล">
          <Card style={styles.card}>
            <BlockHead icon="color-palette-outline" title="ธีม" sub="หน้าตาของแอป" />
            <Segmented
              options={THEME_OPTIONS.map((option) => ({ key: option.mode, label: option.label }))}
              value={mode}
              onChange={setMode}
              label="ธีม"
            />
            <Text style={styles.hint}>เลือก “ตามระบบ” เพื่อเปลี่ยนตามการตั้งค่าของมือถือ</Text>
          </Card>
        </Group>

        <Group label="รายการโปรด">
          <Card style={styles.card}>
            <BlockHead
              icon="star-outline"
              title="Quick Vault"
              sub={`${presets.length}/${MAX_PRESETS} รายการ · แตะในหน้าเพิ่มรายการเพื่อเติมฟอร์ม`}
            />
            {presets.length === 0 ? (
              <Text style={styles.hint}>
                ยังไม่มีรายการโปรด — เพิ่มได้จากปุ่ม “บันทึกเป็นรายการโปรด” ในหน้าเพิ่มหรือแก้ไขรายการ
              </Text>
            ) : (
              presets.map((preset) => (
                <View key={preset.id} style={styles.presetRow}>
                  <View style={styles.accountTexts}>
                    <Text style={styles.accountName}>{preset.label}</Text>
                    <Text style={styles.hint}>
                      {preset.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย'} ·{' '}
                      {accounts.find((account) => account.id === preset.account_id)?.name ??
                        'บัญชีที่ถูกลบ'}
                      {preset.category ? ` · ${preset.category}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.balance}>{formatBaht(preset.amount_satang)}</Text>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`ลบ ${preset.label}`}
                    onPress={() => removePreset(preset.id)}
                    style={styles.presetDelete}
                  >
                    <Ionicons name="close" size={16} color={palette.muted} />
                  </PressableScale>
                </View>
              ))
            )}
            <Text style={styles.link} accessibilityRole="button" onPress={clearRemembered}>
              ล้างบัญชี/หมวดที่จำไว้
            </Text>
          </Card>
        </Group>

        <Group label="บัญชีและการซิงก์">
          <Card style={styles.card}>
            <BlockHead
              icon="wallet-outline"
              title="บัญชี"
              sub="กระเป๋าเงินและบัญชีที่ใช้บันทึก"
              action={
                <Text
                  style={styles.link}
                  accessibilityRole="link"
                  onPress={() => router.push('/account/new')}
                >
                  + เพิ่มบัญชี
                </Text>
              }
            />
            {accounts.length === 0 ? (
              <Text style={styles.hint}>ยังไม่มีบัญชี</Text>
            ) : (
              accounts.map((account) => (
                <PressableScale
                  key={account.id}
                  accessibilityHint="เปิดหน้าจัดการบัญชี"
                  onPress={() => router.push({ pathname: '/account/[id]', params: { id: account.id } })}
                  style={styles.accountRow}
                >
                  <View style={[styles.accountBadge, { backgroundColor: account.color_hex }]}>
                    <Text style={[styles.accountBadgeText, { color: readableTextOn(account.color_hex) }]}>
                      {account.name.trim().slice(0, 2) || '??'}
                    </Text>
                  </View>
                  <View style={styles.accountTexts}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.hint}>{account.is_active === 1 ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}</Text>
                  </View>
                  <Text style={styles.balance}>{formatBaht(account.balance_satang)}</Text>
                </PressableScale>
              ))
            )}
          </Card>

          <Card style={styles.card}>
            <BlockHead
              icon="cloud-upload-outline"
              title="สำรองข้อมูลขึ้น Google Sheets"
              sub="เก็บข้อมูลไว้ในสเปรดชีตของคุณ"
            />
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
            <Button label="บันทึกการตั้งค่า" variant="secondary" onPress={saveBackup} />
            <Button
              label={pushing ? 'กำลังสำรองข้อมูล…' : 'สำรองข้อมูลขึ้นคลาวด์'}
              disabled={pushing}
              onPress={pushToCloud}
            />
            <Text style={styles.hint}>
              ส่งข้อมูลทั้งหมดเป็น JSON ไปยัง Web App ที่คุณตั้งไว้ · ข้อมูลในเครื่องยังเป็นตัวจริง
            </Text>
          </Card>

          <Card style={styles.card}>
            <BlockHead
              icon="document-text-outline"
              title="ไฟล์สำรอง (JSON)"
              sub="ย้ายเครื่อง / กู้คืนฉุกเฉิน"
            />
            <View style={styles.actions}>
              <Button
                label={exporting ? 'กำลังเตรียม…' : 'ส่งออกไฟล์'}
                variant="secondary"
                disabled={exporting}
                onPress={exportToFile}
                style={styles.action}
              />
              <Button
                label={importing ? 'กำลังนำเข้า…' : 'นำเข้าไฟล์'}
                variant="secondary"
                disabled={importing}
                onPress={async () => {
                  await importFromFile();
                  // The screen is already focused, so the count has to be re-read here.
                  setTransactionCount(await countTransactions(db).catch(() => transactionCount));
                }}
                style={styles.action}
              />
            </View>
            <Text style={styles.hint}>
              ส่งออกเป็น .json ผ่านแผงแชร์ของเครื่อง · นำเข้าแล้วเพิ่มเฉพาะรายการที่ยังไม่มี
              (ตรวจ UUID ก่อนเขียน ไม่ทับข้อมูลเดิม)
            </Text>
          </Card>
        </Group>

        <Group label="ข้อมูลและแอป">
          <Card style={styles.card}>
            <BlockHead
              icon="information-circle-outline"
              title="ข้อมูลในเครื่อง"
              sub={`${transactionCount} รายการ · ${accounts.length} บัญชี`}
            />
            <Text style={styles.hint}>
              เก็บในเครื่องนี้ · SQLite ออฟไลน์ 100% ทุกยอดคำนวณจากรายการ ไม่มียอดที่พิมพ์ค้างไว้
            </Text>
            <Text style={styles.danger} accessibilityRole="button" onPress={confirmClear}>
              ล้างข้อมูลทั้งหมด
            </Text>
          </Card>

          <Card style={styles.card}>
            <BlockHead icon="cube-outline" title="เกี่ยวกับแอป" sub="Pocket Ledger" />
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>เวอร์ชันปัจจุบัน</Text>
              <Text style={styles.versionValue}>{`v${appVersion}`}</Text>
            </View>
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>รูปแบบฐานข้อมูล</Text>
              <Text style={styles.versionValue}>{`schema v${SCHEMA_VERSION}`}</Text>
            </View>
            <Button
              label={checking ? 'กำลังตรวจสอบ…' : 'ตรวจสอบอัปเดต'}
              variant="secondary"
              disabled={checking}
              onPress={checkForUpdate}
            />
            <Text style={styles.hint}>{updateNote}</Text>
          </Card>
        </Group>
      </ScrollView>
    </Screen>
  );
}

/** Alert bodies get unreadable past a couple of paragraphs, so the dialog shows the gist only. */
function excerpt(text: string, limit: number): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length <= limit ? oneLine : `${oneLine.slice(0, limit - 1)}…`;
}

const useStyles = makeStyles((palette) => ({
  // 96pt clears the floating tab bar so the last card is never hidden behind the centre button.
  content: { paddingHorizontal: spacing.lg, paddingBottom: 96, gap: spacing.lg },
  header: { paddingTop: spacing.md, gap: 2 },
  title: { fontSize: 25, fontWeight: '700' as const, letterSpacing: -0.3, color: palette.text },
  subtitle: { fontSize: 13, color: palette.muted },
  group: { gap: spacing.md },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: palette.muted,
    letterSpacing: 0.1,
    marginHorizontal: spacing.xs,
  },
  card: { gap: spacing.md },
  blockHead: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm },
  tile: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: palette.primarySoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  blockTexts: { flex: 1, gap: 1, minWidth: 0 },
  blockTitle: { fontSize: 15, fontWeight: '700' as const, color: palette.text },
  blockSub: { fontSize: 12, color: palette.muted },
  blockAction: { marginLeft: 'auto' as const },
  link: { fontSize: 13, fontWeight: '700' as const, color: palette.primaryText },
  hint: { fontSize: 12, color: palette.muted, lineHeight: 17 },
  danger: { fontSize: 13, fontWeight: '700' as const, color: palette.expense, paddingVertical: spacing.xs },
  actions: { flexDirection: 'row' as const, gap: spacing.sm },
  action: { flex: 1 },
  versionRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
  },
  versionLabel: { fontSize: 13, color: palette.muted },
  versionValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  accountRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  presetRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  presetDelete: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: palette.surfaceMuted,
  },
  accountBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  accountBadgeText: { fontSize: 12, fontWeight: '700' as const },
  accountTexts: { flex: 1, gap: 1 },
  accountName: { fontSize: 14, fontWeight: '600' as const, color: palette.text },
  balance: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
}));
