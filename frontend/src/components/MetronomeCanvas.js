// src/components/MetronomeCanvas.js
import React, { useEffect, useRef } from 'react';

/*
 * Comments in English as required.
 * This was the old approach: drawing a circle and markers on a HTML canvas.
 * If you use the new SVG approach from AdvancedMetronomeWithCircle, you can remove this file.
 */

export default function MetronomeCanvas({
  currentSubdivision,
  currentSubStartRef,
  currentSubIntervalRef,
  subdivisions,
  accents,
  onToggleAccent,
  audioCtx,
  isPaused
}) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const margin = 15;
    const radius = Math.min(canvas.width, canvas.height) / 2 - margin;
    const markerPositions = [];

    function drawFrame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Main circle
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

      // Draw markers
      markerPositions.length = 0;
      for (let i = 0; i < subdivisions; i++) {
        const angle = (2 * Math.PI * i) / Math.max(subdivisions, 1) - Math.PI / 2;
        const px = centerX + radius * Math.cos(angle);
        const py = centerY + radius * Math.sin(angle);
        markerPositions.push({ x: px, y: py });

        // color
        let fillColor = '#999999'; // default
        if (
          i === currentSubdivision &&
          !isPaused &&
          audioCtx &&
          audioCtx.state === 'running'
        ) {
          fillColor =
            getComputedStyle(document.documentElement)
              .getPropertyValue('--active-color')
              .trim() || '#00e676';
        } else if (i === 0) {
          fillColor =
            getComputedStyle(document.documentElement)
              .getPropertyValue('--accent-color')
              .trim() || '#2196F3';
        } else if (accents[i]) {
          fillColor =
            getComputedStyle(document.documentElement)
              .getPropertyValue('--accent-color')
              .trim() || '#2196F3';
        }

        ctx.beginPath();
        const markerRadius = i === 0 ? 12 : 10;
        ctx.arc(px, py, markerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = fillColor;
        ctx.fill();

        if (i === 0 || i === currentSubdivision) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#999999';
          ctx.stroke();
        }
      }

      // If subdivisions >= 3, draw polygon
      if (subdivisions >= 3) {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#999999';
        markerPositions.forEach((pos, index) => {
          if (index === 0) {
            ctx.moveTo(pos.x, pos.y);
          } else {
            ctx.lineTo(pos.x, pos.y);
          }
        });
        ctx.closePath();
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(drawFrame);
    }

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
  }, [currentSubdivision, subdivisions, accents, audioCtx, isPaused]);

  // On click => toggle accent
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
      const angle = (2 * Math.PI * i) / Math.max(subdivisions, 1) - Math.PI / 2;
      const px = centerX + radius * Math.cos(angle);
      const py = centerY + radius * Math.sin(angle);
      const dist = Math.sqrt((offsetX - px) ** 2 + (offsetY - py) ** 2);

      const markerRadius = i === 0 ? 12 : 10;
      if (dist <= markerRadius) {
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
