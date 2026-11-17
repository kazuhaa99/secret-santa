import { useState, type FormEvent } from 'react';
import { api, ApiError, type Me } from '../api';
import { Scene } from '../components/Festive';
import { Mark } from '../components/Mark';
import { Button, Field, Notice } from '../components/ui';

export function Login({ onLogin }: { onLogin: (me: Me) => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(await api<Me>('/api/login', { method: 'POST', body: { login, password } }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Нет связи с сервером');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Scene>
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 pb-12 pt-20">
        <Mark className="rise h-16 w-auto self-start" />
        <h1 className="rise mt-5 font-display text-[clamp(2.6rem,12vw,3.4rem)] font-bold leading-[1] tracking-[-0.02em]" style={{ ['--d' as string]: 1 }}>
          Сигаретка
        </h1>
        <p className="rise mt-3 font-hand text-[28px] leading-none text-gold" style={{ ['--d' as string]: 2 }}>
          Тайный Санта под ёлкой
        </p>

        <form onSubmit={submit} className="rise mt-10 space-y-4 rounded-3xl border border-line bg-night/70 p-5 shadow-[0_30px_60px_-30px_#000]" style={{ ['--d' as string]: 3 }}>
          <Field label="Логин" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={login} onChange={(e) => setLogin(e.target.value)} />
          <Field
            label="Пароль"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="Его прислал бот в Telegram. Забыл — отправь боту /password."
          />
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Проверяем…' : 'Сесть за стол'}
          </Button>
        </form>
      </main>
    </Scene>
  );
}
