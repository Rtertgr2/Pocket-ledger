#!/usr/bin/env node
/**
 * Design-token contrast self-check. Reads the real palettes from src/theme.ts and asserts the
 * WCAG 2.1 ratios the app actually relies on, so a palette tweak cannot quietly fail AA.
 * Usage: node scripts/check-contrast.mjs
 */
import assert from 'node:assert/strict';
import { ACCOUNT_COLORS, palettes, readableTextOn } from '../src/theme.ts';

/** WCAG relative luminance of a #RRGGBB colour. */
function luminance(hex) {
  const value = hex.replace('#', '');
  const channel = (index) => {
    const c = parseInt(value.slice(index, index + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Flatten `rgba(r, g, b, a)` over an opaque colour — how onPrimaryMuted actually renders. */
function composite(foreground, background) {
  const rgba = foreground.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/);
  if (!rgba) return foreground;
  const [, r, g, b, alphaText] = rgba;
  const a = Number(alphaText);
  const base = background.replace('#', '');
  const mix = (part, start) =>
    Math.round(Number(part) * a + parseInt(base.slice(start, start + 2), 16) * (1 - a));
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r, 0))}${toHex(mix(g, 2))}${toHex(mix(b, 4))}`;
}

const AA_TEXT = 4.5; // body text
const AA_NON_TEXT = 3; // control boundaries and meaningful icons

const failures = [];
const check = (label, foreground, background, minimum) => {
  const value = ratio(foreground, background);
  const ok = value >= minimum;
  if (!ok) {
    failures.push(`${label}: ${value.toFixed(2)} < ${minimum} (${foreground} on ${background})`);
  }
  return { ok, value };
};

let total = 0;
for (const [scheme, palette] of Object.entries(palettes)) {
  const textPairs = [
    ['text on surface', palette.text, palette.surface],
    ['text on bg', palette.text, palette.bg],
    ['muted on surface', palette.muted, palette.surface],
    ['muted on bg', palette.muted, palette.bg],
    ['muted on surfaceMuted', palette.muted, palette.surfaceMuted],
    ['income on surface', palette.income, palette.surface],
    ['expense on surface', palette.expense, palette.surface],
    ['transfer on surface', palette.transfer, palette.surface],
    ['primaryText accent on surface', palette.primaryText, palette.surface],
    ['primaryText accent on bg', palette.primaryText, palette.bg],
    ['secondary button label', palette.text, palette.surfaceMuted],
  ];
  for (const [label, fg, bg] of textPairs) {
    total += 1;
    check(`${scheme} · ${label}`, fg, bg, AA_TEXT);
  }

  // Filled surfaces: the label sits on primary (buttons, hero card, FAB, selected segment).
  total += 1;
  check(`${scheme} · onPrimary on primary`, palette.onPrimary, palette.primary, AA_TEXT);
  total += 1;
  check(`${scheme} · onExpense on expense`, palette.onExpense, palette.expense, AA_TEXT);
  total += 1;
  check(
    `${scheme} · onPrimaryMuted on primary`,
    composite(palette.onPrimaryMuted, palette.primary),
    palette.primary,
    AA_TEXT
  );

  // Boundaries: a control whose fill is nearly the page colour is identified by its outline.
  total += 1;
  check(`${scheme} · borderStrong vs bg`, palette.borderStrong, palette.bg, AA_NON_TEXT);
  total += 1;
  check(`${scheme} · borderStrong vs surface`, palette.borderStrong, palette.surface, AA_NON_TEXT);

  // Icon chips: the glyph against its tint, which is what carries the meaning.
  total += 1;
  check(
    `${scheme} · income icon on tint`,
    palette.income,
    palette.incomeSoft,
    AA_NON_TEXT
  );
  total += 1;
  check(
    `${scheme} · expense icon on tint`,
    palette.expense,
    palette.expenseSoft,
    AA_NON_TEXT
  );
  total += 1;
  check(`${scheme} · primary icon on primarySoft`, palette.primaryText, palette.primarySoft, AA_NON_TEXT);
}

// Account badges are user-coloured: whichever label the picker chooses must stay readable.
for (const color of ACCOUNT_COLORS) {
  total += 1;
  const label = `badge label on account colour ${color}`;
  check(label, readableTextOn(color), color, AA_TEXT);
}

if (failures.length > 0) {
  console.error(`Contrast check failed (${failures.length}/${total}):`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(
  `Contrast check passed: ${total} token pairs across ${Object.keys(palettes).length} schemes ` +
    `(AA text ${AA_TEXT}:1, boundaries ${AA_NON_TEXT}:1).`
);
