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
    const maxAngleDeg = 45;
    const maxAngleRad = (maxAngleDeg * Math.PI) / 180;

    const drawPendulumArm = (ctx, w, h, angleRad) => {
      ctx.save();
      // Calculate pivot offset (adjust as needed)
      const pivotOffsetY = h * 0.25 - 10;
      ctx.translate(w / 2, h / 2 + pivotOffsetY);
      // Arm length based on smaller dimension
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

    const animate = () => {
      // Clear the canvas with background color
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
        // Alternate swing direction based on current beat index
        const angle = currentSubIndex % 2 === 0
          ? -maxAngleRad + fraction * (2 * maxAngleRad)
          : maxAngleRad - fraction * (2 * maxAngleRad);
        drawPendulumArm(ctx, canvas.width, canvas.height, angle);
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, audioCtxCurrentTime, currentSubStartTime, currentSubInterval, currentSubIndex]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
    />
  );
}
