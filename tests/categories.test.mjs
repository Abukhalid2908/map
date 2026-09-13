import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDataset, publicDataset } from '../lib/data.mjs';
const fixture = {
  schema_version: 1,
  updated_at: new Date().toISOString(),
  categories: [{ id: 'cat_shop', label: 'Belanja', icon: 'public_facility' }],
  facilities: [
    {
      id: 'shop',
      name: 'Toko',
      category: 'cat_shop',
      latitude: 0,
      longitude: 0,
      address: 'Alamat',
      source: 'Survei',
      tags: [],
      menu_keywords: [],
      verified_at: '2026-01-01',
      status: 'published',
      phone: null,
      website: null,
      opening_hours: null,
    },
  ],
};
test('Custom category metadata validates and survives public export', () => {
  assert.deepEqual(validateDataset(fixture).errors, []);
  assert.deepEqual(publicDataset(fixture).categories, fixture.categories);
});
test('Reject missing category definitions, duplicate IDs and untrusted icons', () => {
  for (const categories of [
    [],
    [...fixture.categories, ...fixture.categories],
    [{ ...fixture.categories[0], icon: '<script>' }],
  ])
    assert.ok(validateDataset({ ...fixture, categories }).errors.length);
});
