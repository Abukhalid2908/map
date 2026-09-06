// Read one vector tile around the initial map center; no bulk download.
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
const longitude = Number(process.argv[2] ?? 107.099),
  latitude = Number(process.argv[3] ?? -6.297),
  z = 14,
  n = 2 ** z;
const x = Math.floor(((longitude + 180) / 360) * n),
  rad = (latitude * Math.PI) / 180,
  y = Math.floor(((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * n);
const metadataResponse = await fetch('https://tiles.openfreemap.org/planet');
if (!metadataResponse.ok) throw Error('Tile metadata unavailable');
const metadata = await metadataResponse.json();
const url = metadata.tiles[0]
  .replace('{z}', z)
  .replace('{x}', x)
  .replace('{y}', y);
const response = await fetch(url);
if (!response.ok) throw Error('Tile unavailable');
const tile = new VectorTile(
  new PbfReader(new Uint8Array(await response.arrayBuffer())),
);
const buildings = tile.layers.building,
  heights = {};
let hidden = 0;
for (let i = 0; i < (buildings?.length || 0); i++) {
  const p = buildings.feature(i).properties;
  const h = String(p.render_height ?? 'missing');
  heights[h] = (heights[h] || 0) + 1;
  if (p.hide_3d) hidden++;
}
console.log(
  JSON.stringify(
    {
      checked_at: new Date().toISOString(),
      tile: { z, x, y },
      building_features: buildings?.length || 0,
      hidden_3d: hidden,
      render_height_counts: heights,
      note: 'Single tile sample, not full MM2100 coverage. Render heights may be inferred by provider; not surveyed heights.',
    },
    null,
    2,
  ),
);
