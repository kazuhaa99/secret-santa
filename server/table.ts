/**
 * The shared New Year table: what is left in the dishes, whose plate holds what, the champagne,
 * candles and tangerines. Lives in memory (a restart sets a fresh table) and changes only through
 * act(), which also says what to animate on everyone's screen.
 */
export const DISHES = { olivier: 'оливье', shuba: 'шуба', tang: 'мандарины', caviar: 'икорка' } as const;
export type Dish = keyof typeof DISHES;
export const REACTIONS = ['🥂', '🎄', '😂', '❤️', '🍊', '🎉'] as const;

const FULL: Record<Dish, number> = { olivier: 12, shuba: 10, tang: 20, caviar: 8 };

export interface TableState {
  portions: Record<Dish, number>;
  plates: Record<number, Dish>;
  champagne: 'closed' | 'open';
  glasses: number[];
  candles: [boolean, boolean];
  tangerines: Record<number, number>;
  /** when each guest last tipped someone (cooldown) */
  tippedAt: Record<number, number>;
}

export type Action =
  | { kind: 'eat'; dish: Dish }
  | { kind: 'pop' }
  | { kind: 'clink' }
  | { kind: 'throw'; target: number }
  | { kind: 'candle'; index: 0 | 1 }
  | { kind: 'cracker' }
  | { kind: 'react'; emoji: string }
  | { kind: 'tip'; target: number };

export const TIP_COOLDOWN_MS = 2 * 60_000;

/** What every screen should play, besides showing the new state. */
export type Fx =
  | { type: 'eat'; user: number; dish: Dish; refilled: boolean }
  | { type: 'pop'; user: number }
  | { type: 'clink'; user: number }
  | { type: 'throw'; user: number; target: number }
  | { type: 'candle'; user: number; index: number; lit: boolean }
  | { type: 'cracker'; user: number }
  | { type: 'react'; user: number; emoji: string }
  | { type: 'tip'; user: number; target: number };

export function freshTable(): TableState {
  return { portions: { ...FULL }, plates: {}, champagne: 'closed', glasses: [], candles: [true, true], tangerines: {}, tippedAt: {} };
}

export class TableError extends Error {}

/** Applies one guest's action. `guests` are the ids allowed as tangerine targets. */
export function act(state: TableState, user: number, a: Action, guests: number[], now = Date.now()): Fx {
  switch (a.kind) {
    case 'eat': {
      if (!(a.dish in FULL)) throw new TableError('Такого блюда нет');
      // Granny brings more as soon as a dish runs out.
      const refilled = state.portions[a.dish] <= 0;
      if (refilled) state.portions[a.dish] = FULL[a.dish];
      state.portions[a.dish] -= 1;
      state.plates[user] = a.dish;
      return { type: 'eat', user, dish: a.dish, refilled };
    }
    case 'pop':
      if (state.champagne === 'open') {
        state.glasses = [...new Set([...state.glasses, user])];
        return { type: 'clink', user };
      }
      state.champagne = 'open';
      state.glasses = [...guests];
      return { type: 'pop', user };
    case 'clink':
      if (state.champagne === 'closed') throw new TableError('Сначала открой шампанское');
      if (!state.glasses.includes(user)) state.glasses.push(user);
      return { type: 'clink', user };
    case 'throw': {
      if (a.target === user || !guests.includes(a.target)) throw new TableError('Кинуть можно только в другого гостя');
      if (state.portions.tang <= 0) state.portions.tang = FULL.tang;
      state.portions.tang -= 1;
      state.tangerines[a.target] = (state.tangerines[a.target] ?? 0) + 1;
      return { type: 'throw', user, target: a.target };
    }
    case 'candle': {
      if (a.index !== 0 && a.index !== 1) throw new TableError('Такой свечи нет');
      state.candles[a.index] = !state.candles[a.index];
      return { type: 'candle', user, index: a.index, lit: state.candles[a.index] };
    }
    case 'tip': {
      if (a.target === user || !guests.includes(a.target)) throw new TableError('Типнуть можно только другого гостя');
      const last = state.tippedAt[user];
      const wait = last === undefined ? 0 : last + TIP_COOLDOWN_MS - now;
      if (wait > 0) throw new TableError(`Типнуть снова можно через ${Math.ceil(wait / 1000)} с`);
      state.tippedAt[user] = now;
      return { type: 'tip', user, target: a.target };
    }
    case 'cracker':
      return { type: 'cracker', user };
    case 'react':
      if (!(REACTIONS as readonly string[]).includes(a.emoji)) throw new TableError('Такой реакции нет');
      return { type: 'react', user, emoji: a.emoji };
    default:
      throw new TableError('Неизвестное действие');
  }
}

export const TOASTS = [
  'Чтобы в новом году подарки угадывали с первого раза!',
  'За то, чтобы оливье не кончался, а друзья не менялись!',
  'Пусть Тайный Санта знает тебя лучше, чем ты сам!',
  'За Сигаретку: чтобы собирались чаще, чем раз в год!',
  'Чтобы бабушка была довольна, а мандарины — сладкие!',
  'За тех, кто уже купил подарок, и за тех, кто купит 31-го!',
  'Пусть всё плохое останется в старом году вместе с селёдкой под шубой!',
  'Чтобы куранты били вовремя, а желания сбывались!',
];
