// File: src/hooks/KeyboardShortcuts.js
import { useEffect } from 'react';

/**
 * Custom hook to handle global keyboard shortcuts.
 *
 * Available callbacks:
 * - onTogglePlayPause: Called when the Space key is pressed.
 * - onTapTempo: Called when the "T" key is pressed.
 * - onSetSubdivisions: Called when keys 1–9 are pressed to set subdivisions.
 * - onIncreaseTempo: Called when the Right Arrow key is pressed.
 * - onDecreaseTempo: Called when the Left Arrow key is pressed.
 * - onSwitchToAnalog: Called when the "A" key is pressed.
 * - onSwitchToCircle: Called when the "C" key is pressed.
 * - onSwitchToGrid: Called when the "G" key is pressed.
 * - onToggleInfoOverlay: Called when the "I" key is pressed.
 * - onManualTempoIncrease: Called when the "U" key is pressed (for manual speed training).
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
  useEffect(() => {
    const handleKeydown = (e) => {
      // Prevent repeated triggers if the key is held down.
      if (e.repeat) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          onTogglePlayPause && onTogglePlayPause();
          break;
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
