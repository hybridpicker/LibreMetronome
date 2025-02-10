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

    // Increase the swing range: now +/- 45 degrees instead of +/- 30 degrees
    const maxAngleDeg = 45;
    const maxAngleRad = (maxAngleDeg * Math.PI) / 180;

    const animate = (time) => {
      const deltaMs = time - lastTimestamp;
      lastTimestamp = time;

      // Clear the entire canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const interval = currentSubInterval();
      if (isPaused || !interval) {
        // When paused or interval not available, keep the pendulum centered
        drawPendulumArm(ctx, canvas.width, canvas.height, 0);
      } else {
        // Calculate the current fraction within the interval
        const now = audioCtxCurrentTime();
        const startT = currentSubStartTime();
        const fraction = (now - startT) / interval;

        // Determine the angle based on the current subdivision index
        let angle = 0;
        if (currentSubIndex % 2 === 0) {
          // left -> right motion
          angle = -maxAngleRad + fraction * (2 * maxAngleRad);
        } else {
          // right -> left motion
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
  }, [
    isPaused,
    audioCtxCurrentTime,
    currentSubStartTime,
    currentSubInterval,
    currentSubIndex
  ]);

  /**
   * Draws the pendulum arm
   *
   * @param {CanvasRenderingContext2D} ctx - The canvas 2D rendering context.
   * @param {number} w - Canvas width.
   * @param {number} h - Canvas height.
   * @param {number} angleRad - The angle (in radians) to rotate the needle.
   */
  const drawPendulumArm = (ctx, w, h, angleRad) => {
    ctx.save();
    // Translate to the center of the canvas
    ctx.translate(w / 2, h / 2);

    const armLength = (Math.min(w, h) / 2) * 1.4;

    // Rotate the canvas to the current angle
    ctx.rotate(angleRad);

    // Draw the needle as a thin line
    ctx.beginPath();
    ctx.lineWidth = 0.8;                  // Needle width
    ctx.strokeStyle = '#0ba3b2';         // Needle color
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
      style={{
        position: 'absolute',
        top: 0,
        left: 0
      }}
    />
  );
}
