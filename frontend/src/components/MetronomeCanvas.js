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

    // Compute a dynamic radius based on the canvas dimensions with a margin
    const margin = 15;
    const radius = Math.min(canvas.width, canvas.height) / 2 - margin;

    // Draw a single animation frame
    const drawFrame = () => {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw the main metronome circle with a subtle shadow
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      const circleColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary-color')
        .trim() || '#ffffff';
      ctx.strokeStyle = circleColor;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Draw subdivision markers as small circles around the main circle
      for (let i = 0; i < subdivisions; i++) {
        const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
        const px = centerX + radius * Math.cos(angle);
        const py = centerY + radius * Math.sin(angle);

        ctx.beginPath();
        if (i === 0) {
          // First beat marker: draw a larger circle with a border to distinguish it
          ctx.fillStyle = circleColor;  // white fill
          ctx.arc(px, py, 12, 0, 2 * Math.PI);
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#999999';
          ctx.stroke();
        } else {
          ctx.fillStyle = accents[i] ? circleColor : '#999999';
          ctx.arc(px, py, 10, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Draw the rotating pointer based on audio timing
      if (audioCtx) {
        const now = audioCtx.currentTime;
        const elapsed = now - currentSubStartRef.current;
        let fraction = elapsed / currentSubIntervalRef.current;
        if (fraction > 1.0) fraction = 1.0;

        const totalAnglePerSub = (2 * Math.PI) / Math.max(subdivisions, 1);
        const currentIndex =
          (currentSubdivision - 1 + Math.max(subdivisions, 1)) %
          Math.max(subdivisions, 1);
        const baseAngle = totalAnglePerSub * currentIndex - Math.PI / 2;
        const lineAngle = baseAngle + fraction * totalAnglePerSub;

        // Calculate a dynamic line width for visual dynamism
        const dynamicLineWidth = 2 + Math.sin(fraction * Math.PI);
        ctx.lineWidth = dynamicLineWidth;
        ctx.lineCap = 'round';
        // Add a subtle glow effect to the pointer
        ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
        ctx.shadowBlur = 5;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        const lineX = centerX + radius * Math.cos(lineAngle);
        const lineY = centerY + radius * Math.sin(lineAngle);
        const pointerColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--primary-color')
          .trim() || '#ffffff';
        ctx.strokeStyle = pointerColor;
        ctx.lineTo(lineX, lineY);
        ctx.stroke();

        // Reset shadow settings after drawing the pointer
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // Schedule the next frame
      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };

    // Resize the canvas to match its container
    function resizeCanvas() {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }

    // Initialize canvas size and start the drawing loop
    resizeCanvas();
    drawFrame();

    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [currentSubdivision, currentSubStartRef, currentSubIntervalRef, subdivisions, accents, audioCtx]);

  // Handle click events on the canvas for toggling accents
  function handleCanvasClick(e) {
    if (!onToggleAccent) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const centerX = e.currentTarget.width / 2;
    const centerY = e.currentTarget.height / 2;
    // Use the same margin-based radius calculation as in drawFrame
    const margin = 15;
    const radius = Math.min(e.currentTarget.width, e.currentTarget.height) / 2 - margin;

    // Check if a subdivision marker was clicked
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
