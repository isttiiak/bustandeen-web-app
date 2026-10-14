import type { InputHTMLAttributes } from 'react';

// The Bustan Arch on/off switch (T3.2), used in place of daisyUI `toggle`.
// It is a real checkbox (role="switch"), so a wrapping <label> still toggles
// it and `onChange` gets the native event. The invisible input is 44x44
// around the drawn track, so the switch is a full tap target on its own.

type Tone = 'sage' | 'gold' | 'info' | 'pink';
type Size = 'xs' | 'sm' | 'md';

const TONE: Record<Tone, string> = {
  sage: 'peer-checked:bg-brand-emerald peer-checked:border-brand-emerald',
  gold: 'peer-checked:bg-brand-gold peer-checked:border-brand-gold',
  info: 'peer-checked:bg-brand-info peer-checked:border-brand-info',
  pink: 'peer-checked:bg-brand-pink peer-checked:border-brand-pink',
};

// Track size, knob size and how far the knob travels when on.
const SIZE: Record<Size, { track: string; knob: string; on: string }> = {
  xs: { track: 'w-7 h-4', knob: 'w-2.5 h-2.5', on: 'peer-checked:translate-x-3' },
  sm: { track: 'w-9 h-5', knob: 'w-3.5 h-3.5', on: 'peer-checked:translate-x-4' },
  md: { track: 'w-11 h-6', knob: 'w-[18px] h-[18px]', on: 'peer-checked:translate-x-5' },
};

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role' | 'size'> & {
  tone?: Tone;
  size?: Size;
};

export default function Switch({ tone = 'sage', size = 'md', className = '', ...input }: Props) {
  const s = SIZE[size];
  return (
    <span className={`relative inline-flex shrink-0 items-center ${s.track} ${className}`}>
      <input
        {...input}
        type="checkbox"
        role="switch"
        className="peer absolute left-1/2 top-1/2 z-10 m-0 h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
      />
      <span
        aria-hidden="true"
        className={`absolute inset-0 rounded-full border border-brand-border bg-brand-surface transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-gold peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-brand-deep peer-disabled:opacity-50 ${TONE[tone]}`}
      />
      <span
        aria-hidden="true"
        className={`absolute left-[3px] top-1/2 -translate-y-1/2 rounded-full bg-white/60 shadow-elev-1 transition-transform motion-reduce:transition-none peer-checked:bg-on-color peer-disabled:opacity-50 ${s.knob} ${s.on}`}
      />
    </span>
  );
}
