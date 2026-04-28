import type { HTMLAttributes, ReactNode } from 'react';

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  transparentBody?: boolean;
}

export function GlassCard({
  header,
  footer,
  children,
  transparentBody = false,
  className,
  ...rest
}: GlassCardProps) {
  const classes = [
    'glass-base',
    'glass-clear',
    'glass-shape-lg',
    'overflow-hidden',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      <div className="glass-content">
        {header ? (
          <div className="px-4 pt-3 pb-2 text-[12.5px] font-medium text-slate-800/90 flex items-center justify-between">
            {header}
          </div>
        ) : null}
        <div
          className={[
            'px-4 py-3',
            transparentBody ? '' : 'bg-white/92 text-slate-900',
            'text-[13.5px] leading-relaxed',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </div>
        {footer ? (
          <div className="px-4 pb-3 pt-2 flex items-center gap-2 flex-wrap">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
