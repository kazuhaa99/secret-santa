import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, plural, type Fx, type Lobby as LobbyData, type Me, type TableAction, type TableState } from '../api';
import { Avatar } from '../components/Avatar';
import { Coin } from '../components/Coin';
import { Chat, type Message } from '../components/Chat';
import { burst } from '../components/Festive';
import { Table } from '../components/Table';
import { TextScramble } from '../components/text-scramble';
import { Button, Notice } from '../components/ui';
import { Tv } from '../components/Tv';
import { Wheel } from '../components/Wheel';

const REACTIONS = ['🥂', '🎄', '😂', '❤️', '🍊'];

interface Slot {
  id: number;
  name: string;
  avatar: number | null;
}
interface Assignment {
  receiver: Slot;
  wheel: Slot[];
}

/** The spin plays once per draw on this device; after that the result is shown straight away. */
const seenKey = (drawnAt: string) => `ss-seen-${drawnAt}`;
const wasSeen = (drawnAt: string) => {
  try {
    return localStorage.getItem(seenKey(drawnAt)) === '1';
  } catch {
    return false;
  }
};

export function Lobby({ me }: { me: Me }) {
  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const [live, setLive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatReady, setChatReady] = useState(false);
  const [said, setSaid] = useState<Record<number, { text: string; key: number }>>({});
  const lastId = useRef(0);
  const [table, setTable] = useState<TableState | null>(null);
  const [fx, setFx] = useState<{ id: number; fx: Fx }[]>([]);
  const fxId = useRef(0);
  const playFx = useCallback((f: Fx) => {
    const id = ++fxId.current;
    setFx((prev) => [...prev, { id, fx: f }]);
    setTimeout(() => setFx((prev) => prev.filter((e) => e.id !== id)), 2600);
  }, []);
  const tableAct = useCallback((a: TableAction) => void api('/api/table', { method: 'POST', body: a }).catch(() => {}), []);
  const [tipAim, setTipAim] = useState(false);
  const [tipReadyAt, setTipReadyAt] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => {
    if (tipReadyAt <= Date.now()) return;
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [tipReadyAt]);
  const tipLeft = Math.max(0, Math.ceil((tipReadyAt - Date.now()) / 1000));
  const toast = useCallback(() => void api('/api/toast', { method: 'POST' }).catch(() => {}), []);

  /** Adds messages from the server, by id, keeping the ones still being sent at the end. */
  const merge = useCallback((list: Message[]) => {
    if (!list.length) return;
    setMessages((prev) => {
      const byId = new Map(prev.filter((m) => m.id > 0).map((m) => [m.id, m]));
      for (const m of list) byId.set(m.id, m);
      const sent = [...byId.values()].sort((a, b) => a.id - b.id);
      lastId.current = Math.max(lastId.current, sent.at(-1)?.id ?? 0);
      return [...sent, ...prev.filter((m) => m.id < 0)];
    });
  }, []);

  /** Fetches whatever the live stream may have missed. */
  const catchUp = useCallback(async () => {
    try {
      merge(await api<Message[]>(lastId.current ? `/api/chat?after=${lastId.current}` : '/api/chat'));
    } catch {
      /* next tick tries again */
    } finally {
      setChatReady(true);
    }
  }, [merge]);

  /*
   * One live stream (who is at the table, table talk, the draw), plus a safety net: catch up on
   * every (re)connect, poll every 10 s, and reconnect if the stream has been silent for 40 s
   * (the server pings every 25 s), e.g. after a phone slept or the site was redeployed.
   */
  useEffect(() => {
    let es: EventSource | null = null;
    let heard = Date.now();
    const onLobby = (e: MessageEvent<string>) => {
      heard = Date.now();
      setLobby(JSON.parse(e.data) as LobbyData);
    };
    const connect = () => {
      es?.close();
      es = new EventSource('/api/lobby/stream');
      heard = Date.now();
      es.addEventListener('presence', onLobby);
      es.addEventListener('draw', onLobby);
      es.addEventListener('ping', () => (heard = Date.now()));
      es.addEventListener('chat', (e: MessageEvent<string>) => {
        heard = Date.now();
        const m = JSON.parse(e.data) as Message;
        merge([m]);
        setSaid((prev) => ({ ...prev, [m.userId]: { text: m.text, key: m.id } }));
      });
      es.addEventListener('table', (e: MessageEvent<string>) => {
        heard = Date.now();
        const { state, fx: f } = JSON.parse(e.data) as { state: TableState; fx: Fx };
        setTable(state);
        playFx(f);
        if (f.type === 'tip' && f.user === me.id) setTipReadyAt(Date.now() + 120_000);
      });
      es.addEventListener('chat-delete', (e: MessageEvent<string>) => {
        const { id } = JSON.parse(e.data) as { id: number };
        setMessages((prev) => prev.filter((m) => m.id !== id));
      });
      es.onopen = () => {
        setLive(true);
        void catchUp();
        api<LobbyData>('/api/lobby').then(setLobby, () => {});
        api<TableState>('/api/table').then(setTable, () => {});
      };
      es.onerror = () => setLive(false);
    };

    api<LobbyData>('/api/lobby').then((l) => setLobby((prev) => prev ?? l), () => {});
    void catchUp();
    connect();
    const tick = setInterval(() => {
      if (document.hidden) return;
      void catchUp();
      if (Date.now() - heard > 40_000) connect();
    }, 10_000);
    const onVisible = () => {
      if (document.hidden) return;
      void catchUp();
      if (Date.now() - heard > 40_000) connect();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
      es?.close();
    };
  }, [catchUp, merge, playFx, me.id]);

  /** The message shows up at once as "sending"; it is replaced by the stored one or marked failed. */
  const send = useCallback(
    async (text: string, retryOf?: number) => {
      const temp = retryOf ?? -Date.now();
      const draft: Message = { id: temp, userId: me.id, name: me.name, avatar: me.avatar, text, at: Date.now(), status: 'sending' };
      setMessages((prev) => (retryOf ? prev.map((m) => (m.id === retryOf ? draft : m)) : [...prev, draft]));
      try {
        const saved = await api<Message>('/api/chat', { method: 'POST', body: { text } });
        setMessages((prev) => prev.filter((m) => m.id !== temp));
        merge([saved]);
      } catch (e) {
        const error = e instanceof ApiError ? e.message : 'Нет связи';
        setMessages((prev) => prev.map((m) => (m.id === temp ? { ...m, status: 'failed', error } : m)));
      }
    },
    [me, merge],
  );
  const remove = useCallback((id: number) => void api(`/api/admin/chat/${id}`, { method: 'DELETE' }).catch(() => {}), []);

  if (!lobby) return <p className="px-5 py-16 text-center font-display text-2xl italic text-frost">Накрываем на стол…</p>;

  const here = lobby.participants.filter((p) => p.online).length;
  const drawn = Boolean(lobby.drawnAt);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="space-y-6">
        <div className="rise">
          <Tv title={drawn ? 'Жеребьёвка!' : lobby.title} drawAt={lobby.drawAt} drawn={drawn} />
        </div>
        <p className="text-center font-hand text-[26px] leading-tight text-gold [text-shadow:0_2px_6px_#000]" aria-live="polite">
          за столом {here} из {plural(lobby.participants.length, ['гостя', 'гостей', 'гостей'])}
          {!live && <span className="font-sans text-sm text-frost"> · переподключаемся</span>}
        </p>
        {lobby.drawError && (
          <div className="mx-auto max-w-md">
            <Notice tone="error">Жеребьёвка не состоялась: {lobby.drawError}</Notice>
          </div>
        )}

        {drawn ? (
          <Draw drawnAt={lobby.drawnAt!} people={lobby.participants} meId={me.id} said={said} />
        ) : (
          <>
            <Table people={lobby.participants} meId={me.id} said={said} table={table} fx={fx} onAct={tableAct} tipAim={tipAim} onTipDone={() => setTipAim(false)} />
            {/* things to do at the table besides eating */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {REACTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => tableAct({ kind: 'react', emoji: e })}
                  className="grid size-11 place-items-center rounded-full bg-cream text-xl shadow-[0_4px_0_#d9b98a] transition-transform active:translate-y-0.5 active:scale-95"
                  aria-label={`Реакция ${e}`}
                >
                  {e}
                </button>
              ))}
              <button type="button" onClick={() => tableAct({ kind: 'cracker' })} className="min-h-11 rounded-full bg-cream px-4 font-serif font-bold text-cloth shadow-[0_4px_0_#d9b98a] active:translate-y-0.5">
                🎉 Хлопушка
              </button>
              <button
                type="button"
                disabled={tipLeft > 0}
                onClick={() => setTipAim((a) => !a)}
                aria-pressed={tipAim}
                className={`flex min-h-11 items-center gap-1.5 rounded-full px-4 font-serif font-bold shadow-[0_4px_0_#7a4a00] active:translate-y-0.5 disabled:opacity-60 ${tipAim ? 'bg-[#ffcf3d] text-[#5a3200] ring-4 ring-gold/50' : 'bg-[linear-gradient(180deg,#fff2a8,#ffcf3d_45%,#e09b12)] text-[#5a3200]'}`}
              >
                <Coin className="size-5" /> {tipLeft > 0 ? `Типнуть через ${Math.floor(tipLeft / 60)}:${String(tipLeft % 60).padStart(2, '0')}` : tipAim ? 'Кого типнуть?' : 'Типнуть'}
              </button>
              <button type="button" onClick={toast} className="min-h-11 rounded-full bg-gold px-4 font-serif font-bold text-ink shadow-[0_4px_0_#c99a3c] active:translate-y-0.5">
                🥂 Сказать тост
              </button>
            </div>
            <p className="mx-auto max-w-[52ch] text-center font-serif text-[14px] italic text-frost">
              Тапни по салату — положишь себе. По вазе с мандаринами, а потом по другу — кинешь. Шампанское открывается тапом по «Советскому», потом можно чокнуться своим бокалом. Свечи задуваются.
            </p>
          </>
        )}

        <p className="text-center text-sm text-frost">Чтобы сменить фото за столом, пришли новое боту в Telegram.</p>
      </div>

      <div>
        <Chat ready={chatReady} messages={messages} meId={me.id} canDelete={me.isAdmin} onSend={send} onDelete={remove} />
      </div>
    </div>
  );
}

