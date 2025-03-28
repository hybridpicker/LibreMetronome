// src/hooks/useMetronomeLogic/references.js
import { useRef, useState } from 'react';

export function useMetronomeRefs() {
  // The AudioContext we reuse across the app:
  const audioCtxRef = useRef(null);

  // Buffers for normal / accent / first
  const normalBufferRef = useRef(null);
  const accentBufferRef = useRef(null);
  const firstBufferRef = useRef(null);

  // Enhanced timing references with high precision tracking
  const nextNoteTimeRef = useRef(0);
  const currentSubRef = useRef(0);
  const currentSubStartRef = useRef(0);
  const currentSubIntervalRef = useRef(0);
  const playedBeatTimesRef = useRef([]);
  
  // Added for high-precision timing analysis
  const highResTimingsRef = useRef([]);
  
  // We keep track of whether the scheduler is running:
  const schedulerRunningRef = useRef(false);
  const lookaheadRef = useRef(null);

  // Enhanced timing measurement
  const [actualBpm, setActualBpm] = useState(0);
  const [timingPrecision, setTimingPrecision] = useState(0); // Timing variance in ms

  // Track active audio nodes for proper cleanup
  const nodeRefs = useRef([]);
  
  // Performance optimization reference for expert-level precision
  const audioWorkletRef = useRef(null);

  return {
    audioCtxRef,
    normalBufferRef,
    accentBufferRef,
    firstBufferRef,
    nextNoteTimeRef,
    currentSubRef,
    currentSubStartRef,
    currentSubIntervalRef,
    playedBeatTimesRef,
    highResTimingsRef,
    schedulerRunningRef,
    lookaheadRef,
    actualBpm, setActualBpm,
    timingPrecision, setTimingPrecision,
    nodeRefs,
    audioWorkletRef
  };
}