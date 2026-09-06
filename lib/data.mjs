export const categoryIds = [
  'resto_cafe',
  'hotel',
  'food_court',
  'atm',
  'medical',
  'public_facility',
];
export const normalize = (value) =>
  value.toLowerCase().trim().replace(/\s+/g, ' ');
export function filterFacilities(rows, query = '', category = 'all') {
  const q = normalize(query);
  return rows.filter(
    (f) =>
      (category === 'all' || f.category === category) &&
      normalize(
        [f.name, f.address, ...f.tags, ...(f.menu_keywords || [])].join(' '),
      ).includes(q),
  );
}
export function distanceKm(a, b) {
  for (const p of [a, b])
    if (
      !Number.isFinite(p.latitude) ||
      !Number.isFinite(p.longitude) ||
      Math.abs(p.latitude) > 90 ||
      Math.abs(p.longitude) > 180
    )
      throw Error('Koordinat tidak valid');
  const r = Math.PI / 180,
    dlat = (b.latitude - a.latitude) * r,
    dlon = (b.longitude - a.longitude) * r;
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(a.latitude * r) *
      Math.cos(b.latitude * r) *
      Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function navigationUrl(f, origin = null) {
  if (f.demo) throw Error('Navigasi data contoh dinonaktifkan');
  distanceKm(f, f);
  const q = new URLSearchParams({
    api: '1',
    destination: f.latitude + ',' + f.longitude,
  });
  if (origin) {
    distanceKm(origin, origin);
    q.set('origin', origin.latitude + ',' + origin.longitude);
  }
  return 'https://www.google.com/maps/dir/?' + q;
}
function dateValid(s) {
  return (
    typeof s === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s &&
    s <= new Date().toISOString().slice(0, 10)
  );
}
export function validateDataset(data, { publicOnly = false } = {}) {
  const errors = [],
    warnings = [];
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return { errors: ['Dataset harus berupa objek JSON.'], warnings };
  if (data.schema_version !== 1) errors.push('schema_version harus 1.');
  if (
    typeof data.updated_at !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(data.updated_at) ||
    !Number.isFinite(Date.parse(data.updated_at)) ||
    Date.parse(data.updated_at) > Date.now() + 1000
  )
    errors.push('updated_at harus timestamp UTC valid, bukan masa depan.');
  if (!Array.isArray(data.facilities))
    return { errors: [...errors, 'facilities harus berupa array.'], warnings };
  const ids = new Set(),
    seen = [];
  data.facilities.forEach((f, i) => {
    const label = 'Entri ' + (i + 1) + ': ';
    if (!f || typeof f !== 'object' || Array.isArray(f)) {
      errors.push(label + 'harus berupa objek.');
      return;
    }
    for (const key of ['id', 'name'])
      if (typeof f[key] !== 'string' || !f[key].trim())
        errors.push(label + key + ' wajib diisi.');
    if (ids.has(f.id)) errors.push(label + 'ID duplikat.');
    ids.add(f.id);
    if (!categoryIds.includes(f.category))
      errors.push(label + 'kategori tidak dikenal.');
    if (!['draft', 'published', 'archived'].includes(f.status))
      errors.push(label + 'status tidak valid.');
    if (publicOnly && f.status !== 'published')
      errors.push(label + 'dataset publik hanya boleh memuat published.');
    for (const [k, max] of [
      ['latitude', 90],
      ['longitude', 180],
    ])
      if (!Number.isFinite(f[k]) || Math.abs(f[k]) > max)
        errors.push(label + k + ' tidak valid.');
    for (const k of ['address', 'source'])
      if (typeof f[k] !== 'string') errors.push(label + k + ' harus teks.');
    for (const k of ['tags', 'menu_keywords'])
      if (
        !Array.isArray(f[k]) ||
        f[k].some((t) => typeof t !== 'string' || !t.trim())
      )
        errors.push(
          label + k + ' harus array teks tidak kosong (array boleh kosong).',
        );
    for (const k of ['phone', 'opening_hours', 'website'])
      if (f[k] !== null && typeof f[k] !== 'string')
        errors.push(label + k + ' harus teks atau null.');
    if (f.website !== null) {
      try {
        if (
          typeof f.website !== 'string' ||
          !['http:', 'https:'].includes(new URL(f.website).protocol)
        )
          throw Error();
      } catch {
        errors.push(label + 'website harus URL HTTP/HTTPS.');
      }
    }
    if (f.verified_at !== null && !dateValid(f.verified_at))
      errors.push(label + 'tanggal verifikasi tidak valid atau di masa depan.');
    if (f.status === 'published') {
      for (const k of ['address', 'source'])
        if (typeof f[k] !== 'string' || !f[k].trim())
          errors.push(label + k + ' wajib untuk publikasi.');
      if (!dateValid(f.verified_at))
        errors.push(label + 'verifikasi wajib sebelum publikasi.');
      if (f.demo === true)
        errors.push(
          label + 'contoh tidak boleh dipublikasikan sebagai data nyata.',
        );
    }
    if (
      typeof f.name === 'string' &&
      Number.isFinite(f.latitude) &&
      Number.isFinite(f.longitude)
    ) {
      for (const prev of seen)
        if (
          normalize(prev.name) === normalize(f.name) &&
          Math.abs(prev.latitude - f.latitude) < 0.001 &&
          Math.abs(prev.longitude - f.longitude) < 0.001
        )
          warnings.push(label + 'kemungkinan duplikat ' + prev.id + '.');
      seen.push(f);
    }
  });
  return { errors, warnings };
}
export function publicDataset(data) {
  const result = validateDataset(data);
  if (result.errors.length) throw Error(result.errors.join('\n'));
  const keys = [
    'id',
    'name',
    'category',
    'latitude',
    'longitude',
    'address',
    'opening_hours',
    'phone',
    'website',
    'tags',
    'menu_keywords',
    'source',
    'verified_at',
    'status',
  ];
  return {
    schema_version: 1,
    updated_at: data.updated_at,
    facilities: data.facilities
      .filter((f) => f.status === 'published')
      .map((f) => Object.fromEntries(keys.map((k) => [k, f[k]]))),
  };
}