function Draw({
  drawnAt,
  people,
  meId,
  said,
}: {
  drawnAt: string;
  people: LobbyData['participants'];
  meId: number;
  said: Record<number, { text: string; key: number }>;
}) {
  const [data, setData] = useState<Assignment | null>(null);
  const [missing, setMissing] = useState(false);
  const [phase, setPhase] = useState<'spin' | 'reveal'>(() => (wasSeen(drawnAt) ? 'reveal' : 'spin'));
  const [run, setRun] = useState(0);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Assignment>('/api/assignment').then(setData, (e) => setMissing(e instanceof ApiError && e.status === 404));
  }, [drawnAt]);

  const done = useCallback(() => {
    try {
      localStorage.setItem(seenKey(drawnAt), '1');
    } catch {
      /* private mode: the spin just plays again next time */
    }
    setPhase('reveal');
    void burst();
    requestAnimationFrame(() => card.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }, [drawnAt]);

  if (missing)
    return (
      <>
        <Table people={people} meId={meId} said={said} />
        <div className="mx-auto max-w-md text-center">
          <h2 className="font-display text-3xl">Жеребьёвка прошла без тебя</h2>
          <p className="mt-3 text-frost">Ты присоединился уже после неё. Напиши организатору: он может провести её заново.</p>
        </div>
      </>
    );

  return (
    <>
      <Table
        people={people}
        meId={meId}
        said={said}
        center={data ? <Wheel key={run} names={data.wheel} target={data.receiver.id} spin={phase === 'spin'} onDone={done} /> : undefined}
      />
      {data && phase === 'reveal' && (
        <div ref={card} className="mx-auto flex max-w-md flex-col items-center text-center" aria-live="polite">
          {/* an invitation card: ivory stock, gold hairline frame, the name set large */}
          <div className="unfold relative w-full rounded-lg bg-cream p-2.5 text-ink shadow-[0_40px_80px_-30px_#000]">
            <div className="rounded border-[3px] border-double border-cloth px-6 pb-8 pt-7">
              <p className="label !text-cloth">Тайный Санта · Сигаретка</p>
              <p className="mt-2 font-hand text-[30px] text-cloth">ты даришь подарок</p>
              <Avatar
                id={data.receiver.id}
                name={data.receiver.name}
                avatar={data.receiver.avatar}
                className="mx-auto mt-4 size-28 border-4 border-cream text-4xl shadow-[0_0_0_3px_#b8322a]"
              />
              <h2 className="mt-4 font-display text-[clamp(2.6rem,11vw,3.6rem)] leading-[1.05] text-cloth">
                <TextScramble key={run}>{data.receiver.name}</TextScramble>
              </h2>
              <p className="mt-4 font-hand text-[24px] leading-tight text-pine">Тсс… это секрет. Не проболтайся в Сигаретке!</p>
            </div>
          </div>
          <Button tone="ghost" className="mt-6" onClick={() => (setPhase('spin'), setRun((r) => r + 1))}>
            Покрутить ещё раз
          </Button>
        </div>
      )}
    </>
  );
}
