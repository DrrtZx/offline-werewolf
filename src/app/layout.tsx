import type { Metadata, Viewport } from 'next';
import { Fredoka, Grenze_Gotisch } from 'next/font/google';
import './globals.css';

/** Sans playful (rounded tapi tenang) untuk body & kontrol UI. */
const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-main',
});

/** Display gothic-antiqua untuk judul & brand — playful gothic signature. */
const gotisch = Grenze_Gotisch({
  subsets: ['latin'],
  weight: ['500', '700'],
  display: 'swap',
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Werewolf Pass-and-Play',
  description: 'Game Werewolf pass-and-play: satu ponsel, bergiliran, tanpa narator.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#12101a',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${fredoka.variable} ${gotisch.variable}`}>
      <body>{children}</body>
    </html>
  );
}
