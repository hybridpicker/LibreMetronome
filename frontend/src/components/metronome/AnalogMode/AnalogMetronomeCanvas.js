import React, { useEffect, useRef } from 'react';
import tempoWord from '../Score/tempoWord';

const MAX_ANGLE_RAD = (45 * Math.PI) / 180;
const MAX_DPR = 3;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Read from the canvas itself, so the plate and accessibility-mode overrides
// (set on .viz-card and body) apply.
const readToken = (el, name, fallback) =>
  (typeof window !== 'undefined' && el &&
    window.getComputedStyle(el).getPropertyValue(name).trim()) ||
  fallback;

/**
 * The pendulum over the staff: the five lines of the Beat view run behind it
 * between two bar lines, a hairline arc with a tick every 7.5 degrees (the
 * middle one blue) is the scale, the weight is a disc (a hollow ring at rest,
 * blue while it swings) and the tempo mark "Allegro ♩ = 120" sits top left.
 * Colours come from the design tokens. width / height are the CSS pixels of
 * the visualisation area.
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
      ink: readToken(canvas, '--ink', '#111111'),
      ink2: readToken(canvas, '--ink-2', '#5a6672'),
      line: readToken(canvas, '--line', '#dbe0e6'),
      tick: readToken(canvas, '--line-strong', '#768593'),
      accent: readToken(canvas, '--accent', '#0072b2'),
      bg: readToken(canvas, '--bg', '#ffffff'),
      font: readToken(canvas, '--font', 'Lato, sans-serif')
    };
    let animationId;
    let prevAngle = 0;
    const word = tempoWord(tempo);

    const drawNote = (cx, cy, rx, ry, rot, filled, stroke, fill) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      if (filled) {
        ctx.fillStyle = fill;
        ctx.fill();
      } else {
        ctx.fillStyle = colors.bg;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
      ctx.restore();
    };

    const draw = (angleRad) => {
      const w = width;
      const h = height;
      const margin = Math.round(clamp(w * 0.03, 16, 28));
      const g = Math.round(clamp(12 + (w - 328) * 0.041, 12, 28)); // staff space
      const weightR = Math.max(10, Math.min(w, h) * 0.035);
      const hubR = 4;
      const tempoBand = 22;
      // Longest rod that keeps the weight inside the area at full swing.
      const armLength = Math.max(
        60,
        Math.min(
          (w / 2 - weightR - 30) / Math.sin(MAX_ANGLE_RAD),
          h - 2 * weightR - hubR - 52 - tempoBand
        )
      );
      const scaleH = weightR + 20; // the tick scale reaches past the rod
      const contentH = armLength + scaleH + hubR;
      const pivotY = tempoBand + (h - tempoBand - contentH) / 2 + scaleH + armLength;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';

      // ---- The staff: five hairlines between two bar lines, half way up the rod.
      const mid = Math.round(pivotY - armLength * 0.5);
      const top = mid - 2 * g;
      const left = margin;
      const right = w - margin;
      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.line;
      ctx.lineCap = 'butt';
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.moveTo(left, top + i * g + 0.5);
        ctx.lineTo(right, top + i * g + 0.5);
        ctx.stroke();
      }
      ctx.strokeStyle = colors.ink;
      [left + 0.5, right - 7.5].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, top + 4 * g + 1);
        ctx.stroke();
      });
      ctx.fillStyle = colors.ink;
      ctx.fillRect(right - 3, top, 3, 4 * g + 1);
      ctx.lineCap = 'round';

      // ---- Tempo mark: "Allegro ♩ = 120", top left.
      const ty = 14;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = colors.ink;
      ctx.font = `700 13px ${colors.font}`;
      ctx.fillText(word, left, ty);
      let tx = left + ctx.measureText(word).width + 8;
      drawNote(tx + 4, ty + 6, 4, 2.8, -0.38, true, colors.ink, colors.ink);
      ctx.beginPath();
      ctx.moveTo(tx + 7.6, ty + 5.5);
      ctx.lineTo(tx + 7.6, ty - 8);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = colors.ink;
      ctx.stroke();
      tx += 14;
      ctx.fillStyle = colors.ink2;
      ctx.font = `400 13px ${colors.font}`;
      ctx.fillText(`= ${tempo}`, tx, ty);

      // ---- The pendulum, drawn from its pivot.
      ctx.translate(w / 2, pivotY);
      const r1 = armLength + weightR + 10;
      // Hairline arc and a tick every 7.5 degrees, the middle one blue.
      ctx.beginPath();
      ctx.arc(0, 0, r1, -Math.PI / 2 - MAX_ANGLE_RAD * 1.125, -Math.PI / 2 + MAX_ANGLE_RAD * 1.125);
      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.line;
      ctx.stroke();
      for (let deg = -45; deg <= 45; deg += 7.5) {
        const a = (deg * Math.PI) / 180;
        const centre = deg === 0;
        const r2 = r1 + (centre ? 10 : 6);
        ctx.beginPath();
        ctx.moveTo(Math.sin(a) * r1, -Math.cos(a) * r1);
        ctx.lineTo(Math.sin(a) * r2, -Math.cos(a) * r2);
        ctx.lineWidth = centre ? 1.5 : 1;
        ctx.strokeStyle = centre ? colors.accent : colors.tick;
        ctx.stroke();
      }

      ctx.rotate(angleRad);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -armLength);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = colors.ink;
      ctx.stroke();

      // The weight: a hollow ring at rest, filled blue while it swings.
      ctx.beginPath();
      ctx.arc(0, -armLength * 0.78, weightR, 0, Math.PI * 2);
      if (isPaused) {
        ctx.fillStyle = colors.bg;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = colors.ink;
        ctx.stroke();
      } else {
        ctx.fillStyle = colors.accent;
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
