import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBackup } from './format.ts';
import { buildPushPayload, pushBackupToSheet } from './cloud.ts';

const backup = buildBackup([], []);

test('pushBackupToSheet posts the secret and the rows, and returns the server count', async () => {
  const captured: { body?: Record<string, unknown> } = {};
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    captured.body = JSON.parse(String(init.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ status: 'success', count: 7 }), { status: 200 });
  }) as unknown as typeof fetch;

  const result = await pushBackupToSheet({
    url: ' https://script.google.com/macros/s/x/exec ',
    secret: 's3cret',
    backup,
    fetchImpl,
  });

  assert.deepEqual(result, { count: 7 });
  assert.equal(captured.body?.secret_key, 's3cret');
  assert.deepEqual(captured.body?.accounts, []);
});

test('a refused secret becomes an actionable Thai message', async () => {
  const fetchImpl = (async () =>
    new Response('unauthorized', { status: 401 })) as unknown as typeof fetch;

  await assert.rejects(
    pushBackupToSheet({ url: 'https://example.com/exec', secret: 'wrong', backup, fetchImpl }),
    (error: Error) => error.message.includes('Secret key ไม่ถูกต้อง')
  );
});

test('an empty URL fails before any request is made', async () => {
  let called = false;
  const fetchImpl = (async () => {
    called = true;
    return new Response('{}');
  }) as unknown as typeof fetch;

  await assert.rejects(
    pushBackupToSheet({ url: '   ', secret: '', backup, fetchImpl }),
    (error: Error) => error.message.includes('Web App URL')
  );
  assert.equal(called, false);
});

test('a hung request is aborted at the timeout', async () => {
  const fetchImpl = ((_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    })) as unknown as typeof fetch;

  await assert.rejects(
    pushBackupToSheet({ url: 'https://example.com/exec', secret: 's', backup, timeoutMs: 5, fetchImpl }),
    (error: Error) => error.message.includes('หมดเวลารอเซิร์ฟเวอร์')
  );
});

test('the payload shape is the contract Apps Script reads', () => {
  assert.deepEqual(Object.keys(buildPushPayload(backup, 'k')).sort(), [
    'accounts',
    'secret_key',
    'timestamp',
    'transactions',
  ]);
});
