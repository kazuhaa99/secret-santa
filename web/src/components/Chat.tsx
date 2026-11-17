import { MessageCircle, SendHorizontal, Trash2, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar } from './Avatar';
import { Coin } from './Coin';
import { cn } from './ui';

export interface Message {
  id: number;
  userId: number;
  name: string;
  avatar: number | null;
  text: string;
  /** 'tip': text holds the name of whoever was tipped */
  kind?: 'text' | 'tip';
  at: number;
  /** only on this device, until the server confirms */
  status?: 'sending' | 'failed';
  error?: string;
}

const time = (at: number) => new Date(at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

function Thread({
  messages,
  meId,
  canDelete,
  onSend,
  onDelete,
}: {
  messages: Message[];
  meId: number;
  canDelete: boolean;
  onSend: (text: string, retryOf?: number) => Promise<void>;
  onDelete: (id: number) => void;
}) {
  const [text, setText] = useState('');
  const list = useRef<HTMLOListElement>(null);
  const stick = useRef(true);

  // Follow new messages unless the reader scrolled up to read history.
  useLayoutEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    stick.current = true;
    void onSend(text.trim());
    setText('');
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ol
        ref={list}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
        aria-live="polite"
        aria-label="Сообщения"
      >
        {messages.length === 0 && <li className="py-8 text-center font-hand text-2xl text-[#a08560]">Пока тихо. Скажи тост первым.</li>}
        {messages.map((m) => {
          const mine = m.userId === meId;
          if (m.kind === 'tip')
            return (
              <li key={m.id} className="flex items-center justify-center gap-2 py-1 text-[14px]">
                <Coin className="size-5" />
                <span>
                  <b>{m.name}</b> <span className="font-semibold uppercase tracking-wide text-[#b8860b]">tipped</span> <b>{m.text}</b>
                </span>
                <time className="text-[11px] opacity-60 tnum">{time(m.at)}</time>
              </li>
            );
          return (
            <li key={m.id} className={cn('group flex items-end gap-2', mine && 'flex-row-reverse')}>
              <Avatar id={m.userId} name={m.name} avatar={m.avatar} className="size-7 shrink-0 text-[11px]" />
              <div
                className={cn(
                  'max-w-[78%] rounded-2xl px-3 py-2 transition-opacity',
                  mine ? 'rounded-br-sm bg-cloth text-cream' : 'rounded-bl-sm bg-paper text-ink',
                  m.status === 'sending' && 'opacity-60',
                  m.status === 'failed' && 'ring-1 ring-danger',
                )}
              >
                <p className={cn('mb-0.5 flex items-baseline gap-2 text-[12px]', mine ? 'text-cream/70' : 'text-[#8a6a4a]')}>
                  {!mine && <span className="font-serif text-[13px] italic text-cloth">{m.name}</span>}
                  {m.status === 'sending' ? <span>отправляется…</span> : m.status === 'failed' ? null : <time className="tnum">{time(m.at)}</time>}
                  {canDelete && m.id > 0 && (
                    <button type="button" onClick={() => onDelete(m.id)} className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" aria-label="Удалить сообщение">
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  )}
                </p>
                <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{m.text}</p>
                {m.status === 'failed' && (
                  <p className="mt-1 text-[12px] text-[#a3321f]">
                    Не отправлено{m.error ? `: ${m.error}` : ''}.{' '}
                    <button type="button" className="font-semibold underline underline-offset-2" onClick={() => void onSend(m.text, m.id)}>
                      Повторить
                    </button>
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-dashed border-[#d9b98a] px-3 py-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Сказать что-нибудь за столом…"
          aria-label="Сообщение"
          className="min-h-11 min-w-0 flex-1 rounded-full border border-[#d9b98a] bg-white/70 px-4 text-[15px] text-ink outline-none transition-colors focus:border-cloth"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-cloth text-cream transition-[transform,filter] active:scale-95 disabled:opacity-40"
          aria-label="Отправить"
        >
          <SendHorizontal className="size-[18px]" aria-hidden />
        </button>
      </form>
    </div>
  );
}

/**
 * Table talk. On wide screens a panel beside the table; on phones a button with the unread
 * count that opens a sheet from the bottom.
 */
export function Chat({
  ready,
  ...props
}: {
  /** history has loaded: everything in it counts as already read */
  ready: boolean;
  messages: Message[];
  meId: number;
  canDelete: boolean;
  onSend: (text: string, retryOf?: number) => Promise<void>;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [seenId, setSeenId] = useState<number | null>(null);
  const lastId = Math.max(0, ...props.messages.map((m) => m.id));
  useEffect(() => {
    if (ready && seenId === null) setSeenId(lastId);
  }, [ready, seenId, lastId]);
  useEffect(() => {
    if (open) setSeenId(lastId);
  }, [open, lastId]);
  const unread = open || seenId === null ? 0 : props.messages.filter((m) => m.id > seenId && m.userId !== props.meId).length;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  const panel = 'overflow-hidden rounded-[20px] border-[6px] border-[#e9d4a8] bg-cream text-ink shadow-[0_30px_60px_-20px_#000]';
  const head = (
    <div className="flex items-center justify-between border-b border-dashed border-[#d9b98a] px-4 py-2.5">
      <h2 className="font-hand text-[28px] text-cloth">Болтаем за столом</h2>
      <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full text-cloth/70 hover:text-cloth lg:hidden" aria-label="Закрыть чат">
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );

  return (
    <>
      {/* wide screens: always beside the table */}
      <aside className={cn(panel, 'sticky top-6 hidden h-[min(640px,calc(100dvh-3rem))] flex-col lg:flex')} aria-label="Чат">
        {head}
        <Thread {...props} />
      </aside>

      {/* phones: a button and a bottom sheet */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gold py-3 pl-4 pr-5 font-semibold text-ink shadow-[0_12px_30px_-8px_#000] transition-transform active:scale-95 lg:hidden"
        aria-label={unread ? `Чат, новых сообщений: ${unread}` : 'Чат'}
      >
        <MessageCircle className="size-5" aria-hidden /> Чат
        {unread > 0 && <span className="grid min-w-6 place-items-center rounded-full bg-cloth px-1.5 text-xs text-snow tnum">{unread}</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Чат">
          <button type="button" className="absolute inset-0 bg-black/55" onClick={() => setOpen(false)} aria-label="Закрыть чат" />
          <div className={cn(panel, 'absolute inset-x-2 bottom-2 flex h-[78dvh] flex-col')}>
            {head}
            <Thread {...props} />
          </div>
        </div>
      )}
    </>
  );
}
