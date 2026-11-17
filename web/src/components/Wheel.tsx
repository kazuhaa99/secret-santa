import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import { useEffect, useMemo } from 'react';

const R = 150;
const SLICES = [
  { fill: '#173a2c', ink: '#f4ecdc' },
  { fill: '#f4ecdc', ink: '#3b2a18' },
  { fill: '#5b1220', ink: '#f4ecdc' },
  { fill: '#e9d9b0', ink: '#3b2a18' },
];
const AVATAR_BG = ['#7a1a28', '#2d5c47', '#8a6a2c', '#2e3f6e', '#6b3b5e', '#4d5a2a'];

interface Slot {
  id: number;
  name: string;
  avatar: number | null;
}

function arc(i: number, n: number): string {
  if (n === 1) return `M0 ${-R} A${R} ${R} 0 1 1 -0.01 ${-R} Z`;
  const a0 = ((i / n) * 2 - 0.5) * Math.PI;
  const a1 = (((i + 1) / n) * 2 - 0.5) * Math.PI;
  return `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${1 / n > 0.5 ? 1 : 0} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`;
}

const short = (name: string) => (name.length > 11 ? `${name.slice(0, 10)}…` : name);

/**
 * The draw already happened on the server: the wheel only plays it back, landing the star
 * (at the top) on the receiver. Each slice carries the person's photo near the rim.
 */
export function Wheel({ names, target, spin, onDone }: { names: Slot[]; target: number; spin: boolean; onDone: () => void }) {
  const reduce = useReducedMotion();
  const rotate = useMotionValue(0);
  const n = names.length;
  const seg = 360 / n;
  const index = Math.max(0, names.findIndex((p) => p.id === target));
  const final = useMemo(() => 360 * 8 - ((index + 0.5) * seg + (Math.random() - 0.5) * seg * 0.5), [index, seg]);

  useEffect(() => {
    if (!spin || reduce) {
      rotate.set(final);
      if (spin) onDone();
      return;
    }
    const controls = animate(rotate, final, { duration: 7, ease: [0.12, 0.65, 0.06, 1], onComplete: onDone });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [final, reduce, spin]);

  const face = Math.min(34, (Math.PI * R * 0.72) / n);

  return (
    <div className="relative aspect-square w-full">
      {/* the star that points at the result */}
      <svg viewBox="-12 -12 24 24" className="absolute left-1/2 top-[-3%] z-10 w-[10%] -translate-x-1/2 drop-shadow-[0_0_8px_#d8b56b99]" aria-hidden>
        <path d="M0-11l3 7 8 .6-6 5 2 8L0 5.5-7 9.6l2-8-6-5 8-.6z" fill="#e6c77f" stroke="#a6823d" strokeWidth="0.8" />
      </svg>
      <motion.svg viewBox={`${-R - 8} ${-R - 8} ${2 * R + 16} ${2 * R + 16}`} className="size-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]" style={{ rotate }} aria-hidden>
        <defs>
          {names.map((p) => (
            <clipPath key={p.id} id={`face-${p.id}`}>
              <circle r={face / 2} />
            </clipPath>
          ))}
        </defs>
        <circle r={R + 7} fill="#a6823d" />
        <circle r={R + 5} fill="#d8b56b" />
        <circle r={R + 2} fill="#0c1b15" />
        {names.map((p, i) => {
          const s = SLICES[(n % 4 === 1 && i === n - 1 ? 1 : i) % 4]!;
          const mid = (i + 0.5) * seg;
          return (
            <g key={p.id}>
              <path d={arc(i, n)} fill={s.fill} stroke="#d8b56b" strokeWidth="1" />
              <g transform={`rotate(${mid - 90}) translate(${R - face / 2 - 8} 0) rotate(90)`}>
                <circle r={face / 2 + 1.5} fill="#d8b56b" />
                {p.avatar ? (
                  <image href={`/api/avatars/${p.id}?v=${p.avatar}`} x={-face / 2} y={-face / 2} width={face} height={face} clipPath={`url(#face-${p.id})`} preserveAspectRatio="xMidYMid slice" />
                ) : (
                  <circle r={face / 2} fill={AVATAR_BG[p.id % AVATAR_BG.length]} />
                )}
              </g>
              <text
                transform={`rotate(${mid - 90}) translate(${R - face - 16} 0)`}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={n > 10 ? 14 : 18}
                fontFamily="Cormorant Garamond, serif"
                fontStyle="italic"
                fontWeight={600}
                fill={s.ink}
              >
                {short(p.name)}
              </text>
            </g>
          );
        })}
        {/* hub: a bauble */}
        <circle r={22} fill="#d8b56b" stroke="#a6823d" strokeWidth="2" />
        <circle r={13} fill="#0c1b15" />
        <circle r={4} fill="#d8b56b" />
      </motion.svg>
    </div>
  );
}
