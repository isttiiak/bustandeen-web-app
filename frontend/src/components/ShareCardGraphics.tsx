import type { ReactNode } from 'react';
import type { ShareCardOrnamentId, ShareCardPatternId } from '../utils/shareCardDesign.js';

/**
 * Decorative background layers for the share card, drawn as inline SVG (not
 * CSS background images) so html-to-image captures them faithfully. Everything
 * is stroked/filled in the theme accent and dialled by `strength`.
 */

interface LayerProps {
  width: number;
  height: number;
  accent: string;
  /** 0.6 subtle, 1 medium, 1.7 bold */
  strength: number;
}

const layerStyle = { position: 'absolute', inset: 0, pointerEvents: 'none' } as const;

function starSparkle(s: number): string {
  return `M0 ${-s} Q0 0 ${s} 0 Q0 0 0 ${s} Q0 0 ${-s} 0 Q0 0 0 ${-s}Z`;
}

function patternDefs(id: ShareCardPatternId, accent: string): ReactNode {
  switch (id) {
    case 'star':
      return (
        <pattern id="scp" width="100" height="100" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={accent} strokeWidth="1.4">
            <rect x="22" y="22" width="56" height="56" />
            <rect x="22" y="22" width="56" height="56" transform="rotate(45 50 50)" />
            <circle cx="50" cy="50" r="7" />
            <path d="M0 -10 L10 0 L0 10 L-10 0Z" />
            <path d="M100 -10 L110 0 L100 10 L90 0Z" />
            <path d="M0 90 L10 100 L0 110 L-10 100Z" />
            <path d="M100 90 L110 100 L100 110 L90 100Z" />
          </g>
        </pattern>
      );
    case 'lattice':
      return (
        <pattern id="scp" width="80" height="80" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={accent} strokeWidth="1.4">
            <path d="M0 40 L40 0 L80 40 L40 80Z" />
            <path d="M20 40 L40 20 L60 40 L40 60Z" />
          </g>
        </pattern>
      );
    case 'dots':
      return (
        <pattern id="scp" width="44" height="44" patternUnits="userSpaceOnUse">
          <circle cx="11" cy="11" r="3" fill={accent} />
          <circle cx="33" cy="33" r="3" fill={accent} />
        </pattern>
      );
    case 'waves':
      return (
        <pattern id="scp" width="72" height="36" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={accent} strokeWidth="1.4">
            {[36, 27, 18, 9].map((r) => (
              <circle key={`a${r}`} cx="36" cy="36" r={r} />
            ))}
            {[36, 27, 18, 9].map((r) => (
              <circle key={`b${r}`} cx="0" cy="0" r={r} />
            ))}
            {[36, 27, 18, 9].map((r) => (
              <circle key={`c${r}`} cx="72" cy="0" r={r} />
            ))}
          </g>
        </pattern>
      );
    default:
      return null;
  }
}

/** Tiled pattern or radiating sunburst behind everything. */
export function PatternLayer({
  pattern,
  width,
  height,
  accent,
  strength,
}: LayerProps & { pattern: ShareCardPatternId }) {
  if (pattern === 'none') return null;

  if (pattern === 'rays') {
    const cx = width / 2;
    const cy = -height * 0.08;
    const reach = Math.hypot(width, height) * 1.2;
    const count = 28;
    const wedges = Array.from({ length: count }, (_, i) => {
      const a0 = ((i * 2) / (count * 2)) * Math.PI - Math.PI * 0.02;
      const a1 = a0 + Math.PI / (count * 2) + 0.0001;
      const p = (a: number) =>
        `${(cx + Math.cos(a) * reach).toFixed(1)} ${(cy + Math.sin(a) * reach).toFixed(1)}`;
      return `M${cx} ${cy} L${p(a0)} L${p(a1)}Z`;
    });
    return (
      <svg width={width} height={height} style={layerStyle}>
        <defs>
          <radialGradient id="scr" cx={cx} cy={cy} r={reach * 0.55} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={accent} stopOpacity={Math.min(0.2 * strength, 0.4)} />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={wedges.join(' ')} fill="url(#scr)" />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} style={layerStyle}>
      <defs>{patternDefs(pattern, accent)}</defs>
      <rect
        width={width}
        height={height}
        fill="url(#scp)"
        opacity={Math.min(0.09 * strength, 0.3)}
      />
    </svg>
  );
}

const CORNER_PATH = 'M28 130 V64 Q28 28 64 28 H130';
const CORNER_INNER = 'M46 108 V72 Q46 46 72 46 H108';

function skylineShapes() {
  return (
    <>
      {/* left minaret */}
      <rect x="70" y="70" width="40" height="130" />
      <path d="M64 70 L90 18 L116 70Z" />
      {/* right minaret */}
      <rect x="970" y="70" width="40" height="130" />
      <path d="M964 70 L990 18 L1016 70Z" />
      {/* side domes */}
      <path d="M170 200 V150 A65 65 0 0 1 300 150 V200Z" />
      <path d="M780 200 V150 A65 65 0 0 1 910 150 V200Z" />
      {/* main dome + spire */}
      <path d="M350 200 V140 A190 110 0 0 1 730 140 V200Z" />
      <path d="M534 34 L540 2 L546 34Z" />
      <rect x="0" y="172" width="1080" height="28" />
    </>
  );
}

