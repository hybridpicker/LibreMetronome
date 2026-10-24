import React, { useEffect, useRef } from 'react';

const MAX_ANGLE_RAD = (45 * Math.PI) / 180;
const MAX_DPR = 3;

const readToken = (name, fallback) =>
  (typeof window !== 'undefined' &&
    window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()) ||
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
      ink: readToken('--ink-2', '#6b7072'),
      weightIdle: readToken('--ink-3', '#9aa0a2'),
      weightLive: readToken('--accent', '#00a0a0')
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
        Math.min((w / 2 - weightR - 8) / Math.sin(MAX_ANGLE_RAD), h - 2 * weightR - hubR - 16)
      );
      const contentH = armLength + weightR + hubR;
      const pivotY = (h - contentH) / 2 + weightR + armLength;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(w / 2, pivotY);
      ctx.lineCap = 'round';
      ctx.rotate(angleRad);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -armLength);
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.ink;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -armLength * 0.78, weightR, 0, Math.PI * 2);
      ctx.fillStyle = isPaused ? colors.weightIdle : colors.weightLive;
      ctx.fill();

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
