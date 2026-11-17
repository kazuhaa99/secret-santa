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

/** Granny's room: wallpaper, a vignette and tinsel along the top. */
export function Scene({ children }: { children: ReactNode }) {
  return (
    <div className="room relative min-h-dvh overflow-x-clip">
      <div className="tinsel" aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Paper confetti, like from a party cracker; loaded on demand, skipped under reduced motion. */
export async function burst(at?: { x: number; y: number }) {
  if (reducedMotion()) return;
  const { default: confetti } = await import('canvas-confetti');
  const opts = { colors: ['#e2383f', '#ffd36b', '#2f8f5b', '#fff4dc', '#3b6fb6'], gravity: 0.8, ticks: 240 };
  confetti({ ...opts, particleCount: 110, spread: 90, startVelocity: 40, origin: { x: at?.x ?? 0.5, y: at?.y ?? 0.45 } });
}
