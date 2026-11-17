import type { ReactNode } from 'react';
import type { Lobby } from '../api';
import { Avatar } from './Avatar';
import { cn } from './ui';

type Person = Lobby['participants'][number];

/** Shared gradients for the china, crystal, brass and fruit. */
function Defs() {
  return (
    <defs>
      <radialGradient id="porcelain" cx="45%" cy="40%" r="60%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.75" stopColor="#f3eee4" />
        <stop offset="1" stopColor="#d9d1c2" />
      </radialGradient>
      <radialGradient id="charger" cx="40%" cy="35%" r="70%">
        <stop offset="0" stopColor="#f0d48e" />
        <stop offset="0.55" stopColor="#c59b4b" />
        <stop offset="1" stopColor="#7e5e25" />
      </radialGradient>
      <radialGradient id="crystal" cx="38%" cy="32%" r="70%">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
        <stop offset="0.5" stopColor="#dfe8ea" stopOpacity="0.35" />
        <stop offset="1" stopColor="#9fb3b6" stopOpacity="0.55" />
      </radialGradient>
      <radialGradient id="silver" cx="35%" cy="30%" r="75%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.5" stopColor="#c9ced2" />
        <stop offset="1" stopColor="#7c858c" />
      </radialGradient>
      <radialGradient id="tangerine" cx="35%" cy="30%" r="70%">
        <stop offset="0" stopColor="#ffc06a" />
        <stop offset="0.6" stopColor="#f08a1e" />
        <stop offset="1" stopColor="#b85a08" />
      </radialGradient>
      <radialGradient id="beet" cx="45%" cy="40%" r="65%">
        <stop offset="0" stopColor="#c03d73" />
        <stop offset="1" stopColor="#6d1a3d" />
      </radialGradient>
      <radialGradient id="olivier" cx="45%" cy="40%" r="60%">
        <stop offset="0" stopColor="#fbf2d6" />
        <stop offset="1" stopColor="#e6d6a8" />
      </radialGradient>
      <radialGradient id="candlelight" r="0.5">
        <stop offset="0" stopColor="#ffd89a" stopOpacity="0.75" />
        <stop offset="0.4" stopColor="#ffcf86" stopOpacity="0.25" />
        <stop offset="1" stopColor="#ffcf86" stopOpacity="0" />
      </radialGradient>
      <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#3a2a12" floodOpacity="0.35" />
      </filter>
    </defs>
  );
}

/** A sprig of eucalyptus: thin stem, paired leaves. */
function Sprig({ x, y, r = 0, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M-40 0C-20 -3 20 3 40 0" stroke="#5f7d68" strokeWidth="1.2" fill="none" />
      {[-30, -18, -6, 6, 18, 30].map((d, i) => (
        <g key={d}>
          <ellipse cx={d} cy={-6} rx="4.5" ry="6.5" fill={i % 2 ? '#8fa996' : '#7b9784'} transform={`rotate(${-20 + i * 4} ${d} -6)`} />
          <ellipse cx={d + 5} cy={6} rx="4.5" ry="6.5" fill={i % 2 ? '#7b9784' : '#8fa996'} transform={`rotate(${20 - i * 4} ${d + 5} 6)`} />
        </g>
      ))}
    </g>
  );
}

