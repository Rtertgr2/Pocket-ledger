import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Screen } from '../../components/common/Screen';
import { useAppStore } from '../../store/useAppStore';
import { colors, spacing } from '../../theme';
import { formatBaht } from '../../utils/money';

const UPCOMING = ['ธีมมืด / ธีมสว่าง', 'สำรองข้อมูลขึ้น Google Sheets', 'นำเข้าไฟล์สำรอง'];

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const accounts = useAppStore((s) => s.accounts);
  const fetchAccounts = useAppStore((s) => s.fetchAccounts);

  // Accounts can change in a modal, so the list re-reads on focus like the other tabs.
  useFocusEffect(
    useCallback(() => {
      fetchAccounts(db).catch(() => {
        // A read failure leaves the last known list on screen; the next focus retries.
      });
    }, [db, fetchAccounts])
  );

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>ตั้งค่า</Text>
          <Text style={styles.subtitle}>ข้อมูลทั้งหมดเก็บอยู่ในเครื่องคุณ</Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>บัญชี</Text>
            <Text style={styles.link} onPress={() => router.push('/account/new')}>
              + เพิ่มบัญชี
            </Text>
          </View>
          {accounts.length === 0 ? (
            <Text style={styles.muted}>ยังไม่มีบัญชี</Text>
          ) : (
            accounts.map((account) => (
              <View key={account.id} style={styles.accountRow}>
                <View style={styles.accountTexts}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.muted}>
                    {account.is_active === 1 ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                  </Text>
                </View>
                <Text style={styles.balance}>{formatBaht(account.balance_satang)}</Text>
              </View>
            ))
          )}
          <Button label="ปรับยอดเงิน" variant="secondary" onPress={() => router.push('/reconcile')} />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>กำลังจะมา</Text>
          {UPCOMING.map((item) => (
            <Text key={item} style={styles.muted}>
              • {item}
            </Text>
          ))}
          <Text style={styles.footnote}>
            ฐานข้อมูล: pocket-ledger.db (SQLite, ออฟไลน์ 100%){'\n'}ทุกยอดเงินคำนวณจากรายการ ไม่มียอดที่พิมพ์ค้างไว้
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { paddingTop: spacing.md, gap: 2 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.muted },
  card: { gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  link: { fontSize: 13, fontWeight: '600', color: colors.primary },
  muted: { fontSize: 12, color: colors.muted },
  accountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountTexts: { gap: 2 },
  accountName: { fontSize: 14, fontWeight: '600', color: colors.text },
  balance: { fontSize: 14, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  footnote: { fontSize: 11, color: colors.muted, marginTop: spacing.sm },
});
