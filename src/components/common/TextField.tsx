import { StyleSheet, Text, TextInput, View } from 'react-native';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { radius, spacing } from '../../theme';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  maxLength?: number;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'url';
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  autoFocus,
  maxLength,
  secureTextEntry,
  keyboardType,
}: TextFieldProps) {
  const styles = useStyles();
  const { palette } = useTheme();
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        selectionColor={palette.primary}
        autoFocus={autoFocus}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'url' ? 'none' : 'sentences'}
        autoCorrect={keyboardType === 'url' ? false : undefined}
        style={styles.input}
      />
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  wrapper: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: palette.muted },
  input: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: palette.text,
  },
}));
