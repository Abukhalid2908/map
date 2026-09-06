import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupPoints } from '../lib/map-markers.mjs';
const a = { id: 'a', latitude: -6.3, longitude: 107.1, x: 0, y: 0 },
  b = { id: 'b', latitude: -6.31, longitude: 107.11, x: 20, y: 0 },
  c = { id: 'c', latitude: -6.32, longitude: 107.12, x: 130, y: 0 };
await test('Close markers cluster without losing records; separate markers remain selectable', () => {
  const grouped = groupPoints([a, b, c], (f) => f, 48);
  assert.deepEqual(
    grouped.map((g) => g.items.map((f) => f.id)),
    [['a', 'b'], ['c']],
  );
  assert.ok(Math.abs(grouped[0].latitude - -6.305) < 1e-9);
  assert.deepEqual(
    groupPoints([a, c], (f) => f).map((g) => g.items.length),
    [1, 1],
  );
});
await test('Zoom separation, identical coordinates, and invalid projections', () => {
  assert.equal(
    groupPoints([a, b], (f) => ({ x: f.x * 5, y: f.y }), 48).length,
    2,
  );
  assert.equal(groupPoints([a, { ...b, x: 0, y: 0 }], (f) => f).length, 1);
  assert.deepEqual(
    groupPoints([a], () => ({ x: NaN, y: 0 })),
    [],
  );
  assert.deepEqual(
    groupPoints([], (f) => f),
    [],
  );
});
