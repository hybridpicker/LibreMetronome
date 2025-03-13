// src/hooks/useKeyboardShortcuts.js

import { useEffect, useRef } from 'react';

const useKeyboardShortcuts = ({
  onTogglePlayPause,
  onTapTempo,
  onSetSubdivisions,
  onIncreaseTempo,
  onDecreaseTempo,
  onSwitchToAnalog,
  onSwitchToCircle,
  onSwitchToGrid,
  onSwitchToMulti,
  onToggleInfoOverlay,
  onToggleTrainingOverlay,
  onManualTempoIncrease
}) => {
  const togglePlayRef = useRef(onTogglePlayPause);
  const tapTempoRef = useRef(onTapTempo);

  // Store tap times in this hook's own closure
  const tapTimesRef = useRef([]);
  
  useEffect(() => {
    togglePlayRef.current = onTogglePlayPause;
  }, [onTogglePlayPause]);

  useEffect(() => {
    tapTempoRef.current = onTapTempo;
  }, [onTapTempo]);

  const lastSpaceKeyTimeRef = useRef(0);
  const lastTapKeyTimeRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Skip shortcuts in input elements
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable
      ) {
        return;
      }

      // SPACE key for play/pause
      if (event.code === 'Space') {
        event.preventDefault();
        const now = Date.now();
        if (now - lastSpaceKeyTimeRef.current < 300) {
          return;
        }
        lastSpaceKeyTimeRef.current = now;
        if (togglePlayRef.current) {
          togglePlayRef.current();
        }
      }

      // Handle other shortcuts
      switch (event.code) {
        case 'KeyT':
          // Rate limit for key repeats
          const now = Date.now();
          if (now - lastTapKeyTimeRef.current < 100) {
            return;
          }
          lastTapKeyTimeRef.current = now;
          event.preventDefault();
          
          // Record the tap time
          const tapTime = performance.now();
          tapTimesRef.current.push(tapTime);
          
          // Keep only the last 5 taps
          if (tapTimesRef.current.length > 5) {
            tapTimesRef.current.shift();
          }
          
          // Calculate tempo with at least 2 taps
          if (tapTimesRef.current.length >= 2) {
            // Calculate average interval
            let sum = 0;
            for (let i = 1; i < tapTimesRef.current.length; i++) {
              sum += tapTimesRef.current[i] - tapTimesRef.current[i - 1];
            }
            const avgMs = sum / (tapTimesRef.current.length - 1);
            
            // Convert to BPM and clamp
            const newTempo = Math.round(60000 / avgMs);
            const clampedTempo = Math.max(15, Math.min(240, newTempo));
            
            // Dispatch a custom event that App.js can listen for
            const tempoEvent = new CustomEvent('metronome-set-tempo', {
              detail: { tempo: clampedTempo }
            });
            window.dispatchEvent(tempoEvent);
          }
          break;
          
        case 'KeyR':
          if (onToggleTrainingOverlay) onToggleTrainingOverlay();
          break;
        case 'Digit1':
        case 'Numpad1':
          if (onSetSubdivisions) onSetSubdivisions(1);
          break;
        case 'Digit2':
        case 'Numpad2':
          if (onSetSubdivisions) onSetSubdivisions(2);
          break;
        case 'Digit3':
        case 'Numpad3':
          if (onSetSubdivisions) onSetSubdivisions(3);
          break;
        case 'Digit4':
        case 'Numpad4':
          if (onSetSubdivisions) onSetSubdivisions(4);
          break;
        case 'Digit5':
        case 'Numpad5':
          if (onSetSubdivisions) onSetSubdivisions(5);
          break;
        case 'Digit6':
        case 'Numpad6':
          if (onSetSubdivisions) onSetSubdivisions(6);
          break;
        case 'Digit7':
        case 'Numpad7':
          if (onSetSubdivisions) onSetSubdivisions(7);
          break;
        case 'Digit8':
        case 'Numpad8':
          if (onSetSubdivisions) onSetSubdivisions(8);
          break;
        case 'Digit9':
        case 'Numpad9':
          if (onSetSubdivisions) onSetSubdivisions(9);
          break;
        case 'ArrowUp':
        case 'ArrowRight':
          if (onIncreaseTempo) onIncreaseTempo();
          break;
        case 'ArrowDown':
        case 'ArrowLeft':
          if (onDecreaseTempo) onDecreaseTempo();
          break;
        case 'KeyA':
          if (onSwitchToAnalog) onSwitchToAnalog();
          break;
        case 'KeyC':
          if (onSwitchToCircle) onSwitchToCircle();
          break;
        case 'KeyG':
          if (onSwitchToGrid) onSwitchToGrid();
          break;
        case 'KeyM':
          if (onSwitchToMulti) onSwitchToMulti();
          break;
        case 'KeyI':
          if (onToggleInfoOverlay) onToggleInfoOverlay();
          break;
        case 'KeyU':
          if (onManualTempoIncrease) onManualTempoIncrease();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onSetSubdivisions,
    onIncreaseTempo,
    onDecreaseTempo,
    onSwitchToAnalog,
    onSwitchToCircle,
    onSwitchToGrid,
    onSwitchToMulti,
    onToggleInfoOverlay,
    onToggleTrainingOverlay,
    onManualTempoIncrease
  ]);
};

export default useKeyboardShortcuts;