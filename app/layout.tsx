import type { Metadata } from 'next';
import './globals.css';

// Skip loading Google fonts to work in offline/CI environments
// const inter = Inter({ subsets: ['latin'] });
const inter = { className: 'font-sans' };

export const metadata: Metadata = {
  title: 'Controlling Abweichungsanalyse',
  description: 'Automatische Analyse und Kommentierung von Buchungsdaten',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
