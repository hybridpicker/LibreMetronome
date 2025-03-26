// Accessibility Testing for LibreMetronome
import { loadAccessibilitySettings, announceToScreenReader, playAudioFeedback } from '../utils/accessibility/accessibilityUtils';

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
  toggle: jest.fn(),
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

// Mock Element.appendChild
document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();
document.createElement = jest.fn().mockImplementation(() => ({
  setAttribute: jest.fn(),
  classList: {
    add: jest.fn()
  },
  textContent: ''
}));

describe('Accessibility Settings', () => {
  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Reset initial state
    window.audioFeedbackEnabled = undefined;
    window.screenReaderMessagesEnabled = undefined;
  });

  test('loadAccessibilitySettings loads default settings if none stored', () => {
    const settings = loadAccessibilitySettings();
    
    // Default settings check
    expect(settings.highContrast).toBe(false);
    expect(settings.largeText).toBe(false);
    expect(settings.reducedMotion).toBe(false);
    expect(settings.audioFeedback).toBe(false);
    expect(settings.screenReaderMessages).toBe(true);
    
    // Check if body classes are toggled correctly
    expect(document.body.classList.toggle).toHaveBeenCalledWith('high-contrast', false);
    expect(document.body.classList.toggle).toHaveBeenCalledWith('large-text', false);
    expect(document.body.classList.toggle).toHaveBeenCalledWith('reduced-motion', false);
    
    // Check if window globals are set
    expect(window.audioFeedbackEnabled).toBe(false);
    expect(window.screenReaderMessagesEnabled).toBe(true);
  });

  test('loadAccessibilitySettings loads saved settings from localStorage', () => {
    // Mock stored settings
    localStorage.getItem.mockImplementation(key => {
      if (key === 'accessibility-high-contrast') return 'true';
      if (key === 'accessibility-large-text') return 'true';
      if (key === 'accessibility-reduced-motion') return 'true';
      if (key === 'accessibility-audio-feedback') return 'true';
      if (key === 'accessibility-screen-reader-messages') return 'false';
      return null;
    });

    const settings = loadAccessibilitySettings();
    
    // Check loaded settings
    expect(settings.highContrast).toBe(true);
    expect(settings.largeText).toBe(true);
    expect(settings.reducedMotion).toBe(true);
    expect(settings.audioFeedback).toBe(true);
    expect(settings.screenReaderMessages).toBe(false);
    
    // Check if body classes are toggled correctly
    expect(document.body.classList.toggle).toHaveBeenCalledWith('high-contrast', true);
    expect(document.body.classList.toggle).toHaveBeenCalledWith('large-text', true);
    expect(document.body.classList.toggle).toHaveBeenCalledWith('reduced-motion', true);
    
    // Check if window globals are set
    expect(window.audioFeedbackEnabled).toBe(true);
    expect(window.screenReaderMessagesEnabled).toBe(false);
  });

  test('announceToScreenReader creates and removes live region element', () => {
    // Enable screen reader messages
    window.screenReaderMessagesEnabled = true;
    
    // Call the function
    announceToScreenReader('Test announcement', 'polite');
    
    // Check if element was created and configured correctly
    expect(document.createElement).toHaveBeenCalledWith('div');
    expect(document.body.appendChild).toHaveBeenCalled();
    
    // Fast-forward timers to check removal
    jest.runAllTimers();
    expect(document.body.removeChild).toHaveBeenCalled();
  });

  test('announceToScreenReader does nothing when screen reader messages disabled', () => {
    // Disable screen reader messages
    window.screenReaderMessagesEnabled = false;
    
    // Call the function
    announceToScreenReader('Test announcement', 'polite');
    
    // Check that no element was created
    expect(document.createElement).not.toHaveBeenCalled();
    expect(document.body.appendChild).not.toHaveBeenCalled();
  });

  test('playAudioFeedback plays sound when audio feedback enabled', () => {
    // Enable audio feedback
    window.audioFeedbackEnabled = true;
    
    // Call the function
    playAudioFeedback('click');
    
    // Check if audio context was used
    const AudioContext = window.AudioContext;
    expect(AudioContext).toHaveBeenCalled();
    
    // Check if oscillator and gain were configured
    const mockInstance = AudioContext.mock.results[0].value;
    expect(mockInstance.createOscillator).toHaveBeenCalled();
    expect(mockInstance.createGain).toHaveBeenCalled();
  });

  test('playAudioFeedback does nothing when audio feedback disabled', () => {
    // Disable audio feedback
    window.audioFeedbackEnabled = false;
    
    // Call the function
    playAudioFeedback('click');
    
    // Check if audio context was not used
    const AudioContext = window.AudioContext;
    expect(AudioContext).not.toHaveBeenCalled();
  });
});
