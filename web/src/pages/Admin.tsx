import { Check, Copy, KeyRound, Link2, Trash2, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, fmtWhen, type AdminUser, type Lobby } from '../api';
import { Avatar } from '../components/Avatar';
import { Button, cn, Field, Notice } from '../components/ui';

type Flash = { tone: 'info' | 'error'; text: string } | null;

/** datetime-local wants "YYYY-MM-DDTHH:mm" in local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-night px-3 font-mono text-sm text-snow" aria-label={label} />
      <Button
        tone="ghost"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          });
        }}
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copied ? 'Скопировано' : 'Копировать'}
      </Button>
    </div>
  );
}

function InviteBox({ link, name }: { link: string; name: string }) {
  return (
    <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
      <p className="text-sm text-snow">
        Личная ссылка для <b>{name}</b>. Отправь её в личку: по ней бот выдаст пароль. Одноразовая, работает 7 дней.
      </p>
      <div className="mt-3">
        <CopyField value={link} label="Ссылка-приглашение" />
      </div>
    </div>
  );
}

export function Admin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [title, setTitle] = useState('');
  const [drawAt, setDrawAt] = useState('');
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [invite, setInvite] = useState<{ link: string; name: string } | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [joinLink, setJoinLink] = useState('');

  const load = useCallback(async () => {
    const [u, l] = await Promise.all([api<AdminUser[]>('/api/admin/users'), api<Lobby>('/api/lobby')]);
    setUsers(u);
    setLobby(l);
    return l;
  }, []);

  useEffect(() => {
    api<{ link: string }>('/api/admin/join').then((r) => setJoinLink(r.link), () => {});
    load().then((l) => {
      setTitle(l.title);
      setDrawAt(toLocalInput(l.drawAt));
    }, () => {});
  }, [load]);

  /** Runs an action, shows its outcome, refreshes the lists. */
  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    setFlash(null);
    try {
      await fn();
      if (ok) setFlash({ tone: 'info', text: ok });
      await load();
    } catch (e) {
      setFlash({ tone: 'error', text: e instanceof ApiError ? e.message : 'Нет связи с сервером' });
    }
  };

  const saveEvent = (e: FormEvent) => {
    e.preventDefault();
    void act(() => api('/api/admin/event', { method: 'PUT', body: { title, drawAt: drawAt ? new Date(drawAt).toISOString() : null } }), 'Сохранено');
  };

  const addUser = (e: FormEvent) => {
    e.preventDefault();
    void act(async () => {
      const r = await api<{ inviteLink: string }>('/api/admin/users', { method: 'POST', body: { name, login } });
      setInvite({ link: r.inviteLink, name });
      setName('');
      setLogin('');
    });
  };

  const drawn = Boolean(lobby?.drawnAt);
  const activated = users.filter((u) => u.activated).length;

  return (
    <div className="space-y-14">
      <h1 className="font-display text-3xl font-bold">Организатору</h1>
      {flash && <Notice tone={flash.tone}>{flash.text}</Notice>}

      <section aria-labelledby="join" className="space-y-4 rounded-3xl border border-line bg-night/70 p-5">
        <h2 id="join" className="font-display text-xl font-semibold">
          Ссылка для чата
        </h2>
        <p className="text-sm text-frost">
          Кинь её в «Сигаретку». Кто откроет, тот зарегистрируется у бота сам: имя, логин, фото. Если ссылка утекла — смени её, старая перестанет работать.
        </p>
        {joinLink && <CopyField value={joinLink} label="Ссылка для чата" />}
        <Button tone="ghost" onClick={() => confirm('Сменить ссылку? Старая перестанет работать.') && void act(async () => setJoinLink((await api<{ link: string }>('/api/admin/join', { method: 'POST' })).link), 'Ссылка обновлена')}>
          Сменить ссылку
        </Button>
      </section>

      <section aria-labelledby="event" className="space-y-5">
        <h2 id="event" className="font-display text-xl font-semibold">
          Жеребьёвка
        </h2>
        <form onSubmit={saveEvent} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
          <Field label="Название" value={title} maxLength={60} required onChange={(e) => setTitle(e.target.value)} />
          <Field label="Когда крутим колесо" type="datetime-local" value={drawAt} onChange={(e) => setDrawAt(e.target.value)} />
          <Button type="submit" tone="ghost">
            Сохранить
          </Button>
        </form>
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <p className="mr-auto text-sm text-frost">
            {drawn
              ? `Прошла ${fmtWhen(lobby!.drawnAt!)}. Пары видят только сами участники.`
              : lobby?.drawAt
                ? `Колесо закрутится само ${fmtWhen(lobby.drawAt)}. В нём будут все, кто открыл ссылку: сейчас ${activated}.`
                : `Время не назначено. Активировали аккаунт: ${activated} из ${users.length}.`}
          </p>
          {drawn ? (
            <Button
              tone="danger"
              onClick={() => confirm('Сбросить жеребьёвку? Все пары исчезнут, колесо можно будет запустить заново.') && void act(() => api('/api/admin/draw', { method: 'DELETE' }), 'Жеребьёвка сброшена')}
            >
              Сбросить
            </Button>
          ) : (
            <Button onClick={() => confirm(`Провести жеребьёвку сейчас среди ${activated} участников?`) && void act(() => api('/api/admin/draw', { method: 'POST' }), 'Готово: колесо крутится у всех в лобби')}>
              Провести сейчас
            </Button>
          )}
        </div>
      </section>

      <section aria-labelledby="people" className="space-y-5">
        <h2 id="people" className="font-display text-xl font-semibold">
          Участники
        </h2>
        <p className="text-sm text-frost">Обычно все приходят по ссылке для чата. Добавить вручную можно здесь — тогда бот выдаст личную ссылку.</p>
        <form onSubmit={addUser} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <Field label="Имя, как его видят все" value={name} maxLength={40} required onChange={(e) => setName(e.target.value)} />
          <Field label="Логин для входа" value={login} required autoCapitalize="none" spellCheck={false} pattern="[A-Za-z0-9_.\-]{3,32}" title="3–32 символа: латиница, цифры, точка, дефис, подчёркивание" onChange={(e) => setLogin(e.target.value)} />
          <Button type="submit">
            <UserPlus className="size-4" aria-hidden /> Добавить
          </Button>
        </form>
        {invite && <InviteBox link={invite.link} name={invite.name} />}

        <ul className="divide-y divide-line/60 border-y border-line">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
              <Avatar id={u.id} name={u.name} avatar={u.avatar} className={cn('size-10 shrink-0 text-xs', u.online && 'ring-2 ring-gold')} />
              <div className="min-w-0 flex-1">
                <p className="text-[17px]">
                  {u.name}
                  {u.isAdmin && <span className="text-frost"> · организатор</span>}
                </p>
                <p className="text-sm text-frost">
                  <span className="font-mono">{u.login}</span> ·{' '}
                  {u.activated ? (u.online ? 'в лобби' : 'активирован') : u.invitePending ? 'ждём, когда откроет ссылку' : 'ссылка истекла'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!u.telegram && (
                  <Button
                    tone="ghost"
                    className="min-h-10 px-3 text-sm"
                    onClick={() =>
                      void act(async () => {
                        const r = await api<{ inviteLink: string }>(`/api/admin/users/${u.id}/invite`, { method: 'POST' });
                        setInvite({ link: r.inviteLink, name: u.name });
                      })
                    }
                  >
                    <Link2 className="size-4" aria-hidden /> Новая ссылка
                  </Button>
                )}
                {u.telegram && (
                  <Button tone="ghost" className="min-h-10 px-3 text-sm" onClick={() => void act(() => api(`/api/admin/users/${u.id}/password`, { method: 'POST' }), `Новый пароль ушёл ${u.name} в Telegram`)}>
                    <KeyRound className="size-4" aria-hidden /> Новый пароль
                  </Button>
                )}
                {!u.isAdmin && (
                  <Button
                    tone="danger"
                    className="min-h-10 px-3 text-sm"
                    aria-label={`Удалить ${u.name}`}
                    onClick={() => confirm(`Удалить ${u.name}?`) && void act(() => api(`/api/admin/users/${u.id}`, { method: 'DELETE' }), `${u.name} удалён`)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
