// File: src/components/AnalogMetronomeCanvas.js

import React, { useEffect, useRef } from 'react';

export default function AnalogMetronomeCanvas({
  width,
  height,
  audioCtxCurrentTime,
  currentSubStartTime,
  currentSubInterval,
  isPaused
}) {
  // English comment:
  // Canvas reference for drawing the pendulum.
  const canvasRef = useRef(null);

  // English comment:
  // We set up requestAnimationFrame to render the pendulum.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationId;
    let lastTimestamp = 0;

    // maxAngle: for a mechanical pendulum, let's say +/- 30 degrees from center
    const maxAngleDeg = 30;
    const maxAngleRad = (maxAngleDeg * Math.PI) / 180;

    const animate = (time) => {
      const deltaMs = time - lastTimestamp;
      lastTimestamp = time;

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // If paused, we simply draw the arm at the center
      if (isPaused || !currentSubInterval()) {
        drawPendulumArm(ctx, canvas.width, canvas.height, 0);
      } else {
        // Current audio time
        const now = audioCtxCurrentTime();
        // fraction from 0 to 1 within the current sub-interval
        const fraction = (now - currentSubStartTime()) / currentSubInterval();

        // We want a single "left-right-left" cycle over 2 subdivisions.
        // We'll do a sine-based motion:
        // fraction in [0..1] => angle from -maxAngle to +maxAngle
        // cycle is fraction * pi, so fraction=0 => angle= -maxAngle, fraction=0.5 => angle=0, fraction=1 => angle=+maxAngle
        // But we want a symmetrical bounce, so let's do:
        // angle(t) = -maxAngleRad * cos(pi * fraction)
        // This yields angle = -maxAngleRad at fraction=0, +maxAngleRad at fraction=1
        // and midpoint 0 at fraction=0.5
        const angle = -maxAngleRad * Math.cos(Math.PI * fraction);

        // Draw the arm
        drawPendulumArm(ctx, canvas.width, canvas.height, angle);
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPaused, audioCtxCurrentTime, currentSubStartTime, currentSubInterval]);

  // English comment:
  // Function to draw the pendulum arm in the canvas with the given angle.
  const drawPendulumArm = (ctx, w, h, angleRad) => {
    ctx.save();
    // Move origin to center
    ctx.translate(w / 2, h / 2);

    // Arm length: about 80% of half the canvas
    const armLength = (Math.min(w, h) / 2) * 0.8;

    // rotate the canvas
    ctx.rotate(angleRad);

    // draw the arm line
    ctx.beginPath();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#0ba3b2'; // teal color
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -armLength);
    ctx.stroke();

    // small circle at pivot
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();

    // small weight at the tip
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