/** Olivier, herring under a fur coat, tangerines, caviar with blini, champagne on ice, candelabra. */
function Feast() {
  return (
    <svg viewBox="0 0 420 260" className="size-full" aria-hidden>
      <Defs />
      {/* velvet runner */}
      <rect x="0" y="104" width="420" height="52" rx="2" fill="#163a2b" />
      <rect x="0" y="104" width="420" height="52" fill="none" stroke="#c59b4b" strokeWidth="1.2" strokeDasharray="1 3" opacity="0.8" />
      <Sprig x={70} y={130} r={-6} />
      <Sprig x={350} y={130} r={174} />

      {/* candelabra: brass base and three candles with their light */}
      <g transform="translate(210 130)">
        <circle r="70" fill="url(#candlelight)" className="flicker" />
        <ellipse rx="34" ry="9" fill="#a6823d" filter="url(#soft)" />
        <path d="M-30 0H30" stroke="#d8b56b" strokeWidth="3" strokeLinecap="round" />
        {[-26, 0, 26].map((x, i) => (
          <g key={x} transform={`translate(${x} 0)`}>
            <circle r="8" fill="url(#charger)" />
            <circle r="5" fill="#fbf6ea" />
            <g className="flicker" style={{ ['--i' as string]: i }}>
              <circle r="9" fill="url(#candlelight)" />
              <ellipse rx="2.2" ry="3.4" fill="#ffb54a" />
              <ellipse rx="1" ry="1.8" fill="#fff4d6" />
            </g>
          </g>
        ))}
      </g>

      {/* Olivier in a crystal bowl */}
      <g transform="translate(118 62)" filter="url(#soft)">
        <circle r="44" fill="url(#crystal)" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.2" />
        <circle r="36" fill="url(#olivier)" />
        {Array.from({ length: 34 }, (_, i) => {
          const a = i * 2.4;
          const r = 4 + ((i * 7) % 28);
          const fill = ['#5e9e3a', '#e8822c', '#e7b2a4', '#f3d35a'][i % 4];
          return <rect key={i} x={r * Math.cos(a) - 2} y={r * Math.sin(a) - 2} width="4" height="4" rx="1.2" fill={fill} opacity="0.9" />;
        })}
        <path d="M-6 -10c4-5 9-1 6 3" stroke="#3f7a3a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <ellipse cx="-16" cy="-24" rx="12" ry="5" fill="#fff" opacity="0.5" transform="rotate(-30 -16 -24)" />
      </g>

      {/* Herring under a fur coat on an oval dish */}
      <g transform="translate(300 62)" filter="url(#soft)">
        <ellipse rx="58" ry="40" fill="url(#porcelain)" />
        <ellipse rx="58" ry="40" fill="none" stroke="#c59b4b" strokeWidth="1.5" />
        <ellipse rx="42" ry="27" fill="#e9d9b6" />
        <ellipse rx="40" ry="25" fill="url(#beet)" />
        {[-22, -11, 0, 11, 22].map((x) => (
          <path key={x} d={`M${x - 8} -18q8 18 16 36`} stroke="#fbf3e2" strokeWidth="1.2" fill="none" opacity="0.65" />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <path key={i} d={`M${-26 + i * 6} ${-6 + ((i * 11) % 14)}l3 -2`} stroke="#4f8a45" strokeWidth="1.3" strokeLinecap="round" />
        ))}
      </g>

      {/* Tangerines in a brass bowl */}
      <g transform="translate(118 200)" filter="url(#soft)">
        <circle r="42" fill="url(#charger)" />
        <circle r="35" fill="#8a6a2c" opacity="0.5" />
        {[
          [-13, -11],
          [12, -13],
          [0, 6],
          [-16, 14],
          [16, 12],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="12.5" fill="url(#tangerine)" />
            <circle r="1.4" fill="#7a4a12" />
            {i % 2 === 0 && <path d="M2 -9c6-6 12-3 13 1-5 3-10 3-13-1z" fill="#3f6b3e" />}
          </g>
        ))}
      </g>

      {/* Red caviar in a crystal rosette, blini around */}
      <g transform="translate(300 200)" filter="url(#soft)">
        {[0, 72, 144, 216, 288].map((a) => (
          <g key={a} transform={`rotate(${a}) translate(34 0)`}>
            <circle r="14" fill="#e8b46a" />
            <circle r="11" fill="#f2c983" />
          </g>
        ))}
        <circle r="22" fill="url(#crystal)" stroke="#fff" strokeOpacity="0.6" />
        {Array.from({ length: 40 }, (_, i) => {
          const a = i * 2.39996;
          const r = 1.9 * Math.sqrt(i) * 1.7;
          return (
            <g key={i}>
              <circle cx={r * Math.cos(a)} cy={r * Math.sin(a)} r="2.6" fill="#d6411f" />
              <circle cx={r * Math.cos(a) - 0.8} cy={r * Math.sin(a) - 0.8} r="0.8" fill="#ffd3b8" />
            </g>
          );
        })}
      </g>

      {/* Champagne on ice in a silver bucket */}
      <g transform="translate(210 218)" filter="url(#soft)">
        <circle r="30" fill="url(#silver)" />
        <circle r="25" fill="#e9f1f3" opacity="0.6" />
        {[
          [-12, -10],
          [12, -8],
          [-10, 12],
          [13, 11],
          [0, -18],
        ].map(([x = 0, y = 0], i) => (
          <rect key={i} x={x - 5} y={y - 5} width="10" height="10" rx="2" fill="#ffffff" opacity="0.75" transform={`rotate(${i * 23} ${x} ${y})`} />
        ))}
        <circle r="11" fill="#173d2c" />
        <circle r="7" fill="#d8b56b" />
        <circle r="3" fill="#f6e3a8" />
      </g>
    </svg>
  );
}

