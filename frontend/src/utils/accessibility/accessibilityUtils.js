/**
 * Accessibility utilities for LibreMetronome
 */

// Initialize audio context for feedback sounds
let audioContext;

// Initialize on demand to avoid autoplay policy issues
const getAudioContext = () => {
  if (!audioContext) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioContext = new AudioContext();
      }
    } catch (e) {
      console.error('Web Audio API not supported:', e);
    }
  }
  return audioContext;
};

// Feedback through the metronome's own samples: [sample, volume]
const METRONOME_FEEDBACK = {
  click: ['normal', 0.3],
  start: ['first', 0.4],
  stop: ['accent', 0.3]
};
const DEFAULT_METRONOME_FEEDBACK = ['normal', 0.2];
const WARNING_REPEAT_DELAY_MS = 150;

// Fallback beeps: frequency (Hz), gain and duration (s) per feedback type
const OSCILLATOR_FEEDBACK = {
  click: { frequency: 800, gain: 0.1, duration: 0.05 },
  start: { frequency: 440, gain: 0.2, duration: 0.15 },
  stop: { frequency: 330, gain: 0.2, duration: 0.15 },
  warning: { frequency: 220, gain: 0.3, duration: 0.3 }
};
const DEFAULT_OSCILLATOR_FEEDBACK = { frequency: 600, gain: 0.1, duration: 0.1 };

/**
 * Try to play the feedback with the metronome's samples.
 * @returns {boolean} - true when the sound was handed to the metronome
 */
const playMetronomeFeedback = (type) => {
  if (!window.metronomeDebug || typeof window.metronomeDebug.playSound !== 'function') return false;
  try {
    if (type === 'warning') {
      // Play first sound twice for warning
      window.metronomeDebug.playSound('first', 0.3);
      setTimeout(() => window.metronomeDebug.playSound('first', 0.3), WARNING_REPEAT_DELAY_MS);
      return true;
    }
    const [sample, volume] = METRONOME_FEEDBACK[type] || DEFAULT_METRONOME_FEEDBACK;
    window.metronomeDebug.playSound(sample, volume);
    return true;
  } catch (e) {
    console.error('Failed to use metronome sound API:', e);
    // Fall back to oscillator if metronome sound fails
    return false;
  }
};

/**
 * Play a sound for interface feedback
 * @param {string} type - The type of sound to play ('click', 'start', 'stop', 'warning')
 */
export const playAudioFeedback = (type) => {
  // Only play if audio feedback is enabled
  if (!window.audioFeedbackEnabled) return;
  
  const context = getAudioContext();
  if (!context) return;
  
  if (playMetronomeFeedback(type)) return;
  
  // Fall back to oscillator if metronome sound isn't available
  if (!context.createOscillator || typeof context.createOscillator !== 'function') {
    console.error('Audio context does not support createOscillator');
    return;
  }
  
  try {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const { frequency, gain, duration } = OSCILLATOR_FEEDBACK[type] || DEFAULT_OSCILLATOR_FEEDBACK;

    oscillator.frequency.value = frequency;
    gainNode.gain.value = gain;
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  } catch (e) {
    console.error('Failed to create oscillator:', e);
  }
};

