import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Dish, Fx, Lobby, TableAction, TableState } from '../api';
import { Avatar } from './Avatar';
import { Coin } from './Coin';
import { burst } from './Festive';
import { cn } from './ui';

type Person = Lobby['participants'][number];

/** Top-down food photos (Unsplash licence), shown inside crystal bowls. */
const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=360&h=360&fit=crop&q=70&fm=webp`;
export const FOOD: Record<Dish, { src: string; label: string }> = {
  olivier: { src: U('1777994505589-75c2028c80fa'), label: 'оливье' },
  shuba: { src: U('1762328845844-64b041d0c5f1'), label: 'шуба' },
  tang: { src: U('1607116692929-ece4c84a5992'), label: 'мандарины' },
  caviar: { src: U('1728335026927-8ee0382ada94'), label: 'икорка' },
};

function usePortrait() {
  const q = '(max-width: 639px)';
  const [p, setP] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const on = () => setP(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return p;
}

function around(i: number, n: number, rx: number, ry: number) {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { x: 50 + rx * Math.cos(a), y: 50 + ry * Math.sin(a) };
}

/** A tangerine flying across the table along an arc. */
function Flying({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const peak = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 18 };
    ref.current?.animate(
      [
        { left: `${from.x}%`, top: `${from.y}%`, transform: 'translate(-50%,-50%) rotate(0deg) scale(.8)' },
        { left: `${peak.x}%`, top: `${peak.y}%`, transform: 'translate(-50%,-50%) rotate(300deg) scale(1.3)', offset: 0.5 },
        { left: `${to.x}%`, top: `${to.y}%`, transform: 'translate(-50%,-50%) rotate(620deg) scale(.9)' },
      ],
      { duration: 950, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' },
    );
  }, [from, to]);
  return (
    <span
      ref={ref}
      className="pointer-events-none absolute z-30 aspect-square w-[4.5%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffc06a,#f08a1e_60%,#b85a08)] shadow-[0_8px_12px_#0007] sm:w-[3%]"
      style={{ left: `${from.x}%`, top: `${from.y}%`, transform: 'translate(-50%,-50%)' }}
      aria-hidden
    />
  );
}

/**
 * The lobby: Granny's table. Guests sit on stools around a lace tablecloth; the crystal bowls,
 * the champagne, the candles and the tangerines all react to taps, and everyone sees it.
 */
export function Table({
  people,
  meId,
  center,
  said = {},
  table,
  fx = [],
  onAct,
  tipAim = false,
  onTipDone,
}: {
  people: Person[];
  meId: number;
  center?: ReactNode;
  said?: Record<number, { text: string; key: number }>;
  table?: TableState | null;
  fx?: { id: number; fx: Fx }[];
  onAct?: (a: TableAction) => void;
  /** the next tap on a guest tips them */
  tipAim?: boolean;
  onTipDone?: () => void;
}) {
  const portrait = usePortrait();
  const [aiming, setAiming] = useState(false);
  const bottle = useRef<HTMLButtonElement>(null);
  const seatEls = useRef(new Map<number, HTMLElement>());
  const n = Math.max(people.length, 1);
  const seatOf = (id: number) => {
    const i = people.findIndex((p) => p.id === id);
    return around(Math.max(0, i), n, 45, 44);
  };
  const interactive = Boolean(onAct) && !center;

  // Bursts need screen coordinates: champagne pops at the bottle, crackers at the guest.
  const played = useRef(new Set<number>());
  useEffect(() => {
    for (const { id, fx: f } of fx) {
      if (played.current.has(id)) continue;
      played.current.add(id);
      const el = f.type === 'pop' ? bottle.current : f.type === 'cracker' ? seatEls.current.get(f.user) : null;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      void burst({ x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight });
    }
  }, [fx]);

  const dishes: [Dish, number, number, number][] = portrait
    ? [
        ['olivier', 50, 29, 27],
        ['shuba', 50, 71, 27],
        ['tang', 27, 50, 19],
        ['caviar', 73, 50, 19],
      ]
    : [
        ['olivier', 35, 35, 15],
        ['shuba', 65, 35, 15],
        ['tang', 35, 65, 13],
        ['caviar', 65, 65, 13],
      ];
  const candles: [number, number][] = portrait
    ? [
        [33, 36],
        [67, 64],
      ]
    : [
        [42, 50],
        [58, 50],
      ];
  const recent = (pred: (f: Fx) => boolean) => fx.filter((e) => pred(e.fx));

  return (
    // Stools sit on the rim and stick out past the box: the margins keep them off the text around it.
    <div className="relative mx-auto mb-[12%] mt-[20%] aspect-[3/4.2] w-full max-w-[560px] select-none sm:mb-[6%] sm:mt-[10%] sm:aspect-[16/10] sm:max-w-[900px]">
      {/* lace tablecloth */}
      <div
        className="lace absolute inset-x-[10%] inset-y-[11%] rounded-[50%] shadow-[0_50px_90px_-30px_#000c]"
        style={{ background: 'radial-gradient(60% 55% at 50% 45%, #fffdf8, #f2ebdd 70%, #e2d6c0)' }}
      >
        <span className="absolute inset-[6%] rounded-[50%] border-2 border-dashed border-[#d6c6a6]" aria-hidden />
      </div>

      {/* place settings: a blue-rimmed plate (with whatever you took) and a glass */}
      {people.map((p, i) => {
        const pos = around(i, n, portrait ? 27 : 29, portrait ? 30 : 27);
        const dish = table?.plates[p.id];
        const full = table?.glasses.includes(p.id);
        const mine = p.id === meId;
        return (
          <div key={`set-${p.id}`} className="absolute aspect-square w-[15%] -translate-x-1/2 -translate-y-1/2 sm:w-[8.5%]" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,#fff_55%,#e8e0cf_56%,#fff_64%,#e9dfca)] shadow-[0_0_0_2px_#3b6fb6,0_8px_14px_-6px_#3a1e1288]" />
            <span className="absolute inset-[30%] rounded-full border-2 border-[#3b6fb6aa]" />
            {dish && <img key={`${dish}-${p.id}`} src={FOOD[dish].src} alt="" className="hop absolute inset-[18%] size-[64%] rounded-full object-cover" />}
            <button
              type="button"
              disabled={!mine || !interactive || table?.champagne !== 'open'}
              onClick={() => onAct?.({ kind: 'clink' })}
              className={cn(
                'absolute -right-[28%] -top-[28%] grid aspect-square w-[46%] place-items-center rounded-full border-2 border-white/80 shadow-[0_4px_10px_#0006] transition-transform enabled:cursor-pointer enabled:hover:scale-110',
                full ? 'bg-[radial-gradient(circle_at_40%_35%,#fff6c9,#f2c94c_60%,#c99a3c)]' : 'bg-white/40',
              )}
              aria-label={mine ? 'Чокнуться' : `Бокал: ${p.name}`}
              title={mine && table?.champagne === 'open' ? 'Чин-чин!' : undefined}
            >
              {recent((f) => f.type === 'clink' && f.user === p.id).map((e) => (
                <span key={e.id} className="clink-ring absolute inset-[-40%] rounded-full border-2 border-gold" aria-hidden />
              ))}
            </button>
          </div>
        );
      })}

      {/* the feast, or the wheel at draw time */}
      {center ? (
        <div className="absolute inset-[17%] grid place-items-center">
          <div className="aspect-square h-full max-h-full max-w-full">{center}</div>
        </div>
      ) : (
        <>
          {dishes.map(([d, x, y, w]) => {
            const left = table?.portions[d];
            const isTang = d === 'tang';
            return (
              <div key={d} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%`, width: `${w}%` }}>
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={() => (isTang ? setAiming((a) => !a) : onAct?.({ kind: 'eat', dish: d }))}
                  className={cn(
                    'crystal block aspect-square w-full rounded-full p-[6%] shadow-[0_14px_22px_-8px_#3a1e1288] transition-transform duration-200 enabled:cursor-pointer enabled:hover:-translate-y-1 enabled:active:scale-95',
                    isTang && aiming && 'ring-4 ring-gold',
                  )}
                  aria-label={isTang ? 'Взять мандарин, чтобы кинуть в друга' : `Положить себе: ${FOOD[d].label}`}
                >
                  <img src={FOOD[d].src} alt="" className="size-full rounded-full object-cover shadow-[inset_0_0_0_2px_#fff]" draggable={false} />
                </button>
                <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap border border-[#d9b98a] bg-cream px-2 font-serif text-[12px] italic text-cloth sm:text-[13px]">
                  {FOOD[d].label}
                  {left !== undefined && <span className="ml-1 not-italic text-[#a08560] tnum">· {left}</span>}
                </span>
                {recent((f) => f.type === 'eat' && f.dish === d && f.refilled).map((e) => (
                  <span key={e.id} className="float-up absolute left-1/2 top-0 z-20 whitespace-nowrap rounded-full bg-cream px-2.5 py-1 font-hand text-lg text-cloth shadow">
                    бабушка доложила!
                  </span>
                ))}
              </div>
            );
          })}

          {/* «Советское» in the middle: tap to pop, then everyone's glass is full */}
          <button
            ref={bottle}
            type="button"
            disabled={!interactive}
            onClick={() => onAct?.({ kind: 'pop' })}
            className="absolute left-1/2 top-1/2 z-10 grid aspect-square w-[11%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[radial-gradient(circle_at_40%_35%,#3c6b47,#123a22)] shadow-[0_0_0_5px_#183f28,0_10px_18px_-4px_#000] enabled:cursor-pointer enabled:hover:scale-105 sm:w-[6%]"
            aria-label={table?.champagne === 'open' ? 'Шампанское открыто: чокнуться' : 'Открыть шампанское'}
          >
            <span
              className={cn(
                'block aspect-square w-[46%] rounded-full',
                table?.champagne === 'open' ? 'bg-[radial-gradient(#fffbe8,#f6e7a6)] shadow-[0_0_0_3px_#fff8,0_0_12px_#fff]' : 'bg-[radial-gradient(#f5d77a,#b48a2c)]',
              )}
            />
          </button>
          <span className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap border border-[#d9b98a] bg-cream px-2 font-serif text-[12px] italic text-cloth" style={{ top: portrait ? '55.5%' : '57%' }}>
            «Советское»{table?.champagne === 'open' ? ' · открыто' : ''}
          </span>

          {candles.map(([x, y], i) => {
            const lit = table?.candles[i] ?? true;
            return (
              <button
                key={i}
                type="button"
                disabled={!interactive}
                onClick={() => onAct?.({ kind: 'candle', index: i as 0 | 1 })}
                className="absolute z-10 grid aspect-square w-[6%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#fbf4e4] shadow-[0_0_0_3px_#c99a3c] enabled:cursor-pointer sm:w-[3%]"
                style={{ left: `${x}%`, top: `${y}%` }}
                aria-label={lit ? 'Задуть свечу' : 'Зажечь свечу'}
              >
                {lit && <span className="flicker block aspect-square w-[55%] rounded-full bg-[#ffb44a] shadow-[0_0_14px_8px_#ffcf86aa]" />}
              </button>
            );
          })}
        </>
      )}

      {/* stools and guests */}
      <ul aria-label="За столом">
        {people.map((p, i) => {
          const pos = around(i, n, 45, 44);
          const here = p.activated && p.online;
          const me = p.id === meId;
          const line = said[p.id];
          const tangs = table?.tangerines[p.id] ?? 0;
          const target = (aiming || tipAim) && !me && p.activated;
          return (
            <li
              key={p.id}
              ref={(el) => {
                if (el) seatEls.current.set(p.id, el);
              }}
              className="absolute w-[21%] -translate-x-1/2 -translate-y-1/2 text-center sm:w-[11%]"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: line ? 20 : 5 }}
            >
              {line && (
                <span
                  key={line.key}
                  className="say absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[11rem] rounded-2xl rounded-bl-sm bg-cream px-3 py-1.5 text-left text-[13px] leading-snug text-ink shadow-[0_10px_24px_-8px_#000]"
                >
                  {line.text.length > 90 ? `${line.text.slice(0, 88)}…` : line.text}
                </span>
              )}
              {recent((f) => f.type === 'tip' && f.target === p.id).map((e) => (
                <span key={e.id} className="float-up pointer-events-none absolute bottom-[70%] left-1/2 z-30 flex flex-col items-center" aria-hidden>
                  <span className="flex items-center gap-1 rounded-md bg-[linear-gradient(180deg,#fff2a8,#ffcf3d_45%,#e09b12)] px-2.5 py-0.5 font-serif text-[15px] font-bold uppercase tracking-wider text-[#5a3200] shadow-[0_0_0_2px_#7a4a00,0_6px_14px_#000a]">
                    <Coin className="size-5" /> tipped
                  </span>
                </span>
              ))}
              {recent((f) => f.type === 'react' && f.user === p.id).map((e) => (
                <span key={e.id} className="float-up absolute bottom-full left-1/2 z-20 text-3xl" aria-hidden>
                  {(e.fx as { emoji: string }).emoji}
                </span>
              ))}
              <button
                type="button"
                disabled={!target}
                onClick={() => {
                  if (tipAim) {
                    onAct?.({ kind: 'tip', target: p.id });
                    onTipDone?.();
                  } else {
                    onAct?.({ kind: 'throw', target: p.id });
                    setAiming(false);
                  }
                }}
                className={cn(
                  'relative block aspect-square w-full rounded-full bg-[radial-gradient(circle_at_40%_35%,#a6693a,#5c3416)] shadow-[0_12px_20px_-6px_#000,inset_0_0_0_4px_#00000022]',
                  target && 'cursor-crosshair ring-4 ring-gold ring-offset-2 ring-offset-transparent',
                  recent((f) => f.type === 'eat' && f.user === p.id).length > 0 && 'hop',
                )}
                aria-label={target ? (tipAim ? `Типнуть ${p.name}` : `Кинуть мандарин в ${p.name}`) : p.name}
              >
                {p.activated ? (
                  <Avatar
                    id={p.id}
                    name={p.name}
                    avatar={p.avatar}
                    className={cn(
                      'absolute inset-[13%] size-[74%] border-[3px] border-cream text-lg shadow-[0_6px_12px_-4px_#000] transition-[filter,opacity] duration-500',
                      !here && 'opacity-60 grayscale',
                    )}
                  />
                ) : (
                  <span className="absolute inset-[13%] grid place-items-center rounded-full border-2 border-dashed border-cream/50 font-display text-2xl text-cream/70">?</span>
                )}
                {tangs > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-[#f08a1e] px-1.5 text-[12px] font-semibold leading-5 text-white shadow tnum" title="Сколько мандаринов прилетело">
                    🍊{tangs}
                  </span>
                )}
              </button>
              <span className={cn('mt-1 block truncate font-hand text-[21px] leading-6 [text-shadow:0_2px_6px_#000] sm:text-[24px]', me ? 'text-gold' : 'text-cream')}>{p.name}</span>
              <span className="sr-only">{!p.activated ? 'ещё не присоединился' : here ? 'за столом' : 'отошёл'}</span>
            </li>
          );
        })}
      </ul>

      {/* tangerines in flight */}
      {recent((f) => f.type === 'throw').map((e) => {
        const f = e.fx as { user: number; target: number };
        return <Flying key={e.id} from={seatOf(f.user)} to={seatOf(f.target)} />;
      })}

      {(aiming || tipAim) && (
        <p className="absolute inset-x-0 -bottom-10 text-center font-hand text-2xl text-gold [text-shadow:0_2px_6px_#000]" role="status">
          {tipAim ? 'Кого типнуть? Тапни по другу' : 'В кого кидаем? Тапни по другу'}
        </p>
      )}
    </div>
  );
}
