import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchSamples, imageUrl, predictSample } from '../src/lib/api.ts';

test('numeric IDs survive the list, image and prediction paths', async (t) => {
  const requested = [];
  t.mock.method(globalThis, 'fetch', async (path) => {
    requested.push(path);
    return new Response(JSON.stringify(path === '/samples'
      ? [{ id: 1 }, { id: 42 }, { id: 0 }]
      : { label: 'Normal', pneumonia: false, probability: 0.1 }));
  });
  const samples = await fetchSamples();
  assert.deepEqual(samples.map(sample => sample.id), ['1', '42', '0']);
  assert.equal(imageUrl(samples[0].id), '/image/1');
  await predictSample(samples[1].id, false);
  assert.equal(requested.at(-1), '/predict/sample/42');
});

test('opaque string IDs and wrapped sample responses remain supported', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ samples: [{ id: 'study/a b', storage_key: 'case.dcm' }] })));
  assert.deepEqual(await fetchSamples(), [{ id: 'study/a b', storageKey: 'case.dcm' }]);
  assert.equal(imageUrl('study/a b'), '/image/study%2Fa%20b');
});

test('missing, blank and fractional IDs fail instead of inventing list indices', async (t) => {
  let current;
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => [{ id: current }] }));
  for (const id of [undefined, null, '', ' ', 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, {}]) {
    current = id;
    await assert.rejects(fetchSamples(), /invalid id/);
  }
});