/**
 * Announce a message for screen readers
 * @param {string} message - The message to announce
 * @param {string} priority - The priority level ('polite' or 'assertive')
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  // Only announce if screen reader messages are enabled (default is true)
  if (window.screenReaderMessagesEnabled === false) return;

  try {
    // Create a new live region element
    const liveRegion = document.createElement('div');
    if (!liveRegion) return;
    
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.classList.add('sr-only');
    
    // Store a reference to the element in a way that works in test environment
    const elementRef = liveRegion;
    
    // Add to DOM, update content, and remove after announcement
    document.body.appendChild(elementRef);
    
    // Small delay to ensure screen readers register the new live region
    setTimeout(() => {
      elementRef.textContent = message;
      
      // Remove after a reasonable time for the screen reader to process
      setTimeout(() => {
        try {
          // Use this safer approach for test environments
          if (document.body && document.body.contains) {
            // First check if the function exists and is callable
            try {
              const isInDocument = document.body.contains(elementRef);
              if (isInDocument) {
                document.body.removeChild(elementRef);
              }
            } catch (err) {
              // In some test environments, contains might throw
              // Try removing it anyway as a fallback
              try {
                document.body.removeChild(elementRef);
              } catch (innerErr) {
                // If we can't remove it either way, just log and continue
                console.log('Could not remove screen reader element, might be in test env');
              }
            }
          }
        } catch (e) {
          console.error('Error removing screen reader element:', e);
        }
      }, 3000);
    }, 100);
  } catch (e) {
    console.error('Error announcing to screen reader:', e);
  }
};

const BODY_CLASSES = [
  'high-contrast', 'large-text', 'reduced-motion', 'focus-visible-enabled',
  'color-blind', 'protanopia', 'deuteranopia', 'tritanopia', 'monochromacy'
];

const DEFAULT_SETTINGS = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  audioFeedback: false,
  screenReaderMessages: true,
  focusIndicators: true,
  hapticFeedback: false,
  colorBlindMode: 'none'
};

// localStorage key -> default value, evaluated only when the key is missing
const STORAGE_DEFAULTS = {
  'accessibility-high-contrast': () => 'false',
  'accessibility-large-text': () => 'false',
  'accessibility-reduced-motion': () => detectSystemPreferences().reducedMotion.toString(),
  'accessibility-audio-feedback': () => 'false',
  'accessibility-screen-reader-messages': () => 'true',
  'accessibility-focus-indicators': () => 'true',
  // Default to true on mobile devices that support vibration
  'accessibility-haptic-feedback': () => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasVibration = 'vibrate' in navigator;
    return (isTouch && hasVibration).toString();
  },
  'accessibility-color-blind-mode': () => 'none'
};

const addClassToAll = (selector, ...classNames) => {
  document.querySelectorAll(selector).forEach(el => el.classList.add(...classNames));
};

const applyHighContrast = () => {
  document.body.classList.add('high-contrast');
  addClassToAll('.metronome-container, .metronome-canvas, .metronome-controls, header, footer, canvas, svg', 'high-contrast');

  // Handle SVGs and Canvas specifically for high contrast mode
  document.querySelectorAll('svg').forEach(svg => {
    svg.style.filter = 'brightness(2) contrast(1.5)';

    svg.querySelectorAll('path, circle, rect, line, polygon').forEach(path => {
      path.setAttribute('stroke', '#FFFFFF');
      path.setAttribute('stroke-width', '2');
      if (!path.getAttribute('fill') || path.getAttribute('fill') === 'none') {
        path.setAttribute('fill', 'none');
      } else {
        path.setAttribute('fill', '#000000');
      }
    });
  });

  document.querySelectorAll('canvas').forEach(canvas => {
    canvas.style.filter = 'brightness(2) contrast(1.5) invert(1)';
  });
};

const applyLargeText = () => {
  document.body.classList.add('large-text');
  addClassToAll('.control-section, .tempo-display, .beats-display, header, footer', 'large-text');
};

const applyReducedMotion = () => {
  document.body.classList.add('reduced-motion');
  addClassToAll('.metronome-container, .metronome-canvas, .circle-display, .analog-display', 'reduced-motion');
};

/** Force a repaint without changing dimensions by toggling a GPU transform. */
const repaintOnNextTick = (element) => {
  element.style.transform = 'translateZ(0)';
  setTimeout(() => {
    element.style.transform = '';
  }, 0);
};

const applyColorBlindMode = (mode) => {
  document.body.classList.add('color-blind');
  document.body.classList.add(mode);

  addClassToAll(
    '.metronome-container, .metronome-canvas, .metronome-controls, header, footer, .circle-display, .analog-display, .beat-grid',
    'color-blind',
    mode
  );

  // Preserve the app's viewport/scaling in color blind mode
  document.body.classList.add('preserve-viewport');

  // Trigger a repaint to ensure SVG filters are applied
  setTimeout(() => {
    try {
      const svgElements = document.querySelectorAll('svg');
      svgElements.forEach(repaintOnNextTick);

      const canvasElements = document.querySelectorAll('canvas');
      canvasElements.forEach(repaintOnNextTick);

      // Force metronome container repaint without scaling issues
      const metronomeContainer = document.querySelector('.metronome-container');
      if (metronomeContainer) {
        metronomeContainer.style.width = '';
        metronomeContainer.style.height = '';
        repaintOnNextTick(metronomeContainer);
      }

      console.log(`Applied color blind mode: ${mode} to ${svgElements.length} SVG elements and ${canvasElements.length} canvas elements`);
    } catch (e) {
      console.error('Error applying color blind mode to elements:', e);
    }
  }, 50);
};

const readStoredSettings = () => {
  const stored = (key) => localStorage.getItem(`accessibility-${key}`);
  const settings = {
    highContrast: stored('high-contrast') === 'true',
    largeText: stored('large-text') === 'true',
    reducedMotion: stored('reduced-motion') === 'true',
    audioFeedback: stored('audio-feedback') === 'true',
    screenReaderMessages: stored('screen-reader-messages') !== 'false',
    focusIndicators: stored('focus-indicators') !== 'false',
    hapticFeedback: stored('haptic-feedback') === 'true',
    colorBlindMode: stored('color-blind-mode')
  };

  // Apply system preferences if user hasn't explicitly overridden them
  const systemPreferences = detectSystemPreferences();
  if (stored('reduced-motion') !== 'false' && systemPreferences.reducedMotion) {
    settings.reducedMotion = true;
  }
  if (stored('high-contrast') !== 'false' && systemPreferences.highContrast) {
    settings.highContrast = true;
  }
  return settings;
};

/**
 * Load accessibility settings from localStorage
 * Sets default values if not previously set
 */
