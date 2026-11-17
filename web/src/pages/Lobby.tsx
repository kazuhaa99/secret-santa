import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, fmtWhen, plural, type Lobby as LobbyData, type Me } from '../api';
import { Avatar } from '../components/Avatar';
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

  // One stream keeps the table live and tells us the moment the draw happens.
  useEffect(() => {
    // The first plain fetch must not overwrite a newer snapshot that already came from the stream.
    api<LobbyData>('/api/lobby').then((l) => setLobby((prev) => prev ?? l), () => {});
    const es = new EventSource('/api/lobby/stream');
    const onData = (e: MessageEvent<string>) => setLobby(JSON.parse(e.data) as LobbyData);
    es.addEventListener('presence', onData);
    es.addEventListener('draw', onData);
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    return () => es.close();
  }, []);

  if (!lobby) return <p className="px-5 py-16 text-center font-hand text-3xl text-frost">Накрываем на стол…</p>;

  const here = lobby.participants.filter((p) => p.online).length;

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="rise font-display text-[clamp(1.9rem,7vw,3.2rem)] font-bold leading-[1.05] tracking-[-0.02em]">{lobby.title}</h1>
        <p className="rise mt-2 font-hand text-[26px] leading-tight text-gold" style={{ ['--d' as string]: 1 }} aria-live="polite">
          За столом {here} из {plural(lobby.participants.length, ['гостя', 'гостей', 'гостей'])}
          {!live && <span className="font-sans text-sm text-frost"> · переподключаемся</span>}
        </p>
      </header>

      {lobby.drawnAt ? (
        <Draw drawnAt={lobby.drawnAt} people={lobby.participants} meId={me.id} />
      ) : (
        <>
          <section aria-label="Обратный отсчёт" className="rise" style={{ ['--d' as string]: 2 }}>
            {lobby.drawAt ? (
              <>
                <p className="mb-3 text-center text-frost">Колесо закрутится {fmtWhen(lobby.drawAt)}</p>
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
          <Table people={lobby.participants} meId={me.id} />
        </>
      )}

      <p className="text-center text-sm text-frost">Новая аватарка — просто пришли фото боту в Telegram.</p>
    </div>
  );
}

function Draw({ drawnAt, people, meId }: { drawnAt: string; people: LobbyData['participants']; meId: number }) {
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
        <Table people={people} meId={meId} />
        <div className="mx-auto max-w-md text-center">
          <h2 className="font-display text-2xl font-semibold">Жеребьёвка прошла без тебя</h2>
          <p className="mt-3 text-frost">Ты присоединился уже после неё. Напиши организатору: он может провести её заново.</p>
        </div>
      </>
    );

  return (
    <>
      <Table
        people={people}
        meId={meId}
        center={data ? <Wheel key={run} names={data.wheel} target={data.receiver.id} spin={phase === 'spin'} onDone={done} /> : undefined}
      />
      {data && phase === 'reveal' && (
        <div ref={card} className="rise mx-auto flex max-w-md flex-col items-center text-center" aria-live="polite">
          {/* gift tag with a string */}
          <div className="relative w-full rounded-[28px] border-2 border-gold bg-snow px-6 pb-7 pt-10 text-night shadow-[0_30px_60px_-20px_#000]">
            <span className="absolute -top-3 left-1/2 size-6 -translate-x-1/2 rounded-full border-4 border-gold bg-night" aria-hidden />
            <p className="font-hand text-[26px] leading-none text-cloth">Ты даришь подарок</p>
            <Avatar id={data.receiver.id} name={data.receiver.name} avatar={data.receiver.avatar} className="mx-auto mt-5 size-28 text-3xl ring-4 ring-gold ring-offset-4 ring-offset-snow" />
            <h2 className="mt-5 font-display text-[clamp(2rem,9vw,2.75rem)] font-bold leading-[1.05] text-cloth-deep">
              <TextScramble key={run}>{data.receiver.name}</TextScramble>
            </h2>
            <p className="mt-4 font-hand text-[24px] leading-tight text-pine-deep">Тсс… это секрет. Не пали в Сигаретке.</p>
          </div>
          <Button tone="ghost" className="mt-6" onClick={() => (setPhase('spin'), setRun((r) => r + 1))}>
            Покрутить ещё раз
          </Button>
        </div>
      )}
    </>
  );
}
