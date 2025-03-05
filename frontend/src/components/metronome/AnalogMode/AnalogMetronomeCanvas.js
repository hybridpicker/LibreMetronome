import React, { useEffect, useRef } from 'react';

export default function AnalogMetronomeCanvas({
  width,
  height,
  audioCtxCurrentTime,
  tempo,
  isPaused,
  currentSubIndex
}) {
  const canvasRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    const maxAngleDeg = 45;
    const maxAngleRad = (maxAngleDeg * Math.PI) / 180;
    
    let prevAngle = 0;

    const drawPendulumArm = (ctx, w, h, angleRad) => {
      ctx.save();
      const pivotOffsetY = h * 0.15; 
      ctx.translate(w / 2, h / 2 + pivotOffsetY);
      
      const armLength = (Math.min(w, h) / 2) * 1.6; 
      
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00A0A0';
      ctx.fill();
      
      ctx.rotate(angleRad);
      
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#00A0A0';
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -armLength);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(0, -armLength, 7, 0, Math.PI * 2); 
      ctx.fillStyle = '#00A0A0';
      ctx.fill();
      
      ctx.restore();
    };

    const animate = () => {
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!isPaused && startTimeRef.current === null) {
        startTimeRef.current = performance.now();
      }
      
      if (isPaused) {
        startTimeRef.current = null;
        drawPendulumArm(ctx, canvas.width, canvas.height, 0);
        prevAngle = 0;
      } else {
        const now = performance.now();
        const elapsed = now - (startTimeRef.current || now);
        
        const beatInterval = (60 / tempo) * 1000;
        const period = 2 * beatInterval;
        const phase = (elapsed % period) / period; 
        
        const targetAngle = -maxAngleRad * Math.cos(2 * Math.PI * phase);
        
        const smoothingFactor = 0.3; 
        let angle = prevAngle + (targetAngle - prevAngle) * smoothingFactor;
        
        prevAngle = angle;
        
        drawPendulumArm(ctx, canvas.width, canvas.height, angle);
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, tempo]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
    />
  );
}
