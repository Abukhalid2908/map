import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Utensils,
  Coffee,
  BedDouble,
  Store,
  Landmark,
  HeartPulse,
  Building2,
  Layers,
} from 'lucide-react';
import { writeFile } from 'node:fs/promises';
const defs = {
  resto_cafe: Utensils,
  cafe: Coffee,
  hotel: BedDouble,
  food_court: Store,
  atm: Landmark,
  medical: HeartPulse,
  public_facility: Building2,
  mixed: Layers,
};
const icons = Object.fromEntries(
  Object.entries(defs).map(([key, Icon]) => [
    key,
    renderToStaticMarkup(
      createElement(Icon, { size: 23, strokeWidth: 2.2, 'aria-hidden': true }),
    ),
  ]),
);
await writeFile(
  'lib/marker-icons.ts',
  '// Generated from Lucide icons; trusted static SVG only.\nexport const markerIcons: Record<string,string> = ' +
    JSON.stringify(icons, null, 2) +
    ';\n',
);
