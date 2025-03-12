// src/hooks/useMetronomeLogic/references.js
import { useRef, useState } from 'react';

export function useMetronomeRefs() {
  // The AudioContext we reuse across the app:
  const audioCtxRef = useRef(null);

  // Buffers for normal / accent / first
  const normalBufferRef = useRef(null);
  const accentBufferRef = useRef(null);
  const firstBufferRef = useRef(null);

  // Scheduling references
  const nextNoteTimeRef = useRef(0);
  const currentSubRef = useRef(0);
  const currentSubStartRef = useRef(0);
  const currentSubIntervalRef = useRef(0);
  const playedBeatTimesRef = useRef([]);

  // We keep track of whether the scheduler is running:
  const schedulerRunningRef = useRef(false);
  const lookaheadRef = useRef(null);

  // For measuring actual BPM if you want:
  const [actualBpm, setActualBpm] = useState(0);

  // Track active audio nodes for proper cleanup
  const nodeRefs = useRef([]);

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
    schedulerRunningRef,
    lookaheadRef,
    actualBpm, setActualBpm,
    nodeRefs
  };
}