import type { ReactNode } from 'react';
import type { Lobby } from '../api';
import { Avatar } from './Avatar';
import { cn } from './ui';

type Person = Lobby['participants'][number];

/** Olivier, herring under a fur coat, tangerines, caviar sandwiches, champagne, candles, a fir sprig — seen from above. */
function Feast() {
  return (
    <svg viewBox="0 0 200 140" className="size-full" aria-hidden>
      <defs>
        <radialGradient id="glow" r="0.5">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
        <pattern id="peas" width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill="#f6ecd2" />
          <circle cx="2" cy="2" r="1.4" fill="#5fae3c" />
          <rect x="5" y="4" width="2.4" height="2.4" fill="#ff9a3c" />
          <rect x="1.5" y="6" width="2.4" height="2.4" fill="#f0b8b0" />
          <rect x="6" y="0.5" width="2" height="2" fill="#f7d24a" />
        </pattern>
      </defs>

      {/* fir sprigs along the runner */}
      {[28, 172].map((x) => (
        <g key={x} transform={`translate(${x} 70)`} stroke="#2f8f5b" strokeWidth="1.6" strokeLinecap="round">
          <path d="M-14 0H14" stroke="#1d5a3a" strokeWidth="2" />
          {[-10, -5, 0, 5, 10].map((d) => (
            <path key={d} d={`M${d} 0l-4 -6M${d} 0l-4 6`} />
          ))}
        </g>
      ))}

      {/* Olivier */}
      <g transform="translate(64 44)">
        <circle r="22" fill="#e9eef7" />
        <circle r="22" fill="none" stroke="#3b5bdb" strokeWidth="1.5" strokeDasharray="2 3" />
        <circle r="17" fill="url(#peas)" />
        <path d="M-4 -6c3-2 6 1 4 3" stroke="#2f8f5b" strokeWidth="1.4" fill="none" />
      </g>

      {/* Herring under a fur coat */}
      <g transform="translate(138 44)">
        <circle r="21" fill="#fbf7ef" />
        <circle r="16" fill="#b0306a" />
        <circle r="16" fill="none" stroke="#fbf7ef" strokeWidth="0.9" strokeDasharray="3 2.5" opacity="0.8" />
        <path d="M-10 -4l20 8M-10 4l20 -8" stroke="#fbf7ef" strokeWidth="0.8" opacity="0.7" />
        <circle cx="0" cy="0" r="2.5" fill="#f7d24a" />
      </g>

      {/* Tangerines */}
      <g transform="translate(100 70)">
        <circle r="18" fill="#c9962a" />
        <circle r="16" fill="#f6e2a8" />
        {[
          [-6, -5],
          [6, -6],
          [0, 4],
          [-8, 6],
          [8, 5],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="5.6" fill="#ff8a1f" />
            <circle r="5.6" fill="none" stroke="#e06a00" strokeWidth="0.6" />
            <ellipse cx="1.6" cy="-4" rx="2" ry="1" fill="#2f8f5b" transform="rotate(-30 1.6 -4)" />
          </g>
        ))}
      </g>

      {/* Caviar sandwiches */}
      <g transform="translate(64 100)">
        <ellipse rx="24" ry="13" fill="#fbf7ef" />
        {[-11, 0, 11].map((x) => (
          <g key={x} transform={`translate(${x} 0)`}>
            <rect x="-5" y="-7" width="10" height="14" rx="2.5" fill="#e3b26b" />
            <rect x="-3.6" y="-5.6" width="7.2" height="11.2" rx="1.6" fill="#fff4dc" />
            {[
              [-1.5, -3],
              [1.5, -1.5],
              [-1.5, 1],
              [1.5, 3],
              [0, -0.5],
            ].map(([cx, cy], j) => (
              <circle key={j} cx={cx} cy={cy} r="1.1" fill="#e2383f" />
            ))}
          </g>
        ))}
      </g>

      {/* Champagne and two glasses */}
      <g transform="translate(140 100)">
        <circle r="9" fill="#123d2a" />
        <circle r="5" fill="#c9962a" />
        <circle r="2" fill="#f7c94b" />
        <circle cx="-20" cy="6" r="6" fill="#fbf7ef" opacity="0.25" stroke="#f7c94b" strokeWidth="1" />
        <circle cx="20" cy="-4" r="6" fill="#fbf7ef" opacity="0.25" stroke="#f7c94b" strokeWidth="1" />
      </g>

      {/* Candles */}
      {[
        [100, 26],
        [100, 114],
      ].map(([x, y]) => (
        <g key={y} transform={`translate(${x} ${y})`}>
          <circle r="11" fill="url(#glow)" />
          <circle r="4.5" fill="#fbf7ef" />
          <ellipse className="flame" cy="-1" rx="1.6" ry="2.6" fill="#ffb02e" />
        </g>
      ))}
    </svg>
  );
}

