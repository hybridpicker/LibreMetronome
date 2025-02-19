// File: src/hooks/KeyboardShortcuts.js
import { useEffect, useRef } from 'react';

/**
 * Custom hook to handle global keyboard shortcuts.
 *
 * Available callbacks:
 * - onTogglePlayPause: Called when the Space key is pressed.
 * - onTapTempo: Called when the "T" key is pressed.
 * - onSetSubdivisions: Called when keys 1–9 are pressed.
 * - onIncreaseTempo: Called when the Right Arrow key is pressed.
 * - onDecreaseTempo: Called when the Left Arrow key is pressed.
 * - onSwitchToAnalog: Called when the "A" key is pressed.
 * - onSwitchToCircle: Called when the "C" key is pressed.
 * - onSwitchToGrid: Called when the "G" key is pressed.
 * - onToggleInfoOverlay: Called when the "I" key is pressed.
 * - onManualTempoIncrease: Called when the "U" key is pressed.
 */
const useKeyboardShortcuts = ({
  onTogglePlayPause,
  onTapTempo,
  onSetSubdivisions,
  onIncreaseTempo,
  onDecreaseTempo,
  onSwitchToAnalog,
  onSwitchToCircle,
  onSwitchToGrid,
  onToggleInfoOverlay,
  onManualTempoIncrease,
}) => {
  const lastToggleTimeRef = useRef(0);
  const DEBOUNCE_MS = 300; // 300ms debounce for Space key

  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.repeat) {
        return;
      }
      
      if (e.code === 'Space') {
        const now = Date.now();
        if (now - lastToggleTimeRef.current < DEBOUNCE_MS) {
          return;
        }
        lastToggleTimeRef.current = now;
        e.preventDefault();
        onTogglePlayPause && onTogglePlayPause();
        return;
      }
      
      switch (e.code) {
        case 'ArrowRight':
          onIncreaseTempo && onIncreaseTempo();
          break;
        case 'ArrowLeft':
          onDecreaseTempo && onDecreaseTempo();
          break;
        default: {
          const key = e.key.toLowerCase();
          if (key === 't') {
            onTapTempo && onTapTempo();
          } else if (key >= '1' && key <= '9') {
            onSetSubdivisions && onSetSubdivisions(parseInt(e.key, 10));
          } else if (key === 'a') {
            onSwitchToAnalog && onSwitchToAnalog();
          } else if (key === 'c') {
            onSwitchToCircle && onSwitchToCircle();
          } else if (key === 'g') {
            onSwitchToGrid && onSwitchToGrid();
          } else if (key === 'i') {
            onToggleInfoOverlay && onToggleInfoOverlay();
          } else if (key === 'u') {
            onManualTempoIncrease && onManualTempoIncrease();
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [
    onTogglePlayPause,
    onTapTempo,
    onSetSubdivisions,
    onIncreaseTempo,
    onDecreaseTempo,
    onSwitchToAnalog,
    onSwitchToCircle,
    onSwitchToGrid,
    onToggleInfoOverlay,
    onManualTempoIncrease,
  ]);
};

export default useKeyboardShortcuts;
