import type { Facility } from './facilities';
export function groupPoints(
  rows: Facility[],
  project: (f: Facility) => { x: number; y: number },
  radius?: number,
): { items: Facility[]; latitude: number; longitude: number }[];
