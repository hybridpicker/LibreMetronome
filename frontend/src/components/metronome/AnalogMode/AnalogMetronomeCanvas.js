import React, { useEffect, useRef } from 'react';

export default function AnalogMetronomeCanvas({
  width,
  height,
  audioCtxCurrentTime,
  tempo,
  isPaused,
  currentSubIndex,
  beatMultiplier = 1,
  modern = false
}) {
  console.log("AnalogMetronomeCanvas rendered with tempo:", tempo); // Debug log
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
      // Position the pivot point much lower in the canvas (closer to the bottom)
      // Positioning is handled directly in the translate below
      // Translate to the pivot point - centered horizontally, much lower vertically
      ctx.translate(w / 2, h * 0.85); // Position at 85% of the height (very close to bottom)
      
      // Arm length based on smaller dimension - make it longer
      const armLength = (Math.min(w, h) / 2) * 1.3; // Adjusted for better proportions with new position
      
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00A0A0'; // Changed back to cyan
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
      ctx.fillStyle = '#f8d38d'; // Changed to yellow
      ctx.fill();
      
      ctx.restore();
    };

    // Phone look: scale arc with ticks, thick rod, counterweight, big bob and a
    // visible pivot hub, laid out to fill the whole card (w x h are CSS px).
    const drawModern = (w, h, angleRad) => {
      const bobR = Math.max(12, Math.min(w, h) * 0.045);
      const hubR = Math.max(8, bobR * 0.6);
      const sin = Math.sin(maxAngleRad);
      // Longest rod that keeps the bob inside the card at full swing.
      const armLength = Math.max(
        60,
        Math.min((w / 2 - bobR - 8) / sin, h - 2 * bobR - hubR - 16)
      );
      const contentH = armLength + bobR + hubR;
      const pivotY = (h - contentH) / 2 + bobR + armLength;
      const cx = w / 2;

      ctx.save();
      ctx.translate(cx, pivotY);
      ctx.lineCap = 'round';

      // Scale arc and ticks (every 15 degrees; the centre tick is stronger).
      ctx.beginPath();
      ctx.arc(0, 0, armLength, -Math.PI / 2 - maxAngleRad, -Math.PI / 2 + maxAngleRad);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#E3EEEE';
      ctx.stroke();
      for (let deg = -45; deg <= 45; deg += 15) {
        const a = (deg * Math.PI) / 180;
        const len = deg === 0 ? 18 : 12;
        ctx.beginPath();
        ctx.moveTo(Math.sin(a) * (armLength - len), -Math.cos(a) * (armLength - len));
        ctx.lineTo(Math.sin(a) * (armLength + len), -Math.cos(a) * (armLength + len));
        ctx.lineWidth = deg === 0 ? 3 : 2;
        ctx.strokeStyle = deg === 0 ? '#B3E0E0' : '#CFE0E0';
        ctx.stroke();
      }

      ctx.rotate(angleRad);

      // Rod.
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -armLength);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#00A0A0';
      ctx.stroke();

      // Counterweight on the rod.
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(-8, -armLength * 0.42 - 10, 16, 20, 5)
        : ctx.rect(-8, -armLength * 0.42 - 10, 16, 20);
      ctx.fillStyle = '#008585';
      ctx.fill();

      // Bob.
      ctx.beginPath();
      ctx.arc(0, -armLength, bobR, 0, Math.PI * 2);
      ctx.fillStyle = '#F8D38D';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#00A0A0';
      ctx.stroke();
      ctx.restore();

      // Pivot hub drawn last, so it sits above the rod.
      ctx.save();
      ctx.translate(cx, pivotY);
      ctx.beginPath();
      ctx.arc(0, 0, hubR, 0, Math.PI * 2);
      ctx.fillStyle = '#00A0A0';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, hubR * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.restore();
    };

    const dpr = modern ? Math.min(3, window.devicePixelRatio || 1) : 1;
    if (modern) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = (angle) => {
      if (modern) drawModern(canvas.width / dpr, canvas.height / dpr, angle);
      else drawPendulumArm(ctx, canvas.width, canvas.height, angle);
    };

    const animate = () => {
      // Clear the canvas with transparency instead of a solid background
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      if (!isPaused && startTimeRef.current === null) {
        startTimeRef.current = performance.now();
      }
      
      if (isPaused) {
        startTimeRef.current = null;
        draw(0);
        prevAngle = 0;
      } else {
        const now = performance.now();
        const elapsed = now - (startTimeRef.current || now);
        
        const beatInterval = (60 / (tempo * beatMultiplier)) * 1000;
        const period = 2 * beatInterval;
        const phase = (elapsed % period) / period; 
        
        const targetAngle = -maxAngleRad * Math.cos(2 * Math.PI * phase);
        
        const smoothingFactor = 0.3; 
        let angle = prevAngle + (targetAngle - prevAngle) * smoothingFactor;
        
        prevAngle = angle;
        
        draw(angle);
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, tempo, beatMultiplier, modern, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={modern ? Math.round(width * Math.min(3, window.devicePixelRatio || 1)) : width}
      height={modern ? Math.round(height * Math.min(3, window.devicePixelRatio || 1)) : height}
      style={{ position: 'absolute', top: 0, left: 0, width, height }}
    />
  );
}
