// AdvancedMetronomeWithCircle.js
// Combined approach:
//  - Web Audio scheduling with tempo, volume, swing, and accents
//  - A canvas-based circle with clickable subdivision points (except index 0)
//  - This version has NO <h2> heading, to keep the UI clean.

import React, { useEffect, useRef, useState, useCallback } from 'react';

const TEMPO_MIN = 26;
const TEMPO_MAX = 294;
const SWING_MAX = 0.5;
const VOLUME_MAX = 1.0;

export default function AdvancedMetronomeWithCircle({
  // The following props can override local states if desired,
  // or you can just rely on them here in "App.js"
  tempo = 120,
  subdivisions = 4,
  volume = 1.0,
  swing = 0.0,
  accentedBeats = [],
  isPaused = true,
  circleRadius = 150
}) {
  // If you want local states instead of external props,
  // you can define them. 
  // But here we'll just use props for scheduling & drawing logic.

  // We'll store references for audio scheduling
  const audioCtxRef = useRef(null);

  const normalBufferRef = useRef(null);
  const accentBufferRef = useRef(null);
  const firstBufferRef  = useRef(null);

  // Lookahead scheduling
  const scheduleAheadTime = 0.1; // seconds
  const nextNoteTimeRef = useRef(0);
  const currentSubRef   = useRef(0);

  // For partial rotation
  const currentSubStartRef = useRef(0);
  const currentSubIntervalRef = useRef(0);

  // Interval ID
  const lookaheadRef = useRef(null);

  // UI debug: which subdivision is currently playing
  const [currentSubdivision, setCurrentSubdivision] = useState(0);

  // Canvas references
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // -------------------------------
  // 1) Initialize Audio
  // -------------------------------
  useEffect(() => {
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();

    loadSound('/assets/audio/click_new.mp3', buffer => (normalBufferRef.current = buffer));
    loadSound('/assets/audio/click_new_accent.mp3', buffer => (accentBufferRef.current = buffer));
    loadSound('/assets/audio/click_new_first.mp3', buffer => (firstBufferRef.current = buffer));

    return () => {
      stopScheduler();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  function loadSound(url, callback) {
    fetch(url)
      .then(res => res.arrayBuffer())
      .then(arr => audioCtxRef.current.decodeAudioData(arr))
      .then(decoded => callback(decoded))
      .catch(err => console.error('Error loading sound:', err));
  }

  // -------------------------------
  // 2) Play scheduling
  // -------------------------------
  function schedulePlay(buffer, when) {
    if (!buffer) return;
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;

    const gainNode = audioCtxRef.current.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(audioCtxRef.current.destination);

    source.start(when);
  }

  function scheduleSubdivision(subIndex, when) {
    if (subIndex === 0) {
      schedulePlay(firstBufferRef.current, when);
    } else if (accentedBeats.includes(subIndex)) {
      schedulePlay(accentBufferRef.current, when);
    } else {
      schedulePlay(normalBufferRef.current, when);
    }
  }

  function getCurrentSubIntervalSec() {
    // base: (60 / tempo) / subdivisions
    const baseSec = (60 / tempo) / Math.max(subdivisions, 1);
    if (subdivisions > 1) {
      // even => (1 + swing), odd => (1 - swing)
      if (currentSubRef.current % 2 === 0) {
        return baseSec * (1 + swing);
      } else {
        return baseSec * (1 - swing);
      }
    }
    return baseSec;
  }

  const scheduler = useCallback(() => {
    const now = audioCtxRef.current?.currentTime || 0;
    while (nextNoteTimeRef.current < now + scheduleAheadTime) {
      scheduleSubdivision(currentSubRef.current, nextNoteTimeRef.current);
      setCurrentSubdivision(currentSubRef.current);

      currentSubStartRef.current = nextNoteTimeRef.current;
      currentSubIntervalRef.current = getCurrentSubIntervalSec();

      currentSubRef.current = (currentSubRef.current + 1) % Math.max(subdivisions, 1);
      nextNoteTimeRef.current += currentSubIntervalRef.current;
    }
  }, [tempo, subdivisions, swing, volume, accentedBeats]);

  function startScheduler() {
    stopScheduler();
    currentSubRef.current = 0;
    nextNoteTimeRef.current = audioCtxRef.current?.currentTime || 0;

    currentSubStartRef.current = nextNoteTimeRef.current;
    currentSubIntervalRef.current = getCurrentSubIntervalSec();

    lookaheadRef.current = setInterval(scheduler, 25);
  }

  function stopScheduler() {
    clearInterval(lookaheadRef.current);
    lookaheadRef.current = null;
  }

  useEffect(() => {
    stopScheduler();
    if (!isPaused) {
      startScheduler();
    }
    return () => stopScheduler();
  }, [isPaused, scheduler]);

  // -------------------------------
  // 3) Canvas drawing
  // -------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function drawFrame() {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // outer circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#007ACC';
      ctx.lineWidth = 2;
      ctx.stroke();

      // subdivisions
      for (let i = 0; i < subdivisions; i++) {
        const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
        const px = centerX + circleRadius * Math.cos(angle);
        const py = centerY + circleRadius * Math.sin(angle);

        ctx.beginPath();
        ctx.arc(px, py, 10, 0, 2 * Math.PI);

        if (i === 0) {
          ctx.fillStyle = '#FF9F1C';
        } else if (accentedBeats.includes(i)) {
          ctx.fillStyle = '#00CC66';
        } else {
          ctx.fillStyle = '#999999';
        }
        ctx.fill();
      }

      // rotating line
      const now = audioCtxRef.current?.currentTime || 0;
      const elapsed = now - currentSubStartRef.current;
      const fraction = Math.min(elapsed / currentSubIntervalRef.current, 1.0);

      const totalAnglePerSub = (2 * Math.PI) / Math.max(subdivisions, 1);
      const currentIndex = (currentSubRef.current - 1 + Math.max(subdivisions, 1)) % Math.max(subdivisions, 1);
      const baseAngle = totalAnglePerSub * currentIndex - Math.PI / 2;
      const lineAngle = baseAngle + fraction * totalAnglePerSub;

      ctx.beginPath();
      const lineX = centerX + circleRadius * Math.cos(lineAngle);
      const lineY = centerY + circleRadius * Math.sin(lineAngle);
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(lineX, lineY);
      ctx.strokeStyle = '#FF9F1C';
      ctx.lineWidth = 4;
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(drawFrame);
    }

    drawFrame();
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [subdivisions, circleRadius, accentedBeats]);

  // -------------------------------
  // 4) Handle Canvas Click (toggle accent)
  // -------------------------------
  function handleCanvasClick(e) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < subdivisions; i++) {
      if (i === 0) continue; // first beat is not clickable

      const angle = (2 * Math.PI * i) / subdivisions - Math.PI / 2;
      const px = centerX + circleRadius * Math.cos(angle);
      const py = centerY + circleRadius * Math.sin(angle);

      const dist = Math.hypot(mouseX - px, mouseY - py);
      if (dist < 15) {
        // toggle accent
        if (accentedBeats.includes(i)) {
          // remove
          const newAccents = accentedBeats.filter(idx => idx !== i);
          accentedBeats.splice(0, accentedBeats.length, ...newAccents); 
          // This modifies the array in place if you want. Or you can use a setState approach.
        } else {
          accentedBeats.push(i);
        }
        // Force a re-render by triggering an update
        // In real code, we'd store accentedBeats in a state. 
        // But here, for demonstration, just do a small trick:
        setCurrentSubdivision(currentSubRef.current);
        break;
      }
    }
  }

  // No heading here to keep UI minimal
  return (
    <div style={{ textAlign: 'center' }}>
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        style={{ background: '#F5F5F5', display: 'block', margin: '0 auto' }}
        onClick={handleCanvasClick}
      />

      {/* Optional debug info */}
      <div style={{ marginTop: '1rem' }}>
        <p>Paused: {String(isPaused)}</p>
        <p>Current Subdivision: {currentSubdivision}</p>
        <p>Accented Beats: {JSON.stringify(accentedBeats)}</p>
      </div>
    </div>
  );
}