/** Decorative ornament drawn over the pattern, under the text. */
export function OrnamentLayer({
  ornament,
  width,
  height,
  accent,
  strength,
}: LayerProps & { ornament: ShareCardOrnamentId }) {
  if (ornament === 'none') return null;
  const o = (base: number) => Math.min(base * strength, 0.9);

  if (ornament === 'frame') {
    const diamond = (x: number, y: number) =>
      `M${x} ${y - 9} L${x + 9} ${y} L${x} ${y + 9} L${x - 9} ${y}Z`;
    return (
      <svg width={width} height={height} style={layerStyle}>
        <g fill="none" stroke={accent}>
          <rect
            x="30"
            y="30"
            width={width - 60}
            height={height - 60}
            rx="26"
            strokeWidth="2"
            opacity={o(0.45)}
          />
          <rect
            x="46"
            y="46"
            width={width - 92}
            height={height - 92}
            rx="16"
            strokeWidth="1"
            opacity={o(0.28)}
          />
        </g>
        <g fill={accent} opacity={o(0.55)}>
          <path d={diamond(width / 2, 30)} />
          <path d={diamond(width / 2, height - 30)} />
        </g>
      </svg>
    );
  }

  if (ornament === 'corners') {
    const corner = (x: number, y: number, sx: number, sy: number, key: string) => (
      <g key={key} transform={`translate(${x} ${y}) scale(${sx} ${sy})`}>
        <path d={CORNER_PATH} strokeWidth="2.5" opacity={o(0.55)} />
        <path d={CORNER_INNER} strokeWidth="1.2" opacity={o(0.35)} />
        <circle cx="28" cy="28" r="4" fill={accent} stroke="none" opacity={o(0.6)} />
      </g>
    );
    return (
      <svg width={width} height={height} style={layerStyle}>
        <g fill="none" stroke={accent} strokeLinecap="round">
          {corner(0, 0, 1, 1, 'tl')}
          {corner(width, 0, -1, 1, 'tr')}
          {corner(0, height, 1, -1, 'bl')}
          {corner(width, height, -1, -1, 'br')}
        </g>
      </svg>
    );
  }

  if (ornament === 'arch') {
    const left = 96;
    const right = width - 96;
    const top = 88;
    const bottom = height - 96;
    const spring = top + (right - left) * 0.5;
    const r = (right - left) * 0.9;
    const arch = (inset: number) => {
      const l = left + inset;
      const rt = right - inset;
      const t = top + inset * 1.4;
      const s = spring + inset * 0.6;
      return `M${l} ${bottom} V${s} A${r} ${r} 0 0 1 ${width / 2} ${t} A${r} ${r} 0 0 1 ${rt} ${s} V${bottom}`;
    };
    return (
      <svg width={width} height={height} style={layerStyle}>
        <g fill="none" stroke={accent} strokeLinecap="round" strokeLinejoin="round">
          <path d={arch(0)} strokeWidth="2.5" opacity={o(0.5)} />
          <path d={arch(16)} strokeWidth="1.2" opacity={o(0.3)} />
        </g>
      </svg>
    );
  }

  if (ornament === 'skyline') {
    const h = Math.round(width * (200 / 1080));
    return (
      <svg x={0} y={0} width={width} height={height} style={layerStyle}>
        <svg
          x="0"
          y={height - h}
          width={width}
          height={h}
          viewBox="0 0 1080 200"
          preserveAspectRatio="xMidYMax slice"
        >
          <g fill={accent} opacity={o(0.16)}>
            {skylineShapes()}
          </g>
        </svg>
      </svg>
    );
  }

  if (ornament === 'crescent') {
    const R = 92;
    const sparkles: [number, number, number][] = [
      [width - 120, 300, 16],
      [width - 330, 130, 10],
      [130, 200, 12],
      [90, height - 330, 9],
      [width - 150, height - 240, 12],
      [width / 2 + 40, 110, 7],
    ];
    return (
      <svg width={width} height={height} style={layerStyle}>
        <g transform={`translate(${width - 190} 200) rotate(-24)`} fill={accent} opacity={o(0.28)}>
          <path d={`M0 ${-R} A${R} ${R} 0 0 0 0 ${R} A${R * 1.2} ${R * 1.2} 0 0 1 0 ${-R}Z`} />
        </g>
        <g fill={accent}>
          {sparkles.map(([x, y, s], i) => (
            <path key={i} transform={`translate(${x} ${y})`} d={starSparkle(s)} opacity={o(0.42)} />
          ))}
        </g>
      </svg>
    );
  }

  return null;
}
