import type { ReactNode } from 'react';
import type { RoleMeta, TeamTone } from '@/types/game';

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
      <span aria-hidden="true">{meta.icon}</span> {meta.name}
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

export function BigIcon({ children, size = '4rem' }: { children: ReactNode; size?: string }) {
  return (
    <div className="icon-glow mb-3 leading-none" style={{ fontSize: size }} aria-hidden="true">
      {children}
    </div>
  );
}

export function PlayerNameBlock({ name }: { name: string }) {
  return <div className="my-5 break-words text-3xl font-bold text-white">{name}</div>;
}
