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

    // Swing range: +/- 30 degrees
    const maxAngleDeg = 30;
    const maxAngleRad = (maxAngleDeg * Math.PI) / 180;

    const animate = (time) => {
      const deltaMs = time - lastTimestamp;
      lastTimestamp = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const interval = currentSubInterval();
      if (isPaused || !interval) {
        // Stand still in center
        drawPendulumArm(ctx, canvas.width, canvas.height, 0);
      } else {
        const now = audioCtxCurrentTime();
        const startT = currentSubStartTime();
        const fraction = (now - startT) / interval;

        // subIndex=0 => left->right
        // subIndex=1 => right->left
        // We'll do a simple linear interpolation from -maxAngle to +maxAngle or vice versa
        let angle = 0;
        if (currentSubIndex % 2 === 0) {
          // left -> right
          angle = -maxAngleRad + fraction * (2 * maxAngleRad);
        } else {
          // right -> left
          angle = +maxAngleRad - fraction * (2 * maxAngleRad);
        }

        drawPendulumArm(ctx, canvas.width, canvas.height, angle);
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [
    isPaused,
    audioCtxCurrentTime,
    currentSubStartTime,
    currentSubInterval,
    currentSubIndex
  ]);

  // Draw the pendulum arm at the given angle
  const drawPendulumArm = (ctx, w, h, angleRad) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);

    // Make the arm 10% longer (factor 1.1) and narrower (lineWidth=2)
    const armLength = (Math.min(w, h) / 2) * 1.1;

    ctx.rotate(angleRad);

    // Nadel (thin line)
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0ba3b2';
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -armLength);
    ctx.stroke();

    // Remove the pivot circle:
    // (No longer drawing the small black pivot circle at the origin)

    // Keep the bob at the tip
    ctx.beginPath();
    ctx.arc(0, -armLength, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();

    ctx.restore();
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0
      }}
    />
  );
}
