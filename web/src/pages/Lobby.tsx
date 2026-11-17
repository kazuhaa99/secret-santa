import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, fmtWhen, plural, type Lobby as LobbyData, type Me } from '../api';
import { Countdown } from '../components/Countdown';
import { TextScramble } from '../components/text-scramble';
import { Button, cn, Notice } from '../components/ui';
import { Wheel } from '../components/Wheel';

interface Assignment {
  receiver: { id: number; name: string };
  wheel: { id: number; name: string }[];
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

  // One stream keeps the list live and tells us the moment the draw happens.
  useEffect(() => {
    api<LobbyData & { me: Me }>('/api/lobby').then(setLobby, () => {});
    const es = new EventSource('/api/lobby/stream');
    const onData = (e: MessageEvent<string>) => setLobby(JSON.parse(e.data) as LobbyData);
    es.addEventListener('presence', onData);
    es.addEventListener('draw', onData);
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    return () => es.close();
  }, []);

  if (!lobby) return <p className="px-5 py-16 text-smoke">Заходим в лобби…</p>;

  const here = lobby.participants.filter((p) => p.online).length;

  return (
    <div className="space-y-12">
      <section aria-labelledby="draw-title">
        {lobby.drawnAt ? (
          <Result drawnAt={lobby.drawnAt} />
        ) : (
          <>
            <h1 id="draw-title" className="font-display text-[clamp(2.25rem,8vw,3.5rem)] leading-[1.05]">
              {lobby.title}
            </h1>
            {lobby.drawAt ? (
              <div className="mt-8">
                <p className="mb-4 text-smoke">Колесо закрутится {fmtWhen(lobby.drawAt)}</p>
                <Countdown to={lobby.drawAt} />
              </div>
            ) : (
              <p className="mt-6 max-w-[42ch] text-lg text-smoke">Время жеребьёвки ещё не назначено. Как только организатор его выберет, здесь пойдёт обратный отсчёт.</p>
            )}
            {lobby.drawError && (
              <div className="mt-6">
                <Notice tone="error">Жеребьёвка не состоялась: {lobby.drawError}</Notice>
              </div>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="people">
        <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
          <h2 id="people" className="font-display text-2xl">
            В лобби
          </h2>
          <p className="text-sm text-smoke tnum" aria-live="polite">
            {here} из {plural(lobby.participants.length, ['участника', 'участников', 'участников'])}
            {!live && ' · переподключаемся'}
          </p>
        </div>
        <ul className="divide-y divide-line/60">
          {lobby.participants.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <span
                className={cn('size-2.5 shrink-0 rounded-full', p.online ? 'smoulder bg-ember shadow-[0_0_10px_2px_var(--color-ember-soft)]' : 'bg-line')}
                aria-hidden
              />
              <span className={cn('flex-1 text-[17px]', !p.online && 'text-smoke')}>
                {p.name}
                {p.id === me.id && <span className="text-smoke"> · это ты</span>}
              </span>
              <span className="text-sm text-smoke">{!p.activated ? 'ещё не открыл ссылку' : p.online ? 'здесь' : 'не в сети'}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Result({ drawnAt }: { drawnAt: string }) {
  const [data, setData] = useState<Assignment | null>(null);
  const [missing, setMissing] = useState(false);
  const [phase, setPhase] = useState<'spin' | 'reveal'>(() => (wasSeen(drawnAt) ? 'reveal' : 'spin'));
  const [run, setRun] = useState(0);

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
  }, [drawnAt]);

  if (missing)
    return (
      <>
        <h1 className="font-display text-4xl">Жеребьёвка прошла без тебя</h1>
        <p className="mt-4 text-smoke">Ты активировал аккаунт уже после неё. Напиши организатору: он может провести её заново.</p>
      </>
    );
  if (!data) return <p className="text-smoke">Достаём твою бумажку…</p>;

  return (
    <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Wheel key={run} names={data.wheel} target={data.receiver.id} spin={phase === 'spin'} onDone={done} />
      <div aria-live="polite">
        {phase === 'spin' ? (
          <p className="font-display text-3xl text-smoke">Крутим…</p>
        ) : (
          <>
            <p className="text-smoke">Ты даришь подарок</p>
            <h1 className="mt-2 font-display text-[clamp(2.5rem,10vw,4rem)] leading-[1.05] text-ember">
              <TextScramble key={run}>{data.receiver.name}</TextScramble>
            </h1>
            <p className="mt-5 max-w-[36ch] text-smoke">Это секрет. Не выдавай его даже в Сигаретке.</p>
            <Button tone="ghost" className="mt-8" onClick={() => (setPhase('spin'), setRun((r) => r + 1))}>
              Покрутить ещё раз
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
