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
        console.log("[KeyboardShortcuts] Ignoring repeated key:", e.key);
        return;
      }
      console.log("[KeyboardShortcuts] Key pressed:", e.key, "Code:", e.code);
      
      if (e.code === 'Space') {
        const now = Date.now();
        if (now - lastToggleTimeRef.current < DEBOUNCE_MS) {
          console.log("[KeyboardShortcuts] Space key debounce active");
          return;
        }
        lastToggleTimeRef.current = now;
        e.preventDefault();
        console.log("[KeyboardShortcuts] Triggering onTogglePlayPause");
        onTogglePlayPause && onTogglePlayPause();
        return;
      }
      
      switch (e.code) {
        case 'ArrowRight':
          console.log("[KeyboardShortcuts] Triggering onIncreaseTempo");
          onIncreaseTempo && onIncreaseTempo();
          break;
        case 'ArrowLeft':
          console.log("[KeyboardShortcuts] Triggering onDecreaseTempo");
          onDecreaseTempo && onDecreaseTempo();
          break;
        default: {
          const key = e.key.toLowerCase();
          if (key === 't') {
            console.log("[KeyboardShortcuts] Triggering onTapTempo");
            onTapTempo && onTapTempo();
          } else if (key >= '1' && key <= '9') {
            console.log("[KeyboardShortcuts] Triggering onSetSubdivisions with", e.key);
            onSetSubdivisions && onSetSubdivisions(parseInt(e.key, 10));
          } else if (key === 'a') {
            console.log("[KeyboardShortcuts] Triggering onSwitchToAnalog");
            onSwitchToAnalog && onSwitchToAnalog();
          } else if (key === 'c') {
            console.log("[KeyboardShortcuts] Triggering onSwitchToCircle");
            onSwitchToCircle && onSwitchToCircle();
          } else if (key === 'g') {
            console.log("[KeyboardShortcuts] Triggering onSwitchToGrid");
            onSwitchToGrid && onSwitchToGrid();
          } else if (key === 'i') {
            console.log("[KeyboardShortcuts] Triggering onToggleInfoOverlay");
            onToggleInfoOverlay && onToggleInfoOverlay();
          } else if (key === 'u') {
            console.log("[KeyboardShortcuts] Triggering onManualTempoIncrease");
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
