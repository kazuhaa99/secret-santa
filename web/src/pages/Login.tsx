import { useState, type FormEvent } from 'react';
import { api, ApiError, type Me } from '../api';
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
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-12">
      <Mark className="h-14 w-auto self-start" />
      <h1 className="mt-6 font-display text-5xl leading-[1.05]">Сигаретка</h1>
      <p className="mt-2 text-lg text-smoke">Тайный Санта для своих</p>

      <form onSubmit={submit} className="mt-10 space-y-4">
        <Field label="Логин" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={login} onChange={(e) => setLogin(e.target.value)} />
        <Field
          label="Пароль"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Пароль присылает бот в Telegram. Забыл — отправь ему /password."
        />
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Проверяем…' : 'Войти'}
        </Button>
      </form>
    </main>
  );
}
