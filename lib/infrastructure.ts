export type InfrastructureCategory = {
  id: string;
  label: string;
  color: string;
};

export type Infrastructure = {
  id: string;
  name: string;
  category: string;
  geometry_type: 'point' | 'line';
  status: 'published';
  description: string;
  source: string;
  verified_at: string | null;
  coordinates: [number, number][];
};
