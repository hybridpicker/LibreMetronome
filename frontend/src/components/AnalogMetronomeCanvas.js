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

    // Increase the swing range: now +/- 45 degrees
    const maxAngleDeg = 45;
    const maxAngleRad = (maxAngleDeg * Math.PI) / 180;

    const animate = (time) => {
      const deltaMs = time - lastTimestamp;
      lastTimestamp = time;

      // Clear the entire canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const interval = currentSubInterval();
      if (isPaused || !interval) {
        // When paused or if interval is not available, draw the pendulum arm centered
        drawPendulumArm(ctx, canvas.width, canvas.height, 0);
      } else {
        // Calculate the current fraction within the interval
        const now = audioCtxCurrentTime();
        const startT = currentSubStartTime();
        let fraction = (now - startT) / interval;
        fraction = Math.min(Math.max(fraction, 0), 1);

        // Determine the angle based on the current subdivision index
        let angle = 0;
        if (currentSubIndex % 2 === 0) {
          // Left-to-right motion
          angle = -maxAngleRad + fraction * (2 * maxAngleRad);
        } else {
          // Right-to-left motion
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
   * Draws the pendulum arm.
   *
   * @param {CanvasRenderingContext2D} ctx - The canvas 2D rendering context.
   * @param {number} w - The canvas width.
   * @param {number} h - The canvas height.
   * @param {number} angleRad - The angle (in radians) to rotate the needle.
   */
  const drawPendulumArm = (ctx, w, h, angleRad) => {
    ctx.save();
    // Translate to the pivot point: center horizontally and further down vertically.
    // The pivot is shifted 25% of the canvas height downward relative to the center,
    // then moved 5 pixels upward.
    const pivotOffsetY = h * 0.25 - 10; // 25% of the canvas height minus 5 pixels
    ctx.translate(w / 2, h / 2 + pivotOffsetY);

    // Calculate the pendulum arm length
    const armLength = (Math.min(w, h) / 2) * 1.4;

    // Rotate the canvas to the current angle
    ctx.rotate(angleRad);

    // Draw the needle as a thin line
    ctx.beginPath();
    ctx.lineWidth = 0.8;             // Needle width
    ctx.strokeStyle = '#0ba3b2';       // Needle color
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
