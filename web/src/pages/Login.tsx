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
        <div className="rise text-center">
          <Mark className="mx-auto h-14 w-auto" />
          <p className="label mt-6">Приглашение на новогодний ужин</p>
        </div>
        <h1 className="rise mt-4 text-center font-display text-[clamp(3rem,15vw,4.25rem)] font-medium leading-[0.95] tracking-[-0.01em]" style={{ ['--d' as string]: 1 }}>
          Сигаретка
        </h1>
        <p className="rise mt-3 text-center font-display text-2xl italic text-gold" style={{ ['--d' as string]: 2 }}>
          и её Тайный Санта
        </p>
        <div className="mx-auto mt-7 h-px w-20 bg-gold/50" aria-hidden />

        <form onSubmit={submit} className="rise mt-8 space-y-4 rounded-3xl border border-gold/20 bg-night-2/80 p-5 shadow-[0_40px_80px_-40px_#000]" style={{ ['--d' as string]: 3 }}>
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
            {busy ? 'Проверяем…' : 'Пройти к столу'}
          </Button>
        </form>
      </main>
    </Scene>
  );
}
