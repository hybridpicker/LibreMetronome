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
  tempo, // Added tempo parameter for continuous animation
  opacity = 0.6, // Allow customizing the opacity for different modes
  color = "#00A0A0", // Allow customizing the pendulum color
  showBackground = false // Option to show/hide the background
}) {
  const canvasRef = useRef(null);
  // Use a ref to store a continuous start time
  const startTimeRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    const maxAngleDeg = 45;
    const maxAngleRad = (maxAngleDeg * Math.PI) / 180;
    
    // Store the previous angle to prevent snapping during pauses or tempo changes
    let prevAngle = 0;

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
      // Calculate pivot offset - move it higher up for better visibility
      const pivotOffsetY = h * 0.15; // Reduced from 0.25 to place it higher
      ctx.translate(w / 2, h / 2 + pivotOffsetY);
      
      // Arm length based on smaller dimension - make it longer
      const armLength = (Math.min(w, h) / 2) * 1.6; // Increased from 1.4 for better proportions
      
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
      
      // Draw pendulum bob (circle at end) - smaller size
      ctx.beginPath();
      ctx.arc(0, -armLength, 7, 0, Math.PI * 2); // Reduced from 10 to 7
      ctx.fillStyle = color;
      ctx.fill();
      
      ctx.restore();
    };

    const animate = () => {
      clearCanvas();

      // When not paused, if we don't yet have a start time, record one
      if (!isPaused && startTimeRef.current === null) {
        startTimeRef.current = performance.now();
      }
      
      // Reset start time when paused
      if (isPaused) {
        startTimeRef.current = null;
        // Draw pendulum at center position when paused
        drawPendulumArm(ctx, canvas.width, canvas.height, 0);
        prevAngle = 0;
      } else {
        // Use continuous time for smooth animation
        const now = performance.now();
        const elapsed = now - (startTimeRef.current || now);
        
        // Compute the beat interval (in ms) from tempo
        const beatInterval = (60 / tempo) * 1000;
        // The full oscillation period is twice the beat interval
        const period = 2 * beatInterval;
        const phase = (elapsed % period) / period; // range [0, 1)
        
        // Compute the angle using a cosine function
        // At phase 0: cos(0)=1 → angle = -maxAngleRad (left extreme)
        // At phase 0.5: cos(π)=-1 → angle = +maxAngleRad (right extreme)
        // At phase 1: cos(2π)=1 → angle = -maxAngleRad again
        const targetAngle = -maxAngleRad * Math.cos(2 * Math.PI * phase);
        
        // Apply a small amount of smoothing for transitions during tempo changes
        const smoothingFactor = 0.3; // Increased from 0.15 for smoother transitions
        let angle = prevAngle + (targetAngle - prevAngle) * smoothingFactor;
        
        // Save the current angle for the next frame
        prevAngle = angle;
        
        drawPendulumArm(ctx, canvas.width, canvas.height, angle);
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, tempo, color, showBackground]);

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