/**
 * Accessibility Features Tests
 * 
 * Tests for the new accessibility components and utilities added to LibreMetronome
 */

import { 
  loadAccessibilitySettings, 
  announceToScreenReader, 
  playAudioFeedback,
  triggerHapticFeedback,
  detectSystemPreferences,
  getBeatAnnouncement
} from '../utils/accessibility/accessibilityUtils';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock document body classList
document.body.classList = {
  add: jest.fn(),
  remove: jest.fn(),
  contains: jest.fn(),
};

// Mock window MediaQueryList
window.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock Audio Context 
window.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: {
      value: 0
    }
  })),
  createGain: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    gain: {
      value: 0
    }
  })),
  destination: {},
  currentTime: 0
}));

// Mock navigator.vibrate
navigator.vibrate = jest.fn();

// Mock Element.appendChild, etc.
document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();
document.createElement = jest.fn().mockImplementation(() => ({
  setAttribute: jest.fn(),
  classList: {
    add: jest.fn()
  },
  textContent: ''
}));

// Mock document.head.appendChild
document.head.appendChild = jest.fn();

describe('Enhanced Accessibility Features', () => {
  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Reset initial state
    window.audioFeedbackEnabled = undefined;
    window.screenReaderMessagesEnabled = undefined;
    window.hapticFeedbackEnabled = undefined;
    window.focusIndicatorsEnabled = undefined;
    
    // Reset document.body.classList mock
    document.body.classList.add.mockClear();
    document.body.classList.remove.mockClear();
  });

  test('loadAccessibilitySettings loads new settings', () => {
    // Mock stored settings
    localStorage.getItem.mockImplementation(key => {
      if (key === 'accessibility-high-contrast') return 'true';
      if (key === 'accessibility-large-text') return 'true';
      if (key === 'accessibility-reduced-motion') return 'true';
      if (key === 'accessibility-audio-feedback') return 'true';
      if (key === 'accessibility-screen-reader-messages') return 'true';
      if (key === 'accessibility-focus-indicators') return 'true';
      if (key === 'accessibility-haptic-feedback') return 'true';
      if (key === 'accessibility-color-blind-mode') return 'protanopia';
      return null;
    });

    const settings = loadAccessibilitySettings();
    
    // Check loaded settings
    expect(settings.highContrast).toBe(true);
    expect(settings.largeText).toBe(true);
    expect(settings.reducedMotion).toBe(true);
    expect(settings.audioFeedback).toBe(true);
    expect(settings.screenReaderMessages).toBe(true);
    expect(settings.focusIndicators).toBe(true);
    expect(settings.hapticFeedback).toBe(true);
    expect(settings.colorBlindMode).toBe('protanopia');
    
    // Check if body classes are added correctly
    expect(document.body.classList.add).toHaveBeenCalledWith('high-contrast');
    expect(document.body.classList.add).toHaveBeenCalledWith('large-text');
    expect(document.body.classList.add).toHaveBeenCalledWith('reduced-motion');
    expect(document.body.classList.add).toHaveBeenCalledWith('focus-visible-enabled');
    expect(document.body.classList.add).toHaveBeenCalledWith('color-blind');
    expect(document.body.classList.add).toHaveBeenCalledWith('protanopia');
    
    // Check if window globals are set
    expect(window.audioFeedbackEnabled).toBe(true);
    expect(window.screenReaderMessagesEnabled).toBe(true);
    expect(window.hapticFeedbackEnabled).toBe(true);
    expect(window.focusIndicatorsEnabled).toBe(true);
  });

  test('triggerHapticFeedback calls navigator.vibrate when enabled', () => {
    // Enable haptic feedback
    window.hapticFeedbackEnabled = true;
    
    // Call the function with different patterns
    triggerHapticFeedback('short');
    expect(navigator.vibrate).toHaveBeenCalledWith([20]);
    
    triggerHapticFeedback('medium');
    expect(navigator.vibrate).toHaveBeenCalledWith([50]);
    
    triggerHapticFeedback('long');
    expect(navigator.vibrate).toHaveBeenCalledWith([100]);
    
    triggerHapticFeedback('double');
    expect(navigator.vibrate).toHaveBeenCalledWith([20, 30, 20]);
    
    triggerHapticFeedback('error');
    expect(navigator.vibrate).toHaveBeenCalledWith([50, 100, 50, 100, 50]);
  });

  test('triggerHapticFeedback does nothing when disabled', () => {
    // Disable haptic feedback
    window.hapticFeedbackEnabled = false;
    
    // Call the function
    triggerHapticFeedback('short');
    
    // Check that vibrate was not called
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  test('detectSystemPreferences returns correct system preferences', () => {
    // Mock window.matchMedia to return true for specific queries
    window.matchMedia.mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)' || 
               query === '(prefers-contrast: more)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    
    const preferences = detectSystemPreferences();
    
    // Check returned preferences
    expect(preferences.reducedMotion).toBe(true);
    expect(preferences.highContrast).toBe(true);
    expect(preferences.darkMode).toBe(false);
  });

  test('loadAccessibilitySettings respects system preferences', () => {
    // Mock localStorage to return null for all settings
    localStorage.getItem.mockImplementation(() => null);
    
    // Mock window.matchMedia to return true for reduced motion
    window.matchMedia.mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    
    const settings = loadAccessibilitySettings();
    
    // Should detect reduced motion from system preference
    expect(settings.reducedMotion).toBe(true);
    expect(document.body.classList.add).toHaveBeenCalledWith('reduced-motion');
  });

  test('getBeatAnnouncement returns correct announcement string', () => {
    // For first beat
    expect(getBeatAnnouncement(1, 4)).toBe('Beat 1 of 4');
    
    // For other beats
    expect(getBeatAnnouncement(2, 4)).toBe('Beat 2');
    expect(getBeatAnnouncement(3, 4)).toBe('Beat 3');
    expect(getBeatAnnouncement(4, 4)).toBe('Beat 4');
    
    // For different time signatures
    expect(getBeatAnnouncement(1, 3)).toBe('Beat 1 of 3');
    expect(getBeatAnnouncement(2, 3)).toBe('Beat 2');
    expect(getBeatAnnouncement(3, 3)).toBe('Beat 3');
  });

  test('announceToScreenReader creates and removes live region', () => {
    // Enable screen reader messages
    window.screenReaderMessagesEnabled = true;
    
    // Call the function
    announceToScreenReader('Test announcement', 'polite');
    
    // Check that a live region element was created
    expect(document.createElement).toHaveBeenCalledWith('div');
    expect(document.body.appendChild).toHaveBeenCalled();
    
    // Fast-forward timers to trigger removal
    jest.useFakeTimers();
    jest.advanceTimersByTime(3200);
    
    // Check that the element was removed after the timeout
    expect(document.body.removeChild).toHaveBeenCalled();
    
    // Clean up
    jest.useRealTimers();
  });
});
