import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_PRESETS,
  parseLastEntry,
  parsePresets,
  serializePresets,
  type QuickPreset,
} from './preset.ts';

const coffee: QuickPreset = {
  id: 'p1',
  label: 'กาแฟ 55',
  amount_satang: 5500,
  account_id: 'a1',
  category: 'อาหาร',
  type: 'EXPENSE',
};

test('presets survive a round trip through storage', () => {
  assert.deepEqual(parsePresets(serializePresets([coffee])), [coffee]);
});

test('a corrupt value reads as no presets instead of throwing', () => {
  assert.deepEqual(parsePresets(''), []);
  assert.deepEqual(parsePresets('not json'), []);
  assert.deepEqual(parsePresets('{"id":"p1"}'), [], 'an object is not a list');
});

test('half-written presets are dropped, the good ones kept', () => {
  const raw = JSON.stringify([
    coffee,
    { ...coffee, id: 'p2', amount_satang: 0 },
    { ...coffee, id: 'p3', amount_satang: 12.5 },
    { ...coffee, id: 'p4', label: '   ' },
    { ...coffee, id: 'p5', account_id: undefined },
    { ...coffee, id: 'p6', type: 'TRANSFER' },
  ]);

  assert.deepEqual(
    parsePresets(raw).map((preset) => preset.id),
    ['p1']
  );
});

test('the list is capped at MAX_PRESETS', () => {
  const many = Array.from({ length: 12 }, (_, index) => ({ ...coffee, id: `p${index}` }));

  assert.equal(parsePresets(JSON.stringify(many)).length, MAX_PRESETS);
  assert.equal(JSON.parse(serializePresets(many)).length, MAX_PRESETS);
});

test('a preset without a category is still usable', () => {
  const [parsed] = parsePresets(JSON.stringify([{ ...coffee, category: null }]));

  assert.equal(parsed.category, null);
});

test('last used keeps its type and tolerates missing fields', () => {
  assert.deepEqual(parseLastEntry('{"type":"INCOME","account_id":"a2","category":"เงินเดือน"}'), {
    type: 'INCOME',
    account_id: 'a2',
    category: 'เงินเดือน',
  });
  assert.deepEqual(parseLastEntry('{"account_id":"a2"}'), {
    type: 'EXPENSE',
    account_id: 'a2',
    category: null,
  });
  assert.equal(parseLastEntry(''), null);
  assert.equal(parseLastEntry('[]'), null, 'a list is not a last-used entry');
});
