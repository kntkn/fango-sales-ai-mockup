import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface GlassCapsuleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  label?: string;
  children?: ReactNode;
  size?: 'sm' | 'md';
}

export function GlassCapsule({
  icon,
  label,
  children,
  size = 'md',
  className,
  type = 'button',
  ...rest
}: GlassCapsuleProps) {
  const sizePad =
    size === 'sm'
      ? 'px-2.5 py-1 gap-1 text-[11.5px]'
      : 'px-3.5 py-1.5 gap-1.5 text-[12.5px]';
  const classes = [
    'glass-base',
    'glass-clear',
    'glass-shape-capsule',
    'glass-interactive',
    'inline-flex items-center justify-center font-medium text-slate-900',
    sizePad,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      <span className="glass-content inline-flex items-center gap-1.5">
        {icon ? (
          <span className={`msym ${size === 'sm' ? 'msym-sm' : ''}`}>{icon}</span>
        ) : null}
        {label ? <span>{label}</span> : null}
        {children}
      </span>
    </button>
  );
}
