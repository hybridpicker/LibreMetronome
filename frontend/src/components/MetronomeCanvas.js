// src/components/MetronomeCanvas.js
import React, { useEffect, useRef } from 'react';

export default function MetronomeCanvas({
  currentSubdivision,
  currentSubStartRef,
  currentSubIntervalRef,
  subdivisions,
  accents,
  onToggleAccent,
  audioCtx
}) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // We'll use a fixed radius of 190 so there's enough side margin (110 px each side)
    const radius = 190;

    function drawFrame() {
      // Clear entire canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Optional shadow behind the circle
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 6;

      // Draw main circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);

      // Use CSS variable for circle color
      const circleColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary-color')
        .trim() || '#2196F3';
      ctx.strokeStyle = circleColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Disable shadow for subsequent drawings
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Draw subdivision points
      for (let i = 0; i < subdivisions; i++) {
        const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
        const px = centerX + radius * Math.cos(angle);
        const py = centerY + radius * Math.sin(angle);

        ctx.beginPath();
        if (i === 0) {
          // first beat => accent color
          const accentCol = getComputedStyle(document.documentElement)
            .getPropertyValue('--accent-color')
            .trim() || '#FF9800';
          ctx.fillStyle = accentCol;
        } else if (accents[i]) {
          // accented => primary color
          ctx.fillStyle = circleColor;
        } else {
          // normal => gray
          ctx.fillStyle = '#999999';
        }
        ctx.arc(px, py, 10, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw rotating pointer
      if (audioCtx) {
        const now = audioCtx.currentTime;
        const elapsed = now - currentSubStartRef.current;
        let fraction = elapsed / currentSubIntervalRef.current;
        if (fraction > 1.0) fraction = 1.0;

        const totalAnglePerSub = (2 * Math.PI) / Math.max(subdivisions, 1);
        // currentIndex is the subdivision that triggered last
        const currentIndex =
          (currentSubdivision - 1 + Math.max(subdivisions, 1)) %
          Math.max(subdivisions, 1);

        const baseAngle = totalAnglePerSub * currentIndex - Math.PI / 2;
        const lineAngle = baseAngle + fraction * totalAnglePerSub;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);

        const lineX = centerX + radius * Math.cos(lineAngle);
        const lineY = centerY + radius * Math.sin(lineAngle);

        const pointerColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--accent-color')
          .trim() || '#FF9800';
        ctx.strokeStyle = pointerColor;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineTo(lineX, lineY);
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(drawFrame);
    }

    // Resize the canvas to the container's display size once
    function resizeCanvas() {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }

    resizeCanvas();
    drawFrame();

    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [
    currentSubdivision,
    currentSubStartRef,
    currentSubIntervalRef,
    subdivisions,
    accents,
    audioCtx
  ]);

  // Toggle accent on click
  function handleCanvasClick(e) {
    if (!onToggleAccent) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const centerX = e.currentTarget.width / 2;
    const centerY = e.currentTarget.height / 2;
    const radius = 190;

    for (let i = 0; i < subdivisions; i++) {
      const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
      const px = centerX + radius * Math.cos(angle);
      const py = centerY + radius * Math.sin(angle);
      const dist = Math.sqrt((offsetX - px) ** 2 + (offsetY - py) ** 2);
      if (dist <= 10) {
        onToggleAccent(i);
        break;
      }
    }
  }

  return (
    <canvas
      className="metronome-canvas"
      ref={canvasRef}
      onClick={handleCanvasClick}
    />
  );
}
