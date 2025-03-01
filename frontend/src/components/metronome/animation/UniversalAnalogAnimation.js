// File: src/components/metronome/UniversalAnalogAnimation.js
import React, { useEffect, useRef } from 'react';

/**
 * Universal Analog Animation component that can be used in any metronome mode
 * 
 * This component provides the swinging pendulum animation from Analog Mode
 * that can be overlaid on any other metronome view.
 */
export default function UniversalAnalogAnimation({
  width,
  height,
  isPaused,
  audioCtxCurrentTime,
  currentSubStartTime,
  currentSubInterval,
  currentSubIndex,
  opacity = 0.6, // Allow customizing the opacity for different modes
  color = "#00A0A0", // Allow customizing the pendulum color
  showBackground = false // Option to show/hide the background
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    const maxAngleDeg = 45;
    const maxAngleRad = (maxAngleDeg * Math.PI) / 180;

    // Clear canvas with optional background
    const clearCanvas = () => {
      if (showBackground) {
        ctx.fillStyle = "rgba(245, 245, 245, 0.1)"; // Very light background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const drawPendulumArm = (ctx, w, h, angleRad) => {
      ctx.save();
      // Calculate pivot offset (adjust as needed)
      const pivotOffsetY = h * 0.25 - 10;
      ctx.translate(w / 2, h / 2 + pivotOffsetY);
      
      // Arm length based on smaller dimension
      const armLength = (Math.min(w, h) / 2) * 1.4;
      
      // Draw pivot point (small circle)
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      
      // Rotate the context to the current angle
      ctx.rotate(angleRad);
      
      // Draw pendulum arm
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -armLength);
      ctx.stroke();
      
      // Draw pendulum bob (circle at end)
      ctx.beginPath();
      ctx.arc(0, -armLength, 10, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      
      ctx.restore();
    };

    const animate = () => {
      clearCanvas();

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
  }, [isPaused, audioCtxCurrentTime, currentSubStartTime, currentSubInterval, currentSubIndex, color, showBackground]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: opacity,
        pointerEvents: 'none', // Allow clicks to pass through to elements below
        zIndex: 1
      }}
    />
  );
}