import React, { useEffect, useRef } from 'react';

const MAX_ANGLE_RAD = (45 * Math.PI) / 180;
const MAX_DPR = 3;

// Read from the canvas itself, so the dial-plate and accessibility-mode
// overrides (set on .viz-card and body) apply.
const readToken = (el, name, fallback) =>
  (typeof window !== 'undefined' && el &&
    window.getComputedStyle(el).getPropertyValue(name).trim()) ||
  fallback;

/**
 * Pendulum drawn as a measuring instrument: a rod, a pivot and a weight.
 * Colours come from the design tokens (the weight turns teal while running).
 * width / height are the CSS pixels of the visualisation area.
 */
export default function AnalogMetronomeCanvas({
  width,
  height,
  tempo,
  isPaused,
  beatMultiplier = 1
}) {
  const canvasRef = useRef(null);
  const startTimeRef = useRef(null);
  const dpr = Math.min(MAX_DPR, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const colors = {
      ink: readToken(canvas, '--ink-2', '#9bb7b7'),
      tick: readToken(canvas, '--line-strong', '#bdd0d0'),
      weightLive: readToken(canvas, '--accent', '#00a0a0'),
      plate: readToken(canvas, '--bg', '#0b2626')
    };
    let animationId;
    let prevAngle = 0;

    const draw = (angleRad) => {
      const w = width;
      const h = height;
      const weightR = Math.max(10, Math.min(w, h) * 0.035);
      const hubR = 4;
      // Longest rod that keeps the weight inside the area at full swing.
      const armLength = Math.max(
        60,
        Math.min((w / 2 - weightR - 30) / Math.sin(MAX_ANGLE_RAD), h - 2 * weightR - hubR - 52)
      );
      const scaleH = weightR + 20; // the tick scale reaches past the rod
      const contentH = armLength + scaleH + hubR;
      const pivotY = (h - contentH) / 2 + scaleH + armLength;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(w / 2, pivotY);
      ctx.lineCap = 'round';
      // Hairline scale: ticks every 7.5 degrees on an arc, the centre one in teal.
      // A baseline through the pivot, then the scale: fine ticks every 3.75
      // degrees, longer ones every 15.
      ctx.beginPath();
      ctx.moveTo(-armLength * 0.5, 0);
      ctx.lineTo(armLength * 0.5, 0);
      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.tick;
      ctx.stroke();
      for (let deg = -45; deg <= 45; deg += 3.75) {
        const a = (deg * Math.PI) / 180;
        const major = deg % 15 === 0;
        const r1 = armLength + weightR + 10;
        const r2 = r1 + (major ? 10 : 5);
        ctx.beginPath();
        ctx.moveTo(Math.sin(a) * r1, -Math.cos(a) * r1);
        ctx.lineTo(Math.sin(a) * r2, -Math.cos(a) * r2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = deg === 0 ? colors.weightLive : colors.tick;
        ctx.stroke();
      }

      ctx.rotate(angleRad);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -armLength);
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.ink;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -armLength * 0.78, weightR, 0, Math.PI * 2);
      // Idle: an open teal ring like the beat marks; running: filled.
      if (isPaused) {
        ctx.fillStyle = colors.plate;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = colors.weightLive;
        ctx.stroke();
      } else {
        ctx.fillStyle = colors.weightLive;
        ctx.fill();
      }

      ctx.rotate(-angleRad);
      ctx.beginPath();
      ctx.arc(0, 0, hubR, 0, Math.PI * 2);
      ctx.fillStyle = colors.ink;
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      if (isPaused) {
        startTimeRef.current = null;
        prevAngle = 0;
        draw(0);
      } else {
        if (startTimeRef.current === null) startTimeRef.current = performance.now();
        const elapsed = performance.now() - startTimeRef.current;
        const beatInterval = (60 / (tempo * beatMultiplier)) * 1000;
        const period = 2 * beatInterval;
        const phase = (elapsed % period) / period;
        const targetAngle = -MAX_ANGLE_RAD * Math.cos(2 * Math.PI * phase);
        prevAngle += (targetAngle - prevAngle) * 0.3;
        draw(prevAngle);
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, tempo, beatMultiplier, width, height, dpr]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      width={Math.round(width * dpr)}
      height={Math.round(height * dpr)}
      style={{ position: 'absolute', top: 0, left: 0, width, height }}
    />
  );
}
