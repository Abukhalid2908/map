export type Category = { id: string; label: string; icon?: string };
export const categories: Category[] = [
  { id: 'resto_cafe', label: 'Resto & Cafe' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'food_court', label: 'Food Court' },
  { id: 'atm', label: 'ATM' },
  { id: 'medical', label: 'Medis' },
  { id: 'public_facility', label: 'Fasilitas Umum' },
];
export type Facility = {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
  tags: string[];
  menu_keywords?: string[];
  opening_hours?: string | null;
  phone?: string | null;
  website?: string | null;
  source?: string;
  verified_at?: string | null;
  status?: string;
  demo?: boolean;
  parent_id?: string | null;
  unit_number?: string | null;
  tenant_count?: number;
  category_icon?: string;
};
export const demoFacilities: Facility[] = [
  {
    id: 'demo-cafe',
    name: 'Contoh · Kedai Kopi',
    category: 'resto_cafe',
    latitude: -6.298,
    longitude: 107.094,
    address: 'Titik ilustrasi di sekitar kawasan',
    tags: ['Kopi', 'Tempat bersantai'],
    demo: true,
  },
  {
    id: 'demo-hotel',
    name: 'Contoh · Hotel Kawasan',
    category: 'hotel',
    latitude: -6.287,
    longitude: 107.101,
    address: 'Titik ilustrasi di sekitar kawasan',
    tags: ['Menginap', 'Perjalanan bisnis'],
    demo: true,
  },
  {
    id: 'demo-food',
    name: 'Contoh · Pusat Kuliner',
    category: 'food_court',
    latitude: -6.305,
    longitude: 107.105,
    address: 'Titik ilustrasi di sekitar kawasan',
    tags: ['Makan siang', 'Pilihan menu'],
    demo: true,
  },
  {
    id: 'demo-atm',
    name: 'Contoh · ATM Center',
    category: 'atm',
    latitude: -6.292,
    longitude: 107.09,
    address: 'Titik ilustrasi di sekitar kawasan',
    tags: ['Tarik tunai', 'Perbankan'],
    demo: true,
  },
  {
    id: 'demo-medical',
    name: 'Contoh · Klinik',
    category: 'medical',
    latitude: -6.303,
    longitude: 107.086,
    address: 'Titik ilustrasi di sekitar kawasan',
    tags: ['Kesehatan', 'Layanan medis'],
    demo: true,
  },
  {
    id: 'demo-public',
    name: 'Contoh · Pusat Informasi',
    category: 'public_facility',
    latitude: -6.29,
    longitude: 107.112,
    address: 'Titik ilustrasi di sekitar kawasan',
    tags: ['Informasi', 'Layanan kawasan'],
    demo: true,
  },
];
