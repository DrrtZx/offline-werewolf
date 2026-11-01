import type { CSSProperties, ReactNode } from 'react';

/**
 * Ikon SVG buatan sendiri (24x24, stroke mengikuti `currentColor`, ujung membulat).
 * Satu sistem ikon UI agar visual konsisten dan tidak bergantung pada emoji.
 */
export type IconName =
  | 'wolf'
  | 'house'
  | 'eye'
  | 'stethoscope'
  | 'shield'
  | 'bow'
  | 'moon'
  | 'sun'
  | 'dawn'
  | 'coffin'
  | 'dove'
  | 'scales'
  | 'chart'
  | 'envelope'
  | 'lock'
  | 'target'
  | 'burst'
  | 'check'
  | 'speaker-on'
  | 'speaker-off'
  | 'gamepad'
  | 'warning'
  | 'pause'
  | 'user'
  | 'arrow-right'
  | 'skip'
  | 'trash'
  | 'bolt'
  | 'dice'
  | 'star'
  | 'rocket'
  | 'refresh'
  | 'gear'
  | 'sparkle'
  | 'crescent-arrow'
  | 'help'
  | 'x';

const PATHS: Record<IconName, ReactNode> = {
  // Serigala: kepala serigala geometris dengan telinga runcing & moncong
  wolf: (
    <>
      <path d="M5 3.5 8.8 8M19 3.5 15.2 8" />
      <path d="M5 3.5c-1.2 3.1-.8 7 .8 9.7L10 19c.6.9 1.3 1.6 2 1.6s1.4-.7 2-1.6l4.2-5.8c1.6-2.7 2-6.6.8-9.7" />
      <path d="M9 11h.01M15 11h.01" strokeWidth="2.6" />
      <path d="M12 13.2 10.6 15h2.8L12 13.2Z" />
      <path d="M10 17.6h4" />
    </>
  ),
  // Pondok warga: atap + asap cerobong
  house: (
    <>
      <path d="M3.5 10.5 12 4l8.5 6.5" />
      <path d="M5.5 9.2V20h13V9.2" />
      <path d="M10 20v-5.5a2 2 0 0 1 4 0V20" />
      <path d="M16.5 6.5v-3h1.5v4.4" />
    </>
  ),
  // Seer: mata terfokus, bulu mata bawah
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 1.8v2M18.8 4.4l-1.4 1.4M5.2 4.4l1.4 1.4" />
    </>
  ),
  // Doctor: stetoskop
  stethoscope: (
    <>
      <path d="M5 3v5a4.5 4.5 0 0 0 9 0V3" />
      <path d="M5 3H3.2M14 3h1.8" />
      <path d="M9.5 12.5v2.2a5.3 5.3 0 0 0 10.6 0v-1.4" />
      <circle cx="20.1" cy="9.6" r="2.1" />
    </>
  ),
  // Guardian: perisai dengan tanda centang
  shield: (
    <>
      <path d="M12 2.5 4.5 5.4v6.1c0 4.6 3.1 8.1 7.5 9.9 4.4-1.8 7.5-5.3 7.5-9.9V5.4L12 2.5Z" />
      <path d="M9 11.5l2.2 2.2L15.4 9" />
    </>
  ),
  // Hunter: busur + anak panah
  bow: (
    <>
      <path d="M5 19 19 5" />
      <path d="M19 5c.6 1.2 1 3.8 0 6.4M19 5c-1.2-.6-3.8-1-6.4 0" />
      <path d="M5 19c1.3.7 4 .8 6-.4M5 19c-.7-1.3-.8-4 .4-6" />
      <path d="M13.5 4.2 19.8 10.5" />
      <path d="m4.6 14.5-1 5.9 5.9-1" />
      <circle cx="19.8" cy="4.2" r="1.6" />
    </>
  ),
  // Bulan sabit + bintang kecil
  moon: (
    <>
      <path d="M19.5 14.5A7.8 7.8 0 0 1 9.5 4.5a7.8 7.8 0 1 0 10 10Z" />
      <path d="M16.5 4.5v3M15 6h3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" />
    </>
  ),
  // Fajar: setengah matahari di atas garis cakrawala + pancaran
  dawn: (
    <>
      <path d="M3 18.5h18" />
      <path d="M7.5 18.5a4.5 4.5 0 0 1 9 0" />
      <path d="M12 9.5v-2M19 13l1.4-1.4M5 13 3.6 11.6" />
      <path d="M3 21.5h18" />
    </>
  ),
  // Peti mati dengan dua garis panel
  coffin: (
    <>
      <path d="M9.5 2.5h5l3 5.5-2.5 13h-6L6.5 8l3-5.5Z" />
      <path d="M8 8h8" />
      <path d="M7.4 14h9.2" />
    </>
  ),
  // Merpati damai
  dove: (
    <>
      <path d="M20.5 9.5c-1.5-3-4.8-4.3-7.8-3.2L10 7.2H5.3c-.9 0-1.4 1-.9 1.7l2.5 3.1c.3 3 2.8 5.5 6 5.5 3.4 0 6.2-2.6 6.2-6 0-.6 0-1.3-.2-1.9l2.6-.1Z" />
      <path d="M9.8 17.5 8 21.5" />
      <path d="M14.6 9.6h.01" strokeWidth="2.4" />
    </>
  ),
  // Timbangan hukum
  scales: (
    <>
      <path d="M12 4v16.5" />
      <path d="M7 20.5h10" />
      <path d="M12 6h6M12 6l-6 0" />
      <path d="M3 13.5a3.3 3.3 0 0 0 6.6 0L6.3 6l-3.3 7.5Z" />
      <path d="M14.4 13.5a3.3 3.3 0 0 0 6.6 0L17.7 6l-3.3 7.5Z" />
      <path d="M12 4.8 6 6M12 4.8 18 6" />
    </>
  ),
  // Grafik survei: tiga batang
  chart: (
    <>
      <path d="M4 20.5h16.5" />
      <path d="M6.5 20.5v-6h3.2v6M10.9 20.5v-11h3.2v11M15.3 20.5V9h3.2v11.5" />
      <path d="M5.5 8.5 12 4l6.5 4.5" />
    </>
  ),
  // Amplop terbuka
  envelope: (
    <>
      <rect x="2.8" y="5" width="18.4" height="14" rx="2.4" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.4" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.5v2.5" />
    </>
  ),
  // Target bidik
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.2" />
      <circle cx="12" cy="12" r="1.6" strokeWidth="2.6" />
      <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
    </>
  ),
  // Ledakan/petir gugur
  burst: (
    <>
      <path d="M12 2.5v4M12 17.5v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2.5 12h4M17.5 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
      <circle cx="12" cy="12" r="3.4" strokeWidth="2.2" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.2 2.6 2.6L16 9.4" />
    </>
  ),
  'speaker-on': (
    <>
      <path d="M4 9.5h3.5L12.5 5v14l-5-4.5H4Z" />
      <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  'speaker-off': (
    <>
      <path d="M4 9.5h3.5L12.5 5v14l-5-4.5H4Z" />
      <path d="m16.5 9.5 5 5M21.5 9.5l-5 5" />
    </>
  ),
  gamepad: (
    <>
      <path d="M7.5 8.5h9a4.5 4.5 0 0 1 4.4 5.5l-.6 2.7a2.6 2.6 0 0 1-4.5 1l-1.3-1.7H9.5L8.2 17.7a2.6 2.6 0 0 1-4.5-1l-.6-2.7A4.5 4.5 0 0 1 7.5 8.5Z" />
      <path d="M7.5 12h3M9 10.5v3M15.5 11.5h.01M17.5 13.5h.01" strokeWidth="2.4" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.6h.01" strokeWidth="2.6" />
    </>
  ),
  pause: (
    <>
      <path d="M9 5.8v12.4M15 5.8v12.4" strokeWidth="2.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.5 20.5c.7-4 3.7-6 7.5-6s6.8 2 7.5 6" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </>
  ),
  skip: (
    <>
      <path d="M5 4.5 14 12l-9 7.5V4.5Z" />
      <path d="M17.5 5v14" strokeWidth="2.6" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 6.5h15" />
      <path d="M8.5 6.5V4.4A1.4 1.4 0 0 1 9.9 3h4.2a1.4 1.4 0 0 1 1.4 1.4v2.1" />
      <path d="M6.5 6.5 7.3 20.4a1.3 1.3 0 0 0 1.3 1.1h6.8a1.3 1.3 0 0 0 1.3-1.1l.8-13.9" />
      <path d="M10 10.5l.4 6M14 10.5l-.4 6" />
    </>
  ),
  bolt: (
    <>
      <path d="M13 2.5 5.5 13H11l-1 8.5L18.5 11H13l1-8.5Z" />
    </>
  ),
  dice: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.4" />
      <path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" strokeWidth="2.6" />
    </>
  ),
  star: (
    <>
      <path d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17.1 6.4 20.1l1.2-6.2L3 9.6l6.3-.8L12 3Z" />
    </>
  ),
  rocket: (
    <>
      <path d="M12 15.5c5-2.5 6.5-6.5 6.2-12.7-6.2-.3-10.2 1.2-12.7 6.2L3.6 13l2.5-.2M12 15.5l-4-4M12 15.5l2 4.9 1.8-2.9M8 11.5l-4 1.5 1.6 2.5" />
      <path d="M8.5 19.5c-.7 1-1.7 1.5-3 1.5.2-1.3.6-2.2 1.6-2.9" />
      <circle cx="13.5" cy="8.5" r="1.9" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20.5 3v4.5H16" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
      <circle cx="12" cy="12" r="7" />
    </>
  ),
  // Kilau mistis (mengganti silang / hush)
  sparkle: (
    <>
      <path d="M12 3.5c.6 3.8 2.7 5.9 6.5 6.5-3.8.6-5.9 2.7-6.5 6.5-.6-3.8-2.7-5.9-6.5-6.5 3.8-.6 5.9-2.7 6.5-6.5Z" />
      <path d="M18.5 15.5c.3 1.9 1.4 3 3.3 3.3-1.9.3-3 1.4-3.3 3.3-.3-1.9-1.4-3-3.3-3.3 1.9-.3 3-1.4 3.3-3.3Z" />
    </>
  ),
  // Bulan sabit dengan panah ke kanan (lanjut ke malam)
  'crescent-arrow': (
    <>
      <path d="M17.5 13.5A6.8 6.8 0 0 1 10.5 5a6.8 6.8 0 1 0 7 8.5Z" />
      <path d="M14.5 10h6M18 7.5 20.5 10 18 12.5" />
    </>
  ),
  // Ikon bantuan
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.2a2.5 2.5 0 0 1 4.9.7c0 1.5-2.5 2-2.5 3.4" />
      <path d="M12 16.8h.01" strokeWidth="2.6" />
    </>
  ),
  x: (
    <>
      <path d="M6 6l12 12M18 6 6 18" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  /** Ukuran dalam px atau CSS (default 1em agar turun dari font-size parent). */
  size?: string | number;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

export function Icon({ name, size = '1em', className = '', strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/** Ikon besar untuk "hero plate" di layar fase (mengganti BigIcon emoji). */
export function IconGlyph({ name, size = 44 }: { name: IconName; size?: number }) {
  return <Icon name={name} size={size} strokeWidth={1.7} />;
}
