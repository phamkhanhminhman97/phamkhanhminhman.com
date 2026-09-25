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
/** Số sóng xung kích tối đa cùng lúc: click liên tục không làm hàng đợi phình ra. */
const MAX_SHOCKWAVES = 5;

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  strength: number;
}

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
  /** Bật làn sóng kích nổ khi click/chạm vào header. */
  enableShockwave?: boolean;
  /**
   * Trọng lực theo độ nghiêng máy (gyroscope). Tắt mặc định: trên điện thoại
   * canvas đang ẩn (`hidden md:block`), còn iOS/iPadOS chỉ gửi sự kiện sau khi
   * gọi DeviceOrientationEvent.requestPermission() từ một thao tác người dùng,
   * nên thực tế chỉ tablet Android và laptop 2-trong-1 nhận được.
   */
  enableGyro?: boolean;
  className?: string;
}

export function AntigravityCanvas({
  paused = false,
  particleCount = 30,
  speedFactor = 0.7,
  colors = SITE_PALETTE,
  gravity = -0.04,
  opacity = 0.5,
  enableShockwave = true,
  enableGyro = false,
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
    // Không dùng `desynchronized`: đó là gợi ý độ trễ thấp cho ứng dụng vẽ bút,
    // lớp nền trang trí không được lợi gì, còn canvas trong suốt ở chế độ đó có
    // thể bị rách hình trên một số máy.
    const context = el?.getContext("2d");
    if (!el || !context) return;
    const canvas: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = context;

    const palette = colorKey.split("|");
    const sprites = new Map<string, HTMLCanvasElement>();
    let particles: Particle[] = [];
    const shockwaves: Shockwave[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTime = 0;
    let onScreen = false;
    let pointerX = -9999;
    let pointerY = -9999;
    let tiltX = 0;
    let tiltY = 0;

    /**
     * Mở rộng lên 6 hình khối Material Design phong cách tối giản:
     * 0: Tròn (Circle)
     * 1: Vuông bo góc (Rounded Square)
     * 2: Tam giác (Triangle)
     * 3: Viên con nhộng (Pill / Capsule)
     * 4: Vành khuyên (Donut / Ring)
     * 5: Dấu cộng (Cross / Plus)
     */
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

        switch (shape) {
          case 0: {
            // Tròn
            g.arc(0, 0, r, 0, Math.PI * 2);
            g.fill();
            break;
          }
          case 1: {
            // Vuông bo góc
            const rad = 6;
            if (typeof g.roundRect === "function") {
              g.roundRect(-r, -r, SHAPE_SIZE, SHAPE_SIZE, rad);
            } else {
              g.rect(-r, -r, SHAPE_SIZE, SHAPE_SIZE);
            }
            g.fill();
            break;
          }
          case 2: {
            // Tam giác
            g.moveTo(0, -r);
            g.lineTo(r, r);
            g.lineTo(-r, r);
            g.closePath();
            g.fill();
            break;
          }
          case 3: {
            // Viên con nhộng (Pill)
            const pw = SHAPE_SIZE * 1.15;
            const ph = SHAPE_SIZE * 0.58;
            const pr = ph / 2;
            if (typeof g.roundRect === "function") {
              g.roundRect(-pw / 2, -ph / 2, pw, ph, pr);
            } else {
              g.rect(-pw / 2, -ph / 2, pw, ph);
            }
            g.fill();
            break;
          }
          case 4: {
            // Vành khuyên (Donut)
            g.arc(0, 0, r, 0, Math.PI * 2, false);
            g.arc(0, 0, r * 0.45, 0, Math.PI * 2, true);
            g.fill("evenodd");
            break;
          }
          case 5: {
            // Dấu cộng (Plus / Cross)
            const bw = SHAPE_SIZE * 0.28;
            g.rect(-r, -bw / 2, SHAPE_SIZE, bw);
            g.rect(-bw / 2, -r, bw, SHAPE_SIZE);
            g.fill();
            break;
          }
          default: {
            g.arc(0, 0, r, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
      sprites.set(key, off);
      return off;
    };

    /**
     * "anywhere": rải khắp khung (lúc đầu). "top"/"bottom": sinh ngay ngoài mép
     * đó, vận tốc dọc hướng VÀO khung để hạt mới đi vào tầm nhìn chứ không lập
     * tức văng ra lại mép vừa sinh.
     */
    const spawn = (at: "anywhere" | "top" | "bottom"): Particle => {
      const vy = (Math.random() - 0.5) * 1.4 * speedFactor;
      return {
        x: Math.random() * width,
        y: at === "anywhere" ? Math.random() * height : at === "top" ? -30 : height + 30,
        vx: (Math.random() - 0.5) * 1.4 * speedFactor,
        vy: at === "anywhere" ? vy : at === "top" ? Math.abs(vy) : -Math.abs(vy),
        size: 6 + Math.random() * 11,
        depth: 0.6 + Math.random() * 0.7,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.035,
        phase: Math.random() * Math.PI * 2,
        sprite: sprite(
          palette[Math.floor(Math.random() * palette.length)],
          Math.floor(Math.random() * 6), // 6 hình khối đa dạng
        ),
      };
    };

    const triggerShockwave = (clientX: number, clientY: number) => {
      // Vòng lặp đang dừng (bấm Pause, hoặc header ngoài khung nhìn) thì bỏ qua:
      // nếu vẫn xếp hàng, lúc chạy lại mọi sóng dồn lại sẽ bung ra cùng lúc.
      if (!enableShockwave || !frame) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Cho phép bấm trong và lân cận khu vực header
      if (x >= -80 && x <= width + 80 && y >= -60 && y <= height + 80) {
        const clampedX = Math.max(0, Math.min(width, x));
        const clampedY = Math.max(0, Math.min(height, y));

        // 1. Cú nổ lực tức thì: hất văng ngay lập tức các hạt trong vùng gần tâm chạm
        for (const p of particles) {
          const dx = p.x - clampedX;
          const dy = p.y - clampedY;
          const dist = Math.hypot(dx, dy);
          if (dist > 0 && dist < 220) {
            const factor = Math.pow(1 - dist / 220, 1.4);
            const blast = factor * 16;
            p.vx += (dx / dist) * blast;
            p.vy += (dy / dist) * blast;
            p.spin += (Math.random() - 0.5) * 0.18;
          }
        }

        // 2. Tạo làn sóng xung kích lan toả ra ngoài
        if (shockwaves.length >= MAX_SHOCKWAVES) shockwaves.shift();
        shockwaves.push({
          x: clampedX,
          y: clampedY,
          radius: 4,
          maxRadius: Math.max(width, height) * 0.55,
          strength: 26.0,
        });
      }
    };

    const step = (p: Particle, dt: number, time: number) => {
      // Hệ số 0.2: với ma sát 0.96/khung, hạt trôi đều khoảng 4-20 px/giây
      // (tuỳ độ sâu), tức mất chừng 10-40 giây để đi hết chiều cao header.
      // Cộng thêm độ nghiêng cảm ứng (tilt) trên điện thoại nếu có.
      p.vx += tiltX * p.depth * dt;
      p.vy += (gravity * 0.2 + tiltY) * p.depth * dt;

      // Lực đẩy dạt ra khi di chuột / chạm tay
      const dx = p.x - pointerX;
      const dy = p.y - pointerY;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < POINTER_RADIUS) {
        const push = ((POINTER_RADIUS - dist) / POINTER_RADIUS) * 3.5 * dt;
        p.vx += (dx / dist) * push;
        p.vy += (dy / dist) * push;
      }

      // Lực đẩy từ các sóng kích nổ đang lan toả (Shockwave)
      for (let i = 0; i < shockwaves.length; i++) {
        const sw = shockwaves[i];
        const swDx = p.x - sw.x;
        const swDy = p.y - sw.y;
        const swDist = Math.hypot(swDx, swDy);
        const thickness = 55;
        const delta = Math.abs(swDist - sw.radius);

        if (delta < thickness && swDist > 0) {
          const progress = sw.radius / sw.maxRadius;
          const force =
            (1 - delta / thickness) *
            (1 - progress) *
            sw.strength *
            dt;
          p.vx += (swDx / swDist) * force;
          p.vy += (swDy / swDist) * force;
          p.rotation += (Math.random() - 0.5) * 0.08 * dt;
        }
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
      // Chiều dọc cũng quay vòng ở CẢ HAI mép.
      if (p.y < -40) Object.assign(p, spawn("bottom"));
      else if (p.y > height + 40) Object.assign(p, spawn("top"));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Vẽ các vòng sóng kích nổ lan toả trực quan
      for (let i = 0; i < shockwaves.length; i++) {
        const sw = shockwaves[i];
        const progress = sw.radius / sw.maxRadius;
        const alpha = Math.max(0, (1 - progress) * 0.45);
        if (alpha <= 0.01) continue;

        ctx.save();
        // Vòng sóng chính màu đỏ red-700 chuẩn sắc nhấn website
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(185, 28, 28, ${alpha})`;
        ctx.lineWidth = Math.max(1, 3.5 * (1 - progress));
        ctx.stroke();

        // Vòng sóng phụ mờ hơn tạo hiệu ứng sóng kép
        if (sw.radius > 16) {
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius - 14, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(113, 113, 122, ${alpha * 0.5})`;
          ctx.lineWidth = Math.max(1, 2 * (1 - progress));
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Vẽ các hạt hình học
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

      // Cập nhật sóng kích nổ: tốc độ mở rộng theo thời gian thật
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        shockwaves[i].radius += 7.5 * dt;
        if (shockwaves[i].radius >= shockwaves[i].maxRadius) {
          shockwaves.splice(i, 1);
        }
      }

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
        // Sóng đang lan dở thì huỷ luôn, kể cả sóng sinh ra từ chính cú bấm Pause.
        shockwaves.length = 0;
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
        particles = Array.from({ length: particleCount }, () => spawn("anywhere"));
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

    let lastShockwaveTime = 0;
    const handleTrigger = (clientX: number, clientY: number) => {
      const now = performance.now();
      if (now - lastShockwaveTime < 80) return;
      lastShockwaveTime = now;
      triggerShockwave(clientX, clientY);
    };

    const onPointerDown = (e: PointerEvent) => {
      handleTrigger(e.clientX, e.clientY);
    };

    const onClick = (e: MouseEvent) => {
      handleTrigger(e.clientX, e.clientY);
    };

    const onDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        // gamma nghiêng trái/phải [-90, 90]
        // beta nghiêng trước/sau [-180, 180]
        tiltX = Math.max(-1, Math.min(1, e.gamma / 35)) * 0.03;
        tiltY = Math.max(-1, Math.min(1, (e.beta - 45) / 45)) * 0.02;
      }
    };

    if (!reducedMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerdown", onPointerDown, { passive: true });
      window.addEventListener("click", onClick, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
      document.documentElement.addEventListener("pointercancel", onPointerLeave);

      if (enableGyro && "DeviceOrientationEvent" in window) {
        window.addEventListener("deviceorientation", onDeviceOrientation, { passive: true });
      }
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
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("click", onClick);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      document.documentElement.removeEventListener("pointercancel", onPointerLeave);
      if (enableGyro && "DeviceOrientationEvent" in window) {
        window.removeEventListener("deviceorientation", onDeviceOrientation);
      }
    };
  }, [
    colorKey,
    particleCount,
    speedFactor,
    gravity,
    reducedMotion,
    enableShockwave,
    enableGyro,
  ]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={["pointer-events-none absolute inset-0 w-full h-full", className].join(" ").trim()}
      style={{ opacity }}
    />
  );
}
