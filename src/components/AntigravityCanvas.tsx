"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Hạt hình học trôi ngược lên sau header trang chủ, kiểu "phản trọng lực".
 *
 * Vòng lặp requestAnimationFrame chỉ chạy khi đủ ba điều kiện: canvas đang
 * nằm trong khung nhìn, người đọc chưa bấm dừng, và hệ điều hành không bật
 * "giảm chuyển động". Thiếu một điều kiện là vòng lặp tắt hẳn (không chạy
 * không), hạt đứng yên ở khung hình cuối.
 */

/**
 * Tông của site: mực đen, các sắc zinc, một chút đỏ red-700 làm điểm nhấn.
 *
 * Phải là hằng số NGOÀI component. Bản đầu đặt mảng màu làm giá trị mặc định
 * của prop, tức mỗi lần render là một mảng mới; mảng đó nằm trong dependency
 * của useEffect, còn HomePage render lại mỗi giây vì đồng hồ. Kết quả là cứ
 * một giây toàn bộ hạt bị xoá và rải lại. Giờ effect so theo NỘI DUNG
 * (colorKey), nên truyền mảng viết thẳng trong JSX cũng không còn gây lỗi đó.
 */
const SITE_PALETTE: readonly string[] = ["#18181b", "#3f3f46", "#71717a", "#a1a1aa", "#b91c1c"];

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Server không biết cài đặt của người đọc nên trả false; client đọc lại ngay sau hydrate. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** Hình vẽ sẵn ở độ phân giải gấp đôi để màn retina không bị mờ. */
const SPRITE_SIZE = 128;
const SHAPE_SIZE = 56;
const FRICTION = 0.96;
const POINTER_RADIUS = 130;
/** Một khung chuẩn 60 Hz: bước mô phỏng tính theo thời gian thật, để màn 120 Hz không trôi nhanh gấp đôi. */
const FRAME_MS = 1000 / 60;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  depth: number;
  rotation: number;
  spin: number;
  phase: number;
  sprite: HTMLCanvasElement;
}

export interface AntigravityCanvasProps {
  /** Dừng tại chỗ: hạt vẫn hiện, chỉ thôi chuyển động. */
  paused?: boolean;
  particleCount?: number;
  speedFactor?: number;
  colors?: readonly string[];
  /** Âm là trôi lên, dương là rơi xuống. */
  gravity?: number;
  opacity?: number;
  className?: string;
}