/** One place setting, drawn upright (the guest sits below it), rotated to face the guest. */
function Setting({ angle }: { angle: number }) {
  return (
    <svg viewBox="-60 -60 120 120" className="size-full" style={{ transform: `rotate(${angle}deg)` }} aria-hidden>
      <Defs />
      <g filter="url(#soft)">
        <circle r="40" fill="url(#charger)" />
        <circle r="31" fill="url(#porcelain)" />
        <circle r="31" fill="none" stroke="#c59b4b" strokeWidth="1" />
        <circle r="22" fill="none" stroke="#e1d8c7" strokeWidth="1" />
      </g>
      {/* fork left, knife right */}
      <rect x="-52" y="-24" width="3" height="48" rx="1.5" fill="url(#silver)" />
      <path d="M-55 -24v-8M-52 -24v-8M-49 -24v-8M-46 -24v-8" stroke="#c9ced2" strokeWidth="1.2" strokeLinecap="round" transform="translate(2 0)" />
      <rect x="47" y="-30" width="4" height="56" rx="2" fill="url(#silver)" />
      {/* wine glass, top right */}
      <circle cx="44" cy="-46" r="9" fill="url(#crystal)" stroke="#fff" strokeOpacity="0.7" />
      <circle cx="44" cy="-46" r="5.5" fill="#8e2335" opacity="0.75" />
    </svg>
  );
}

function around(i: number, n: number, rx: number, ry: number) {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { x: 50 + rx * Math.cos(a), y: 50 + ry * Math.sin(a), deg: (a * 180) / Math.PI };
}

/**
 * The lobby is a New Year table set for everyone. Guests in the lobby right now sit at their
 * place, lit by the candles; when someone leaves, their chair is pushed back and they dim.
 */
