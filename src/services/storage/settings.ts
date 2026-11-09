import Storage from 'expo-sqlite/kv-store';
import {
  parseLastEntry,
  parsePresets,
  serializePresets,
  type LastEntry,
  type QuickPreset,
} from '../../utils/preset';

/**
 * App settings that are not ledger data. Backed by expo-sqlite's key-value store, which is
 * already part of the installed expo-sqlite (no MMKV native module, no extra rebuild surface).
 * Reads are synchronous because the whole UI needs the theme on the first render.
 */

export type ThemeMode = 'light' | 'dark' | 'system';

const KEYS = {
  themeMode: 'settings.themeMode',
  backupEndpoint: 'settings.backupEndpoint',
  backupSecret: 'settings.backupSecret',
  quickEntry: 'settings.quickEntry',
  lastEntry: 'settings.lastEntry',
} as const;

const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];

function read(key: string): string {
  return Storage.getItemSync(key) ?? '';
}

function write(key: string, value: string): void {
  if (value) Storage.setItemSync(key, value);
  else Storage.removeItemSync(key);
}

export function readThemeMode(): ThemeMode {
  const stored = read(KEYS.themeMode);
  return THEME_MODES.includes(stored as ThemeMode) ? (stored as ThemeMode) : 'system';
}

export function writeThemeMode(mode: ThemeMode): void {
  write(KEYS.themeMode, mode);
}

export function readBackupEndpoint(): string {
  return read(KEYS.backupEndpoint);
}

export function readBackupSecret(): string {
  return read(KEYS.backupSecret);
}

/** The Phase 5 uploader reads these; nothing is sent anywhere yet. */
export function writeBackupConfig(endpoint: string, secret: string): void {
  write(KEYS.backupEndpoint, endpoint.trim());
  write(KEYS.backupSecret, secret.trim());
}

/** Quick Vault presets. Parsed defensively, so a corrupt value just reads as an empty vault. */
export function readQuickEntry(): QuickPreset[] {
  return parsePresets(read(KEYS.quickEntry));
}

export function writeQuickEntry(presets: QuickPreset[]): void {
  write(KEYS.quickEntry, presets.length > 0 ? serializePresets(presets) : '');
}

/** The account and category to preselect the next time the add form opens. */
export function readLastEntry(): LastEntry | null {
  return parseLastEntry(read(KEYS.lastEntry));
}

export function writeLastEntry(entry: LastEntry): void {
  write(KEYS.lastEntry, JSON.stringify(entry));
}

export function clearLastEntry(): void {
  write(KEYS.lastEntry, '');
}
