import { MessageCircle, SendHorizontal, Trash2, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar } from './Avatar';
import { cn } from './ui';

export interface Message {
  id: number;
  userId: number;
  name: string;
  avatar: number | null;
  text: string;
  at: number;
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
  onSend: (text: string) => Promise<boolean>;
  onDelete: (id: number) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLOListElement>(null);
  const stick = useRef(true);

  // Follow new messages unless the reader scrolled up to read history.
  useLayoutEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    stick.current = true;
    if (await onSend(text.trim())) setText('');
    setBusy(false);
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
        {messages.length === 0 && <li className="py-8 text-center font-display text-lg italic text-frost">Пока тихо. Скажи тост первым.</li>}
        {messages.map((m) => {
          const mine = m.userId === meId;
          return (
            <li key={m.id} className={cn('group flex items-end gap-2', mine && 'flex-row-reverse')}>
              <Avatar id={m.userId} name={m.name} avatar={m.avatar} className="size-7 shrink-0 text-[11px]" />
              <div className={cn('max-w-[78%] rounded-2xl px-3 py-2', mine ? 'rounded-br-sm bg-[#e9dcc0] text-night' : 'rounded-bl-sm bg-night-3 text-snow')}>
                <p className={cn('mb-0.5 flex items-baseline gap-2 text-[12px]', mine ? 'text-[#6b5530]' : 'text-frost')}>
                  {!mine && <span className="font-display text-[15px] italic text-gold">{m.name}</span>}
                  <time className="tnum">{time(m.at)}</time>
                  {canDelete && (
                    <button type="button" onClick={() => onDelete(m.id)} className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" aria-label="Удалить сообщение">
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  )}
                </p>
                <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{m.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line px-3 py-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Сказать что-нибудь за столом…"
          aria-label="Сообщение"
          className="min-h-11 min-w-0 flex-1 rounded-full border border-line bg-night px-4 text-[15px] text-snow outline-none transition-colors focus:border-gold"
        />
        <button
          type="submit"
          disabled={!text.trim() || busy}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(180deg,#e6c77f,#c9a456)] text-night transition-[transform,filter] active:scale-95 disabled:opacity-40"
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
  onSend: (text: string) => Promise<boolean>;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [seenId, setSeenId] = useState<number | null>(null);
  const lastId = props.messages.at(-1)?.id ?? 0;
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

  const panel = 'overflow-hidden rounded-3xl border border-line bg-night-2/90 shadow-[0_30px_60px_-30px_#000]';
  const head = (
    <div className="flex items-center justify-between border-b border-line px-4 py-3">
      <h2 className="font-display text-xl italic">Разговоры за столом</h2>
      <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full text-frost hover:text-snow lg:hidden" aria-label="Закрыть чат">
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
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[linear-gradient(180deg,#e6c77f,#c9a456)] py-3 pl-4 pr-5 font-semibold text-night shadow-[0_12px_30px_-8px_#000] transition-transform active:scale-95 lg:hidden"
        aria-label={unread ? `Чат, новых сообщений: ${unread}` : 'Чат'}
      >
        <MessageCircle className="size-5" aria-hidden /> Чат
        {unread > 0 && <span className="grid min-w-6 place-items-center rounded-full bg-cloth px-1.5 text-xs text-snow tnum">{unread}</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Чат">
          <button type="button" className="absolute inset-0 bg-black/55" onClick={() => setOpen(false)} aria-label="Закрыть чат" />
          <div className={cn(panel, 'absolute inset-x-2 bottom-2 flex h-[78dvh] flex-col bg-night-2')}>
            {head}
            <Thread {...props} />
          </div>
        </div>
      )}
    </>
  );
}
