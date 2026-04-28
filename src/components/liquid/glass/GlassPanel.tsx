import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

type GlassVariant = 'clear' | 'tinted' | 'opaque';
type GlassShape = 'md' | 'lg' | 'xl' | 'capsule';

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  shape?: GlassShape;
  interactive?: boolean;
  children?: ReactNode;
  contentClassName?: string;
  contentStyle?: CSSProperties;
}

const SHAPE_CLASS: Record<GlassShape, string> = {
  md: 'glass-shape-md',
  lg: 'glass-shape-lg',
  xl: 'glass-shape-xl',
  capsule: 'glass-shape-capsule',
};

const VARIANT_CLASS: Record<GlassVariant, string> = {
  clear: 'glass-clear',
  tinted: 'glass-tinted',
  opaque: 'glass-opaque',
};

export function GlassPanel({
  variant = 'clear',
  shape = 'lg',
  interactive = false,
  className,
  children,
  contentClassName,
  contentStyle,
  ...rest
}: GlassPanelProps) {
  const classes = [
    'glass-base',
    VARIANT_CLASS[variant],
    SHAPE_CLASS[shape],
    interactive ? 'glass-interactive' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      <div
        className={['glass-content', contentClassName ?? ''].filter(Boolean).join(' ')}
        style={contentStyle}
      >
        {children}
      </div>
    </div>
  );
}