export function Table({
  people,
  meId,
  center,
  said = {},
}: {
  people: Person[];
  meId: number;
  center?: ReactNode;
  /** latest line of table talk per guest, shown above their chair for a moment */
  said?: Record<number, { text: string; key: number }>;
}) {
  const n = Math.max(people.length, 1);
  return (
    // Chairs sit on the rim and stick out past the box: the margins keep them off the text around it.
    <div className="relative mx-auto my-[14%] aspect-[3/4] w-full max-w-[560px] sm:my-[7%] sm:aspect-[16/10] sm:max-w-[900px]">
      {/* linen tablecloth with a pool of candlelight and a soft drape at the edge */}
      <div
        className="absolute inset-x-[11%] inset-y-[13%] rounded-[50%]"
        style={{
          background:
            'radial-gradient(60% 55% at 50% 50%, #fffaf0 0%, #f1e8d6 55%, #d8ccb4 100%), repeating-linear-gradient(0deg, #0000000a 0 1px, transparent 1px 3px)',
          backgroundBlendMode: 'multiply',
          boxShadow: '0 0 0 1px #00000040, inset 0 -14px 30px #00000026, inset 0 10px 24px #ffffff80, 0 50px 90px -30px #000000d0',
        }}
      />
      {/* place settings */}
      {people.map((p, i) => {
        const pos = around(i, n, 29, 27);
        return (
          <div key={`set-${p.id}`} className="absolute aspect-square w-[15%] -translate-x-1/2 -translate-y-1/2 sm:w-[10%]" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
            <Setting angle={pos.deg - 90} />
          </div>
        );
      })}
      {/* the feast, or the wheel at draw time */}
      <div className={cn('absolute grid place-items-center', center ? 'inset-[17%]' : 'inset-x-[20%] inset-y-[27%] sm:inset-x-[21%] sm:inset-y-[25%]')}>
        {center ? <div className="aspect-square h-full max-h-full max-w-full">{center}</div> : <Feast />}
      </div>

      <ul aria-label="За столом">
        {people.map((p, i) => {
          const pos = around(i, n, 45, 44);
          const here = p.activated && p.online;
          const me = p.id === meId;
          const line = said[p.id];
          return (
            <li
              key={p.id}
              className="absolute w-[21%] -translate-x-1/2 -translate-y-1/2 sm:w-[12%]"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: line ? 20 : 1 }}
            >
              {line && (
                <span
                  key={line.key}
                  className="say absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[11rem] rounded-2xl rounded-bl-sm bg-snow px-3 py-1.5 text-left text-[13px] leading-snug text-night shadow-[0_10px_24px_-8px_#000]"
                >
                  {line.text.length > 90 ? `${line.text.slice(0, 88)}…` : line.text}
                </span>
              )}
              {/* velvet chair; pushed back from the table when its guest is away */}
              <div className="relative aspect-square w-full" style={{ transform: `rotate(${pos.deg - 90}deg)` }}>
               <div className="chair absolute inset-0" data-here={here} style={{ ['--push' as string]: '14%' }}>
                <span className="absolute inset-x-[4%] bottom-[-8%] top-[62%] rounded-b-[45%] rounded-t-md bg-[linear-gradient(180deg,#4a2c1a,#2a170c)] shadow-[0_6px_10px_-4px_#000]" aria-hidden />
                <span
                  className="absolute inset-[8%] rounded-[34%] bg-[radial-gradient(70%_70%_at_40%_35%,#2f6a52,#173a2c_70%,#0f281e)] shadow-[inset_0_0_0_2px_#c59b4b55,0_8px_16px_-6px_#000]"
                  aria-hidden
                />
                <div className="absolute inset-[18%]" style={{ transform: `rotate(${-(pos.deg - 90)}deg)` }}>
                  {p.activated ? (
                    <div className="guest size-full" data-here={here}>
                      <Avatar
                        id={p.id}
                        name={p.name}
                        avatar={p.avatar}
                        className={cn('size-full text-sm shadow-[0_6px_14px_-4px_#000]', me ? 'ring-2 ring-gold ring-offset-2 ring-offset-[#173a2c]' : 'ring-1 ring-gold/60')}
                      />
                    </div>
                  ) : (
                    <span className="grid size-full place-items-center rounded-full border border-dashed border-gold/40 font-display text-lg italic text-gold/70" aria-hidden>
                      ?
                    </span>
                  )}
                </div>
               </div>
              </div>
              {/* place card */}
              <span
                className={cn(
                  'mx-auto mt-1 block w-max max-w-full truncate rounded-[3px] border px-2 py-0.5 text-center font-display text-[15px] italic leading-5 shadow-[0_3px_8px_-3px_#000] sm:text-[17px]',
                  me ? 'border-gold-deep bg-[linear-gradient(180deg,#f3dfa6,#d8b56b)] text-[#2a1d10]' : 'border-gold/50 bg-[#fbf6ea] text-[#3b2a18]',
                )}
              >
                {p.name}
                {me && <span className="sr-only"> (это ты)</span>}
              </span>
              <span className="sr-only">{!p.activated ? 'ещё не присоединился' : here ? 'за столом' : 'отошёл'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
