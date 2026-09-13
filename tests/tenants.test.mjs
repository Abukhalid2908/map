import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterFacilities,
  validateDataset,
  publicDataset,
} from '../lib/data.mjs';
const court = {
  id: 'court',
  name: 'Food Court A',
  category: 'food_court',
  latitude: -6.3,
  longitude: 107.1,
  address: 'Alamat',
  tags: [],
  menu_keywords: [],
  source: 'Verifikasi',
  verified_at: '2026-01-01',
  status: 'published',
  phone: null,
  website: null,
  opening_hours: null,
};
const tenant = {
  ...court,
  id: 'tenant',
  name: 'Bakso Pak Budi',
  category: 'resto_cafe',
  parent_id: 'court',
  unit_number: 'A-05',
  menu_keywords: ['bakso'],
};
const dataset = (facilities) => ({
  schema_version: 1,
  updated_at: new Date().toISOString(),
  facilities,
});
test('Tenant retains relationship in public export and is searchable by parent/menu/unit', () => {
  const data = dataset([court, tenant]);
  assert.deepEqual(validateDataset(data).errors, []);
  assert.equal(publicDataset(data).facilities[1].parent_id, 'court');
  for (const q of ['Food Court A', 'bakso', 'A-05'])
    assert.ok(
      filterFacilities(data.facilities, q, 'resto_cafe').some(
        (f) => f.id === 'tenant',
      ),
    );
});
test('Reject orphan, wrong parent category, self-reference and unpublished parent', () => {
  for (const rows of [
    [tenant],
    [{ ...court, category: 'hotel' }, tenant],
    [{ ...tenant, parent_id: 'tenant' }],
    [{ ...court, status: 'draft' }, tenant],
  ])
    assert.ok(validateDataset(dataset(rows)).errors.length);
});
