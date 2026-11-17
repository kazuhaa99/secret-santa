import { useEffect, useRef, type ReactNode } from 'react';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A whisper of snow in three depths. Pauses in background tabs; a still frame under reduced motion. */
export function Snow() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let w = 0;
    let h = 0;
    let raf = 0;
    type Flake = { x: number; y: number; r: number; v: number; phase: number; depth: number };
    let flakes: Flake[] = [];
    const make = (y = Math.random() * h): Flake => {
      const depth = Math.random();
      return { x: Math.random() * w, y, r: 0.5 + depth * 1.6, v: 0.15 + depth * 0.45, phase: Math.random() * Math.PI * 2, depth };
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      flakes = Array.from({ length: Math.min(70, Math.round((w * h) / 22000)) }, () => make());
    };
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        ctx.globalAlpha = 0.12 + f.depth * 0.35;
        ctx.beginPath();
        ctx.arc(f.x + Math.sin(t / 1600 + f.phase) * 12 * f.depth, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = '#fbf7ef';
        ctx.fill();
      }
    };
    const tick = (t: number) => {
      for (const f of flakes) {
        f.y += f.v;
        if (f.y > h + 4) Object.assign(f, make(-4));
      }
      draw(t);
      raf = requestAnimationFrame(tick);
    };
    resize();
    if (reducedMotion()) draw(0);
    else raf = requestAnimationFrame(tick);
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reducedMotion()) raf = requestAnimationFrame(tick);
    };
    addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 size-full" aria-hidden />;
}

const LIGHTS = [
  { x: '8%', y: '12%', s: 120, c: '#ffcf86' },
  { x: '86%', y: '8%', s: 160, c: '#d8b56b' },
  { x: '72%', y: '30%', s: 70, c: '#ffcf86' },
  { x: '18%', y: '46%', s: 90, c: '#d8b56b' },
  { x: '92%', y: '58%', s: 110, c: '#ffcf86' },
  { x: '4%', y: '78%', s: 140, c: '#d8b56b' },
];

/** Velvet room, film grain, the blurred lights of the restaurant and a whisper of snow. */
export function Scene({ children }: { children: ReactNode }) {
  return (
    <div className="room grain relative min-h-dvh overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {LIGHTS.map((l, i) => (
          <span key={i} className="bokeh" style={{ left: l.x, top: l.y, width: l.s, height: l.s, background: l.c, opacity: 0.07, ['--i' as string]: i }} />
        ))}
      </div>
      <Snow />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Gold confetti for the reveal; loaded on demand, skipped under reduced motion. */
export async function burst() {
  if (reducedMotion()) return;
  const { default: confetti } = await import('canvas-confetti');
  // Gold and ivory leaf only, falling slowly: a toast, not a carnival.
  const opts = { colors: ['#d8b56b', '#f4ecdc', '#a6823d'], shapes: ['circle' as const], gravity: 0.5, decay: 0.93, scalar: 0.8, ticks: 260 };
  confetti({ ...opts, particleCount: 90, spread: 100, startVelocity: 32, origin: { y: 0.45 } });
  setTimeout(() => confetti({ ...opts, particleCount: 50, spread: 140, startVelocity: 20, origin: { y: 0.4 } }), 300);
}
