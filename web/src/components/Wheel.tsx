import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import { useEffect, useMemo } from 'react';

const R = 150;

function arc(i: number, n: number): string {
  if (n === 1) return `M0 ${-R} A${R} ${R} 0 1 1 -0.01 ${-R} Z`;
  const a0 = ((i / n) * 2 - 0.5) * Math.PI;
  const a1 = (((i + 1) / n) * 2 - 0.5) * Math.PI;
  const large = 1 / n > 0.5 ? 1 : 0;
  return `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`;
}

const short = (name: string) => (name.length > 13 ? `${name.slice(0, 12)}…` : name);

/**
 * The draw already happened on the server: the wheel only plays it back, landing the pointer
 * (at the top) on the receiver. Under reduced motion it simply shows the result.
 */
export function Wheel({
  names,
  target,
  spin,
  onDone,
}: {
  names: { id: number; name: string }[];
  target: number;
  /** false: already seen, rest on the result without playing the spin */
  spin: boolean;
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const rotate = useMotionValue(0);
  const n = names.length;
  const seg = 360 / n;
  const index = Math.max(0, names.findIndex((p) => p.id === target));

  // Pointer angle (clockwise from the top) must end inside the target slice, a little off-centre.
  const final = useMemo(() => {
    const jitter = (Math.random() - 0.5) * seg * 0.5;
    return 360 * 7 - ((index + 0.5) * seg + jitter);
  }, [index, seg]);

  useEffect(() => {
    if (!spin) {
      rotate.set(final);
      return;
    }
    if (reduce) {
      rotate.set(final);
      onDone();
      return;
    }
    const controls = animate(rotate, final, { duration: 6.5, ease: [0.12, 0.65, 0.08, 1], onComplete: onDone });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [final, reduce, spin]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px]">
      {/* pointer */}
      <svg viewBox="0 0 24 20" className="absolute left-1/2 top-[-6px] z-10 h-6 w-7 -translate-x-1/2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" aria-hidden>
        <path d="M12 20 2 2h20z" fill="var(--color-ember)" />
      </svg>
      <motion.svg viewBox={`${-R - 4} ${-R - 4} ${2 * R + 8} ${2 * R + 8}`} className="size-full" style={{ rotate }} aria-hidden>
        <circle r={R + 3} fill="var(--color-line)" />
        {names.map((p, i) => {
          const light = i % 2 === 0;
          const mid = (i + 0.5) * seg; // degrees clockwise from the top
          return (
            <g key={p.id}>
              <path d={arc(i, n)} fill={light ? 'var(--color-paper)' : 'var(--color-ash-2)'} stroke="var(--color-ink)" strokeWidth="1.5" />
              <text
                transform={`rotate(${mid - 90}) translate(${R * 0.9} 0)`}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={n > 10 ? 11 : 14}
                fontWeight={600}
                fill={light ? 'var(--color-ink)' : 'var(--color-paper)'}
              >
                {short(p.name)}
              </text>
            </g>
          );
        })}
        <circle r={22} fill="var(--color-ink)" stroke="var(--color-line)" strokeWidth="2" />
        <circle r={6} fill="var(--color-ember)" />
      </motion.svg>
    </div>
  );
}