export function AntigravityCanvas({
  paused = false,
  particleCount = 30,
  speedFactor = 0.7,
  colors = SITE_PALETTE,
  gravity = -0.04,
  opacity = 0.5,
  className = "",
}: AntigravityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  const syncRef = useRef<() => void>(() => {});
  const reducedMotion = usePrefersReducedMotion();
  const colorKey = colors.join("|");

  // Dừng hay chạy tiếp KHÔNG dựng lại hạt: chỉ bật/tắt vòng lặp của effect dưới.
  useEffect(() => {
    pausedRef.current = paused;
    syncRef.current();
  }, [paused]);

  useEffect(() => {
    const el = canvasRef.current;
    const context = el?.getContext("2d");
    if (!el || !context) return;
    const canvas: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = context;

    const palette = colorKey.split("|");
    const sprites = new Map<string, HTMLCanvasElement>();
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTime = 0;
    let onScreen = false;
    let pointerX = -9999;
    let pointerY = -9999;

    const sprite = (color: string, shape: number): HTMLCanvasElement => {
      const key = color + ":" + shape;
      const cached = sprites.get(key);
      if (cached) return cached;
      const off = document.createElement("canvas");
      off.width = SPRITE_SIZE;
      off.height = SPRITE_SIZE;
      const g = off.getContext("2d");
      if (g) {
        const r = SHAPE_SIZE / 2;
        g.shadowColor = "rgba(0, 0, 0, 0.12)";
        g.shadowBlur = 18;
        g.shadowOffsetX = 5;
        g.shadowOffsetY = 5;
        g.fillStyle = color;
        g.translate(SPRITE_SIZE / 2, SPRITE_SIZE / 2);
        g.beginPath();
        if (shape === 0) {
          g.arc(0, 0, r, 0, Math.PI * 2);
        } else if (shape === 1) {
          g.rect(-r, -r, SHAPE_SIZE, SHAPE_SIZE);
        } else {
          g.moveTo(0, -r);
          g.lineTo(r, r);
          g.lineTo(-r, r);
          g.closePath();
        }
        g.fill();
      }
      sprites.set(key, off);
      return off;
    };

    /** anywhere: rải khắp khung (lúc đầu); ngược lại sinh ở mép, ngoài tầm nhìn. */
    const spawn = (anywhere: boolean): Particle => ({
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : gravity < 0 ? height + 30 : -30,
      vx: (Math.random() - 0.5) * 1.4 * speedFactor,
      vy: (Math.random() - 0.5) * 1.4 * speedFactor,
      size: 6 + Math.random() * 11,
      depth: 0.6 + Math.random() * 0.7,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.035,
      phase: Math.random() * Math.PI * 2,
      sprite: sprite(
        palette[Math.floor(Math.random() * palette.length)],
        Math.floor(Math.random() * 3),
      ),
    });

    const step = (p: Particle, dt: number, time: number) => {
      // Hệ số 0.2: với ma sát 0.96/khung, hạt trôi đều khoảng 4-20 px/giây
      // (tuỳ độ sâu), tức mất chừng 10-40 giây để đi hết chiều cao header.
      p.vy += gravity * 0.2 * p.depth * dt;

      const dx = p.x - pointerX;
      const dy = p.y - pointerY;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < POINTER_RADIUS) {
        const push = ((POINTER_RADIUS - dist) / POINTER_RADIUS) * 3.5 * dt;
        p.vx += (dx / dist) * push;
        p.vy += (dy / dist) * push;
      }

      const drag = Math.pow(FRICTION, dt);
      p.vx *= drag;
      p.vy *= drag;
      const sway = Math.sin(time * 0.0006 + p.phase) * 0.15;
      p.x += (p.vx + sway) * p.depth * dt;
      p.y += p.vy * p.depth * dt;
      p.rotation += p.spin * dt;

      if (p.x < -30) p.x = width + 30;
      else if (p.x > width + 30) p.x = -30;
      if (gravity < 0 ? p.y < -40 : p.y > height + 40) Object.assign(p, spawn(false));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        const s = (SPRITE_SIZE * p.size * p.depth) / SHAPE_SIZE;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.drawImage(p.sprite, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
    };

    const tick = (time: number) => {
      // Tab bị ẩn lâu rồi quay lại: chặn bước nhảy tối đa 3 khung.
      const dt = lastTime ? Math.min((time - lastTime) / FRAME_MS, 3) : 1;
      lastTime = time;
      for (const p of particles) step(p, dt, time);
      draw();
      frame = requestAnimationFrame(tick);
    };

    const sync = () => {
      const run = onScreen && !pausedRef.current && !reducedMotion && particles.length > 0;
      if (run && !frame) {
        lastTime = 0;
        frame = requestAnimationFrame(tick);
      } else if (!run && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    syncRef.current = sync;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // display:none (màn nhỏ): chưa có kích thước thì chưa rải hạt.
      if (!rect.width || !rect.height) return;
      if (particles.length === 0) {
        width = rect.width;
        height = rect.height;
        particles = Array.from({ length: particleCount }, () => spawn(true));
      } else {
        for (const p of particles) {
          p.x *= rect.width / width;
          p.y *= rect.height / height;
        }
        width = rect.width;
        height = rect.height;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Gán lại width là canvas bị xoá trắng: vẽ lại ngay để lúc đang dừng không mất hình.
      draw();
      sync();
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
    };
    const onPointerLeave = () => {
      pointerX = -9999;
      pointerY = -9999;
    };
    if (!reducedMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    visibility.observe(canvas);
    resize();

    return () => {
      cancelAnimationFrame(frame);
      frame = 0;
      syncRef.current = () => {};
      resizeObserver.disconnect();
      visibility.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [colorKey, particleCount, speedFactor, gravity, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={["pointer-events-none absolute inset-0 w-full h-full", className].join(" ").trim()}
      style={{ opacity }}
    />
  );
}
