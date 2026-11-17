import { useEffect, useState } from 'react';
import { SlidingNumber } from './sliding-number';

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Set like a printed invitation: large lining figures, hairline dividers, small-caps labels. */
export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Date.parse(to) - now;
  if (left <= 0) return <p className="text-center font-display text-3xl italic text-gold">Крутим колесо…</p>;
  const { d, h, m, s } = parts(left);
  const cells: [number, string][] = [...(d > 0 ? ([[d, 'дней']] as [number, string][]) : []), [h, 'часов'], [m, 'минут'], [s, 'секунд']];
  return (
    <div className="flex justify-center divide-x divide-gold/30" role="timer" aria-label={`До жеребьёвки: ${d} дн ${h} ч ${m} мин`}>
      {cells.map(([v, label]) => (
        <div key={label} className="flex flex-col items-center px-4 sm:px-8">
          <span className="font-display text-[clamp(2.6rem,11vw,4.5rem)] font-medium leading-none text-snow tnum">
            <SlidingNumber value={v} padStart={label !== 'дней'} />
          </span>
          <span className="label mt-2">{label}</span>
        </div>
      ))}
    </div>
  );
}
