import { useEffect, useRef, type ReactNode } from 'react';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Canvas snowfall in three depths. Pauses in background tabs; a still frame under reduced motion. */
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
      return { x: Math.random() * w, y, r: 0.8 + depth * 2.6, v: 0.25 + depth * 0.9, phase: Math.random() * Math.PI * 2, depth };
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      flakes = Array.from({ length: Math.min(170, Math.round((w * h) / 9000)) }, () => make());
    };
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        ctx.globalAlpha = 0.35 + f.depth * 0.6;
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

const BULBS = ['#e2383f', '#f7c94b', '#2fbf71', '#4aa8ff', '#ff8a1f', '#c86bff'];

/** A garland strung across the top edge; bulbs light up in turns. */
export function Garland() {
  const n = 22;
  const points = Array.from({ length: n }, (_, i) => {
    const x = (i + 0.5) * (1000 / n);
    const sag = 18 * Math.sin(((i % (n / 2)) / (n / 2)) * Math.PI);
    return { x, y: 10 + sag };
  });
  const wire = `M0 8 ${points.map((p) => `L${p.x} ${p.y - 6}`).join(' ')} L1000 8`;
  return (
    <svg viewBox="0 0 1000 52" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 w-full sm:h-12" aria-hidden>
      <path d={wire} stroke="#0f4f33" strokeWidth="2.5" fill="none" />
      {points.map((p, i) => (
        <g key={i} className="bulb" style={{ ['--i' as string]: i, color: BULBS[i % BULBS.length] }}>
          <rect x={p.x - 2.5} y={p.y - 7} width="5" height="5" rx="1" fill="#2a3a2f" />
          <ellipse cx={p.x} cy={p.y + 4} rx="5" ry="8" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

/** Night sky, aurora, garland and snow behind a page. */
export function Scene({ children }: { children: ReactNode }) {
  return (
    <div className="sky relative min-h-dvh overflow-x-clip">
      <div className="aurora pointer-events-none" aria-hidden />
      <Snow />
      <Garland />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Confetti in the party colours; loaded on demand, skipped under reduced motion. */
export async function burst() {
  if (reducedMotion()) return;
  const { default: confetti } = await import('canvas-confetti');
  const colors = ['#e2383f', '#f7c94b', '#2fbf71', '#fbf7ef', '#ff8a1f'];
  confetti({ particleCount: 140, spread: 80, startVelocity: 48, origin: { y: 0.55 }, colors, disableForReducedMotion: true });
  setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors }), 250);
  setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors }), 400);
}
