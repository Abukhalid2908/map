import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
export const metadata: Metadata = {
  title: 'MM2100 · Jelajah Kawasan',
  description:
    'Peta interaktif dan direktori fasilitas kawasan MM2100. Temukan tempat makan, hotel, ATM, dan layanan umum.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
