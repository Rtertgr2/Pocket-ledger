import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { radius, spacing } from '../../theme';
import { Button } from '../common/Button';
import { TextField } from '../common/TextField';

interface SavePresetDialogProps {
  /** Prefilled guess (the note, then the category) so most saves are one tap. */
  defaultName: string;
  /** What the preset will record, echoed back so the name is the only decision left. */
  summary: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}

/**
 * Android has no `Alert.prompt`, so naming a preset needs its own small modal. The parent mounts
 * this only while it is open, which is what resets the name field for the next entry.
 */
export function SavePresetDialog({
  defaultName,
  summary,
  onCancel,
  onConfirm,
}: SavePresetDialogProps) {
  const styles = useStyles();
  const [name, setName] = useState(defaultName);
  const trimmed = name.trim();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="ปิด">
        {/* Swallows taps on the card so only the backdrop closes the dialog. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>บันทึกเป็นรายการโปรด</Text>
          <Text style={styles.summary}>{summary}</Text>
          <TextField
            label="ชื่อรายการ"
            value={name}
            onChangeText={setName}
            placeholder="เช่น กาแฟ 55"
            maxLength={40}
            autoFocus
          />
          <View style={styles.actions}>
            <Button label="ยกเลิก" variant="secondary" onPress={onCancel} style={styles.action} />
            <Button
              label="บันทึก"
              onPress={() => onConfirm(trimmed)}
              disabled={trimmed.length === 0}
              style={styles.action}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((palette) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: spacing.lg,
  },
  card: {
    width: '100%' as const,
    maxWidth: 420,
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  title: { fontSize: 17, fontWeight: '700' as const, color: palette.text },
  summary: { fontSize: 13, color: palette.muted },
  actions: { flexDirection: 'row' as const, gap: spacing.sm },
  action: { flex: 1 },
}));
