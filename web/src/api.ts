export interface Me {
  id: number;
  name: string;
  login: string;
  isAdmin: boolean;
}

export interface Lobby {
  title: string;
  drawAt: string | null;
  drawnAt: string | null;
  drawError: string | null;
  participants: { id: number; name: string; activated: boolean; online: boolean }[];
}

export interface AdminUser extends Me {
  activated: boolean;
  telegram: boolean;
  invitePending: boolean;
  online: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? 'GET',
    headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: 'same-origin',
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Сервер не ответил');
  return data;
}

/** "25 декабря, 20:00" in the reader's time zone. */
export function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

const PR = new Intl.PluralRules('ru');
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const r = PR.select(n);
  return `${n} ${r === 'one' ? one : r === 'few' ? few : many}`;
}
