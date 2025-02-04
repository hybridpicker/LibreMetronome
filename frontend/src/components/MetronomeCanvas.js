// src/components/MetronomeCanvas.js
import React, { useEffect, useRef } from 'react';

/*
 * Comments in English as required
 * This component draws the circular metronome (markers, pointer) on a canvas.
 */

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
    const margin = 15;
    const radius = Math.min(canvas.width, canvas.height) / 2 - margin;

    const drawFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw main metronome circle
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      const circleOutline =
        getComputedStyle(document.documentElement)
          .getPropertyValue('--circle-outline')
          .trim() || '#ffffff';
      ctx.strokeStyle = circleOutline;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Draw subdivision markers
      for (let i = 0; i < subdivisions; i++) {
        const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
        const px = centerX + radius * Math.cos(angle);
        const py = centerY + radius * Math.sin(angle);
        ctx.beginPath();
        if (i === 0) {
          // first beat is always the main accent color
          ctx.fillStyle =
            getComputedStyle(document.documentElement)
              .getPropertyValue('--accent-color')
              .trim() || '#2196F3';
          ctx.arc(px, py, 12, 0, 2 * Math.PI);
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#999999';
          ctx.stroke();
        } else {
          ctx.fillStyle = accents[i]
            ? getComputedStyle(document.documentElement)
                .getPropertyValue('--accent-color')
                .trim() || '#2196F3'
            : '#999999';
          ctx.arc(px, py, 10, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Draw rotating pointer
      if (audioCtx) {
        const now = audioCtx.currentTime;
        const elapsed = now - currentSubStartRef.current;
        let fraction = elapsed / currentSubIntervalRef.current;
        if (fraction > 1.0) fraction = 1.0;

        const totalAnglePerSub = (2 * Math.PI) / Math.max(subdivisions, 1);
        // We adjust the index to ensure consistent pointer direction
        const currentIndex =
          (currentSubdivision - 1 + Math.max(subdivisions, 1)) %
          Math.max(subdivisions, 1);
        const baseAngle = totalAnglePerSub * currentIndex - Math.PI / 2;
        const lineAngle = baseAngle + fraction * totalAnglePerSub;
        const dynamicLineWidth = 2 + Math.sin(fraction * Math.PI);

        ctx.lineWidth = dynamicLineWidth;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        const lineX = centerX + radius * Math.cos(lineAngle);
        const lineY = centerY + radius * Math.sin(lineAngle);
        const pointerColor =
          getComputedStyle(document.documentElement)
            .getPropertyValue('--primary-color')
            .trim() || '#ffffff';
        ctx.strokeStyle = pointerColor;
        ctx.lineTo(lineX, lineY);
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };

    function resizeCanvas() {
      // Make canvas resolution adapt to its displayed size
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

  // Allow toggling accent by clicking on small circles
  function handleCanvasClick(e) {
    if (!onToggleAccent) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const centerX = e.currentTarget.width / 2;
    const centerY = e.currentTarget.height / 2;
    const margin = 15;
    const radius = Math.min(e.currentTarget.width, e.currentTarget.height) / 2 - margin;

    for (let i = 0; i < subdivisions; i++) {
      const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
      const px = centerX + radius * Math.cos(angle);
      const py = centerY + radius * Math.sin(angle);
      const dist = Math.sqrt((offsetX - px) ** 2 + (offsetY - py) ** 2);
      // Markers have a radius of 10 or 12, so a small detection threshold
      if (i === 0) {
        // first beat is 12px radius
        if (dist <= 12) {
          onToggleAccent(i);
          break;
        }
      } else {
        if (dist <= 10) {
          onToggleAccent(i);
          break;
        }
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
