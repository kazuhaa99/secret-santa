import { LogOut } from 'lucide-react';
import { useEffect, useState, type MouseEvent } from 'react';
import { api, type Me } from './api';
import { Scene } from './components/Festive';
import { Mark } from './components/Mark';
import { cn } from './components/ui';
import { Admin } from './pages/Admin';
import { Lobby } from './pages/Lobby';
import { Login } from './pages/Login';

function usePath() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const on = () => setPath(location.pathname);
    addEventListener('popstate', on);
    return () => removeEventListener('popstate', on);
  }, []);
  const go = (to: string) => (e?: MouseEvent) => {
    e?.preventDefault();
    history.pushState(null, '', to);
    setPath(to);
  };
  return [path, go] as const;
}

export function App() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [path, go] = usePath();

  useEffect(() => {
    api<Me>('/api/me').then(setMe, () => setMe(null));
  }, []);

  if (me === undefined) return null;
  if (!me) return <Login onLogin={setMe} />;

  const adminPage = path === '/admin' && me.isAdmin;
  const link = (to: string, label: string, active: boolean) => (
    <a href={to} onClick={go(to)} aria-current={active ? 'page' : undefined} className={cn('rounded-md px-2.5 py-1.5 text-sm', active ? 'bg-night-3 text-snow' : 'text-frost hover:text-snow')}>
      {label}
    </a>
  );

  return (
    <Scene>
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:pb-16">
      <header className="flex items-center gap-3 py-4">
        <a href="/" onClick={go('/')} className="mr-auto flex items-center gap-2.5" aria-label="Сигаретка, в лобби">
          <Mark className="h-8 w-auto" smoke={false} />
          <span className="hidden font-display text-2xl font-medium italic sm:inline">Сигаретка</span>
        </a>
        {me.isAdmin && (
          <nav className="flex">
            {link('/', 'Лобби', !adminPage)}
            {link('/admin', 'Админка', adminPage)}
          </nav>
        )}
        <button
          type="button"
          onClick={() => void api('/api/logout', { method: 'POST' }).finally(() => setMe(null))}
          className="grid size-10 place-items-center rounded-md text-frost hover:text-snow"
          aria-label="Выйти"
          title="Выйти"
        >
          <LogOut className="size-[18px]" aria-hidden />
        </button>
      </header>
      <main className="pt-4">{adminPage ? <Admin /> : <Lobby me={me} />}</main>
    </div>
    </Scene>
  );
}
