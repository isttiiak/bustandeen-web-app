import { useId } from 'react';
import {
  CRESCENT,
  FLOWERS,
  LEAF,
  LEAF_WARM,
  MARK_OFFSET,
  SPARK,
  STAR,
  STEM,
  flowerCentreRadius,
  petals,
  type MarkVariant,
} from '../brand/brandMark.js';

interface Props {
  /** `small` (one flower, no spark) for anything under about 40 px. */
  variant?: MarkVariant;
  className?: string;
  /** Accessible name; without it the mark is decorative. */
  title?: string;
}

const fill = (token: string) => ({ fill: `var(--logo-${token})` });

/** The Bustandeen logo, coloured per theme by the --logo-* tokens in global.css. */
export function BrandMark({ variant = 'full', className, title }: Props) {
  // Gradient ids must be unique per instance; useId's colons break url(#...).
  const id = `bm${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={`${id}-moon`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--logo-moon-1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--logo-moon-2)' }} />
        </linearGradient>
        <linearGradient id={`${id}-star`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--logo-star-1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--logo-star-2)' }} />
        </linearGradient>
      </defs>
      <g transform={MARK_OFFSET}>
        <path
          d={STEM}
          fill="none"
          strokeWidth={12}
          strokeLinecap="round"
          style={{ stroke: 'var(--logo-leaf)' }}
        />
        <path d={CRESCENT} fill={`url(#${id}-moon)`} />
        <path d={LEAF} style={fill('leaf')} />
        <path d={LEAF_WARM} style={fill('leaf-warm')} />
        {FLOWERS[variant].map((f) => (
          <g key={`${f.cx}-${f.cy}`}>
            <g style={fill(f.petal === 'a' ? 'petal-a' : 'petal-b')}>
              {petals(f).map((c) => (
                <circle key={`${c.cx}-${c.cy}`} cx={c.cx} cy={c.cy} r={c.r} />
              ))}
            </g>
            <circle cx={f.cx} cy={f.cy} r={flowerCentreRadius(f)} style={fill('flower-centre')} />
          </g>
        ))}
        <path d={STAR} fill={`url(#${id}-star)`} />
        {variant === 'full' && <path d={SPARK} style={fill('spark')} />}
      </g>
    </svg>
  );
}
