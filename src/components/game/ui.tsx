import type { ReactNode } from 'react';
import type { RoleMeta, TeamTone } from '@/types/game';
import { IconGlyph, type IconName } from '@/components/icons/Icon';

type CardTone = TeamTone | 'neutral';

interface CardProps {
  children: ReactNode;
  tone?: CardTone;
  className?: string;
  live?: boolean;
}

const TONE_CLASS: Record<CardTone, string> = {
  neutral: '',
  wolf: 'glow-wolf tone-wolf',
  village: 'glow-village tone-village',
  special: 'glow-special tone-special',
};

export function Card({ children, tone = 'neutral', className = '', live = false }: CardProps) {
  return (
    <section
      className={`surface p-5 ${TONE_CLASS[tone]} ${className}`}
      aria-live={live ? 'polite' : undefined}
    >
      {children}
    </section>
  );
}

export function Badge({ tone, children }: { tone: TeamTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function RoleBadge({ meta }: { meta: RoleMeta }) {
  return (
    <Badge tone={meta.tone}>
      <IconGlyph name={meta.icon} size={13} /> {meta.name}
    </Badge>
  );
}

export function Alert({
  tone,
  children,
  className = '',
}: {
  tone: 'warning' | 'danger' | 'info';
  children: ReactNode;
  className?: string;
}) {
  return <div className={`alert alert-${tone} ${className}`}>{children}</div>;
}

/** Piringan ikon besar (hero) di tengah layar fase — latar gelap berlingkar tepi. */
export function BigIcon({ name, size = 44 }: { name: IconName; size?: number }) {
  return (
    <div className="hero-plate mb-4" style={{ '--plate-size': `${size + 32}px` } as React.CSSProperties}>
      <span className="icon-glow inline-flex" style={{ '--plate-icon': `${size}px`, color: 'rgb(var(--glow, var(--accent)))' } as React.CSSProperties}>
        <IconGlyph name={name} size={size} />
      </span>
    </div>
  );
}

export function PlayerNameBlock({ name }: { name: string }) {
  return <div className="my-5 break-words text-3xl font-bold text-white">{name}</div>;
}