/** Where seat i of n sits, as percentages of the scene (the table is an ellipse around the centre). */
function around(i: number, n: number, rx: number, ry: number) {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { left: `${50 + rx * Math.cos(a)}%`, top: `${50 + ry * Math.sin(a)}%`, angle: (a * 180) / Math.PI + 90 };
}

/**
 * The lobby: everyone has a chair at the New Year table. People in the lobby right now sit
 * lit up; the rest are greyed out; empty chairs wait for those who have not joined yet.
 */
export function Table({ people, meId, center }: { people: Person[]; meId: number; center?: ReactNode }) {
  const n = Math.max(people.length, 1);
  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-[560px] sm:aspect-[16/10] sm:max-w-[860px]">
      {/* tablecloth */}
      <div
        className="absolute inset-x-[15%] inset-y-[17%] rounded-[50%] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]"
        style={{
          background: 'radial-gradient(120% 90% at 50% 30%, #c22b39 0%, #a91f2c 45%, #7d1220 100%)',
          boxShadow: 'inset 0 0 0 5px #c9962a, inset 0 0 0 9px #7d1220, inset 0 0 0 10px #f7c94b55, 0 30px 60px -20px rgba(0,0,0,.7)',
        }}
      />
      {/* plates in front of every chair */}
      {people.map((p, i) => {
        const pos = around(i, n, 27, 25);
        return (
          <span
            key={`plate-${p.id}`}
            className="absolute aspect-square w-[11%] -translate-x-1/2 -translate-y-1/2 rounded-full sm:w-[7.5%] bg-snow shadow-[inset_0_0_0_3px_#e9e2d2,inset_0_0_0_5px_#c9962a66]"
            style={{ left: pos.left, top: pos.top }}
            aria-hidden
          />
        );
      })}
      {/* the feast, or whatever the centre shows (the wheel) */}
      <div className={cn('absolute grid place-items-center', center ? 'inset-[19%]' : 'inset-x-[25%] inset-y-[27%]')}>
        {/* the wheel is square: sized by the shorter side so it stays on the tablecloth */}
        {center ? <div className="aspect-square h-full max-h-full max-w-full">{center}</div> : <Feast />}
      </div>

      {/* chairs and people */}
      <ul aria-label="За столом">
        {people.map((p, i) => {
          const pos = around(i, n, 43, 42);
          const me = p.id === meId;
          return (
            <li key={p.id} className="absolute flex w-[22%] -translate-x-1/2 -translate-y-1/2 flex-col items-center sm:w-[16%]" style={{ left: pos.left, top: pos.top }}>
              <span className="relative block aspect-square w-[64%]">
                {/* chair seen from above, back away from the table */}
                <span
                  className="absolute inset-[-12%] rounded-[30%] bg-wood shadow-[inset_0_-4px_0_#5a341d,0_6px_14px_-4px_rgba(0,0,0,.6)]"
                  style={{ transform: `rotate(${pos.angle}deg)`, borderTop: '7px solid #5a341d' }}
                  aria-hidden
                />
                {p.activated ? (
                  <Avatar
                    id={p.id}
                    name={p.name}
                    avatar={p.avatar}
                    className={cn('relative size-full text-sm transition-[filter,opacity] duration-500', p.online ? 'seat-here' : 'opacity-45 grayscale')}
                  />
                ) : (
                  <span className="relative grid size-full place-items-center rounded-full border-2 border-dashed border-snow/40 font-display text-snow/60" aria-hidden>
                    ?
                  </span>
                )}
                {me && <span className="absolute -right-1 -top-1 rounded-full bg-gold px-1.5 text-[11px] font-semibold leading-5 text-night">ты</span>}
              </span>
              {/* hand-written place card */}
              <span className="mt-1.5 max-w-full truncate rounded-sm bg-snow px-2 font-hand text-[19px] leading-6 text-cloth-deep shadow-[0_2px_0_#c9962a] sm:text-[22px]">
                {p.name}
              </span>
              <span className="sr-only">{!p.activated ? 'ещё не присоединился' : p.online ? 'за столом' : 'отошёл'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