export const loadAccessibilitySettings = () => {
  try {
    Object.entries(STORAGE_DEFAULTS).forEach(([key, getDefault]) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, getDefault());
      }
    });

    const settings = readStoredSettings();

    // First remove all classes to ensure clean state
    document.body.classList.remove(...BODY_CLASSES);

    if (settings.highContrast) applyHighContrast();
    if (settings.largeText) applyLargeText();
    if (settings.reducedMotion) applyReducedMotion();
    if (settings.focusIndicators) {
      document.body.classList.add('focus-visible-enabled');
    }
    if (settings.colorBlindMode && settings.colorBlindMode !== 'none') {
      applyColorBlindMode(settings.colorBlindMode);
    }
    
    // Set global flags for other components to use
    window.audioFeedbackEnabled = settings.audioFeedback;
    window.screenReaderMessagesEnabled = settings.screenReaderMessages;
    window.hapticFeedbackEnabled = settings.hapticFeedback;
    window.focusIndicatorsEnabled = settings.focusIndicators;
    
    // Load CSS files dynamically if needed
    if (settings.focusIndicators) {
      ensureStylesheetLoaded('focus-indicators');
    }
    if (settings.colorBlindMode !== 'none') {
      ensureStylesheetLoaded('color-blindness');
      ensureStylesheetLoaded('play-button-colorblind-fix');
    }
    
    // Log settings to verify they're being loaded
    console.log('Accessibility settings loaded:', settings);
    console.log('Applied to document.body.classList:', document.body.classList.toString());
    console.log('Window globals set:', {
      audioFeedbackEnabled: window.audioFeedbackEnabled,
      screenReaderMessagesEnabled: window.screenReaderMessagesEnabled,
      hapticFeedbackEnabled: window.hapticFeedbackEnabled,
      focusIndicatorsEnabled: window.focusIndicatorsEnabled
    });
    
    return settings;
  } catch (e) {
    console.error('Error loading accessibility settings:', e);
    
    // Return default settings if there was an error
    return { ...DEFAULT_SETTINGS };
  }
};

/**
 * Detect system accessibility preferences from media queries
 * @returns {Object} System preferences
 */
export const detectSystemPreferences = () => {
  // Safe check for matchMedia in test environments
  if (!window.matchMedia || typeof window.matchMedia !== 'function') {
    return {
      reducedMotion: false,
      highContrast: false,
      darkMode: false
    };
  }
  
  try {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: more)');
    const msHighContrastQuery = window.matchMedia('(-ms-high-contrast: active)');
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    return {
      reducedMotion: reducedMotionQuery && reducedMotionQuery.matches === true,
      highContrast: (highContrastQuery && highContrastQuery.matches === true) || 
                   (msHighContrastQuery && msHighContrastQuery.matches === true),
      darkMode: darkModeQuery && darkModeQuery.matches === true
    };
  } catch (error) {
    console.error("Error detecting system preferences:", error);
    return {
      reducedMotion: false,
      highContrast: false,
      darkMode: false
    };
  }
};

/**
 * Trigger haptic feedback if supported and enabled
 * @param {string} pattern - 'short', 'medium', 'long', 'double', or 'error'
 */
export const triggerHapticFeedback = (pattern = 'short') => {
  if (!window.hapticFeedbackEnabled) return;
  if (!navigator.vibrate || typeof navigator.vibrate !== 'function') return;
  
  // Define vibration patterns (in milliseconds)
  const patterns = {
    short: [20],
    medium: [50],
    long: [100],
    double: [20, 30, 20],
    error: [50, 100, 50, 100, 50]
  };
  
  // Use the specified pattern or default to short
  const vibrationPattern = patterns[pattern] || patterns.short;
  
  try {
    navigator.vibrate(vibrationPattern);
  } catch (error) {
    console.error('Failed to trigger haptic feedback:', error);
  }
};

/**
 * Ensures a CSS stylesheet is loaded
 * @param {string} name - Name of the CSS file (without extension)
 */
const ensureStylesheetLoaded = (name) => {
  const id = `accessibility-${name}-stylesheet`;
  
  try {
    // Check if the stylesheet is already loaded
    if (document.getElementById(id)) return;
    
    // Create a new link element
    const link = document.createElement('link');
    if (!link) return;
    
    link.id = id;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = `/styles/${name}.css`;
    
    // Only append if we have access to document.head
    if (document.head) {
      document.head.appendChild(link);
    }
  } catch (e) {
    console.error(`Error loading stylesheet ${name}:`, e);
  }
};

/**
 * Get the beat announcement text for screen readers
 * @param {number} beat - Current beat (1-based)
 * @param {number} totalBeats - Total beats in the measure
 * @returns {string} Announcement text
 */
export const getBeatAnnouncement = (beat, totalBeats) => {
  if (beat === 1) {
    return `Beat 1 of ${totalBeats}`;
  } else {
    return `Beat ${beat}`;
  }
};
