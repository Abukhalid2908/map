import { markerIcons } from './marker-icons';
import type { Facility } from './facilities';
export function markerFace(items: Facility[]): HTMLElement {
  const wrapper = document.createElement('span');
  wrapper.className = 'marker-face';
  const same = items.every((f) => f.category === items[0].category);
  const first = items[0];
  const cafe =
    items.length === 1 &&
    first.category === 'resto_cafe' &&
    /kopi|coffee|cafe|kafe/i.test([first.name, ...first.tags].join(' '));
  const category = same ? (cafe ? 'cafe' : first.category) : 'mixed';
  // Only trusted Lucide SVG strings are inserted, never facility text.
  wrapper.innerHTML = markerIcons[category] || markerIcons.public_facility;
  if (items.length > 1) {
    const count = document.createElement('b');
    count.className = 'cluster-count';
    count.textContent = String(items.length);
    wrapper.appendChild(count);
  }
  return wrapper;
}
export function clusterChoices(
  items: Facility[],
  onSelect: (f: Facility) => void,
): HTMLElement {
  const box = document.createElement('div');
  box.className = 'cluster-choices';
  const title = document.createElement('strong');
  title.textContent = items.length + ' fasilitas di lokasi ini';
  box.appendChild(title);
  for (const f of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = f.name;
    button.onclick = () => onSelect(f);
    box.appendChild(button);
  }
  return box;
}
