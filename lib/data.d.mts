import type { Facility } from './facilities';
export type Dataset = {
  schema_version: number;
  updated_at: string;
  facilities: Facility[];
};
export function filterFacilities(
  rows: Facility[],
  query?: string,
  category?: string,
): Facility[];
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number;
export function navigationUrl(
  f: Facility,
  origin?: { latitude: number; longitude: number } | null,
): string;
export function validateDataset(
  data: unknown,
  options?: { publicOnly?: boolean },
): { errors: string[]; warnings: string[] };
export function publicDataset(data: Dataset): Dataset;
export function normalize(value: string): string;
