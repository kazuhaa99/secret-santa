import { useEffect, useState } from 'react';
import { SlidingNumber } from './sliding-number';

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Glowing figures on the TV screen, ticking like the Kremlin clock. */
export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Date.parse(to) - now;
  if (left <= 0) return <p className="tv-digits text-center font-serif text-3xl font-bold text-white">Бьют куранты…</p>;
  const { d, h, m, s } = parts(left);
  const cells: [number, string][] = [...(d > 0 ? ([[d, 'дней']] as [number, string][]) : []), [h, 'часов'], [m, 'минут'], [s, 'секунд']];
  return (
    <div className="flex justify-center gap-4 sm:gap-6" role="timer" aria-label={`До жеребьёвки: ${d} дн ${h} ч ${m} мин`}>
      {cells.map(([v, label]) => (
        <div key={label} className="flex flex-col items-center">
          <span className="tv-digits font-serif text-[clamp(1.9rem,8vw,2.9rem)] font-bold leading-none text-white tnum">
            <SlidingNumber value={v} padStart={label !== 'дней'} />
          </span>
          <span className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#cfe6f5]/75">{label}</span>
        </div>
      ))}
    </div>
  );
}
