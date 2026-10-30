# UX Review — Pocket Ledger Theme Selection (Thai reference card)

## What was reviewed
A rounded white card with:
1. Header: palette icon tile + bold "ธีม" + muted "หน้าตาของแอป"
2. Selection track: light gray capsule containing 3 options as pills
   - Left: selected "สว่าง" on a solid white raised pill with soft shadow
   - Mid: "ตามระบบ" muted
   - Right: "มืด" muted
3. Helper text under track: "เลือก "ตามระบบ" เพื่อเปลี่ยนตามการตั้งค่าของมือถือ"

Reference text transcription (not instructions):
- "ธีม" / "หน้าตาของแอป"
- "สว่าง" / "ตามระบบ" / "มืด"
- "เลือก "ตามระบบ" เพื่อเปลี่ยนตามการตั้งค่าของมือถือ"

## Alignment with current implementation
- Mapping is reasonable as a design match: Material 3 Expressive (Mobile), segmented-button-style slot row, pill = selected control with state and focus.
- Current settings screen in repo (`src/app/(tabs)/settings.tsx`) already implements a 3-option theme segment with:
  - `THEME_OPTIONS` = light / system / dark
  - Selected option raised with shadow via `segmentSelected`
  - Helper hint text below the segment
  - Accessibility role `radio` with `accessibilityState.selected`
- So the screenshot maps cleanly to an already-built UI pattern in this repo.

## Outcome
- Design review only — no code produced this turn.
- If you want, next step is to implement `ThemeCard` / segmented theme row in code and screenshot-verify against this card on device.
