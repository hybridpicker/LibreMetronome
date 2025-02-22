// File: src/components/AnalogMetronomeCanvas.js
import React, { useEffect, useRef } from 'react';

export default function AnalogMetronomeCanvas({
  width,
  height,
  audioCtxCurrentTime,
  currentSubStartTime,
  currentSubInterval,
  isPaused,
  currentSubIndex
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let lastTimestamp = 0;
    const maxAngleDeg = 45;
    const maxAngleRad = (maxAngleDeg * Math.PI) / 180;

    const animate = (time) => {
      const deltaMs = time - lastTimestamp;
      lastTimestamp = time;
      // Clear the canvas and fill with a background for analog mode.
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const interval = currentSubInterval();
      if (isPaused || !interval) {
        drawPendulumArm(ctx, canvas.width, canvas.height, 0);
      } else {
        const now = audioCtxCurrentTime();
        const startT = currentSubStartTime();
        let fraction = (now - startT) / interval;
        fraction = Math.min(Math.max(fraction, 0), 1);
        let angle = 0;
        if (currentSubIndex % 2 === 0) {
          angle = -maxAngleRad + fraction * (2 * maxAngleRad);
        } else {
          angle = maxAngleRad - fraction * (2 * maxAngleRad);
        }
        drawPendulumArm(ctx, canvas.width, canvas.height, angle);
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPaused, audioCtxCurrentTime, currentSubStartTime, currentSubInterval, currentSubIndex]);

  const drawPendulumArm = (ctx, w, h, angleRad) => {
    ctx.save();
    const pivotOffsetY = h * 0.25 - 10;
    ctx.translate(w / 2, h / 2 + pivotOffsetY);
    const armLength = (Math.min(w, h) / 2) * 1.4;
    ctx.rotate(angleRad);
    ctx.beginPath();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = '#00A0A0';
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -armLength);
    ctx.stroke();
    ctx.restore();
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
    />
  );
}
