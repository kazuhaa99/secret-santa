import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, fmtWhen, plural, type Lobby as LobbyData, type Me } from '../api';
import { Avatar } from '../components/Avatar';
import { Chat, type Message } from '../components/Chat';
import { Countdown } from '../components/Countdown';
import { burst } from '../components/Festive';
import { Table } from '../components/Table';
import { TextScramble } from '../components/text-scramble';
import { Button, Notice } from '../components/ui';
import { Wheel } from '../components/Wheel';

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
  const [chatError, setChatError] = useState('');

  // One stream: who is at the table, table talk, and the moment of the draw.
  useEffect(() => {
    // The first plain fetch must not overwrite a newer snapshot that already came from the stream.
    api<LobbyData>('/api/lobby').then((l) => setLobby((prev) => prev ?? l), () => {});
    api<Message[]>('/api/chat').then(
      (list) => {
        setMessages((prev) => [...list, ...prev.filter((m) => !list.some((x) => x.id === m.id))]);
        setChatReady(true);
      },
      () => setChatReady(true),
    );
    const es = new EventSource('/api/lobby/stream');
    const onLobby = (e: MessageEvent<string>) => setLobby(JSON.parse(e.data) as LobbyData);
    es.addEventListener('presence', onLobby);
    es.addEventListener('draw', onLobby);
    es.addEventListener('chat', (e: MessageEvent<string>) => {
      const m = JSON.parse(e.data) as Message;
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      setSaid((prev) => ({ ...prev, [m.userId]: { text: m.text, key: m.id } }));
    });
    es.addEventListener('chat-delete', (e: MessageEvent<string>) => {
      const { id } = JSON.parse(e.data) as { id: number };
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    return () => es.close();
  }, []);

  const send = useCallback(async (text: string) => {
    try {
      await api('/api/chat', { method: 'POST', body: { text } });
      setChatError('');
      return true;
    } catch (e) {
      setChatError(e instanceof ApiError ? e.message : 'Нет связи с сервером');
      return false;
    }
  }, []);
  const remove = useCallback((id: number) => void api(`/api/admin/chat/${id}`, { method: 'DELETE' }).catch(() => {}), []);

  if (!lobby) return <p className="px-5 py-16 text-center font-display text-2xl italic text-frost">Накрываем на стол…</p>;

  const here = lobby.participants.filter((p) => p.online).length;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="space-y-8">
        <header className="text-center">
          <p className="label rise">Новогодний ужин</p>
          <h1 className="rise mt-3 font-display text-[clamp(2.4rem,8vw,4rem)] font-medium leading-[1] tracking-[-0.01em]" style={{ ['--d' as string]: 1 }}>
            {lobby.title}
          </h1>
          <p className="rise mt-3 font-display text-xl italic text-gold" style={{ ['--d' as string]: 2 }} aria-live="polite">
            за столом {here} из {plural(lobby.participants.length, ['гостя', 'гостей', 'гостей'])}
            {!live && <span className="font-sans text-sm not-italic text-frost"> · переподключаемся</span>}
          </p>
        </header>

        {lobby.drawnAt ? (
          <Draw drawnAt={lobby.drawnAt} people={lobby.participants} meId={me.id} said={said} />
        ) : (
          <>
            <section aria-label="Обратный отсчёт" className="rise" style={{ ['--d' as string]: 3 }}>
              {lobby.drawAt ? (
                <>
                  <p className="label mb-4 text-center">Колесо закрутится {fmtWhen(lobby.drawAt)}</p>
                  <Countdown to={lobby.drawAt} />
                </>
              ) : (
                <p className="mx-auto max-w-[40ch] text-center text-frost">Время жеребьёвки ещё не назначено. Как только организатор его выберет, здесь пойдёт обратный отсчёт.</p>
              )}
              {lobby.drawError && (
                <div className="mx-auto mt-4 max-w-md">
                  <Notice tone="error">Жеребьёвка не состоялась: {lobby.drawError}</Notice>
                </div>
              )}
            </section>
            <Table people={lobby.participants} meId={me.id} said={said} />
          </>
        )}

        <p className="text-center text-sm text-frost">Чтобы сменить фото за столом, пришли новое боту в Telegram.</p>
      </div>

      <div>
        {chatError && (
          <div className="mb-3 hidden lg:block">
            <Notice tone="error">{chatError}</Notice>
          </div>
        )}
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
          <h2 className="font-display text-3xl italic">Жеребьёвка прошла без тебя</h2>
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
          <div className="unfold relative w-full bg-[#fbf6ea] p-2 text-[#2a1d10] shadow-[0_40px_80px_-30px_#000]">
            <div className="border border-gold-deep/60 px-6 pb-8 pt-7">
              <p className="label !text-[#8a6a2c]">Тайный Санта</p>
              <p className="mt-3 font-display text-xl italic text-[#5b4426]">ты даришь подарок</p>
              <Avatar
                id={data.receiver.id}
                name={data.receiver.name}
                avatar={data.receiver.avatar}
                className="mx-auto mt-5 size-28 text-4xl ring-1 ring-gold-deep ring-offset-[6px] ring-offset-[#fbf6ea]"
              />
              <h2 className="mt-5 font-display text-[clamp(2.4rem,10vw,3.4rem)] font-medium leading-[1] text-cloth-deep">
                <TextScramble key={run}>{data.receiver.name}</TextScramble>
              </h2>
              <div className="mx-auto my-5 h-px w-16 bg-gold-deep/60" aria-hidden />
              <p className="font-display text-lg italic text-[#5b4426]">Тсс… это секрет. Не выдай себя в Сигаретке.</p>
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
