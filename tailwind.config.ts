import type { Config } from 'tailwindcss';

/** Semua warna memakai CSS variables (triplet RGB) supaya tema dusk/night bisa diganti lewat `data-theme`. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  // Class berikut dirangkai dinamis (`btn-${variant}`, dst.), jadi tidak terdeteksi scanner Tailwind.
  safelist: [
    'btn-primary',
    'btn-secondary',
    'btn-danger',
    'btn-skip',
    'alert-warning',
    'alert-danger',
    'alert-info',
    'badge-wolf',
    'badge-village',
    'badge-special',
  ],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        line: token('line'),
        text: token('text'),
        muted: token('muted'),
        accent: token('accent'),
        'accent-strong': token('accent-strong'),
        wolf: token('wolf'),
        village: token('village'),
        special: token('special'),
        gold: token('gold'),
        danger: token('danger'),
        'danger-strong': token('danger-strong'),
      },
      borderRadius: {
        card: '22px',
        control: '16px',
      },
      fontFamily: {
        sans: ['var(--font-main)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      maxWidth: {
        game: '430px',
      },
      minHeight: {
        tap: '56px',
      },
    },
  },
  plugins: [],
};

export default config;
