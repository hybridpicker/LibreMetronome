// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock Web Audio API for tests
class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.sampleRate = 44100;
    this.currentTime = 0;
    this.destination = { maxChannelCount: 2 };
  }

  createGain() {
    return {
      connect: jest.fn(),
      gain: { value: 1, setValueAtTime: jest.fn() }
    };
  }

  createOscillator() {
    return {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      frequency: { value: 440 }
    };
  }

  createBufferSource() {
    return {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      buffer: null
    };
  }

  createBuffer(numOfChannels, length, sampleRate) {
    return {
      duration: 1,
      numberOfChannels: numOfChannels || 2,
      sampleRate: sampleRate || 44100,
      length: length || 44100
    };
  }

  decodeAudioData(audioData, successCallback, errorCallback) {
    if (successCallback) {
      successCallback({
        duration: 1,
        numberOfChannels: 2,
        sampleRate: 44100
      });
    }
    return Promise.resolve({
      duration: 1,
      numberOfChannels: 2,
      sampleRate: 44100
    });
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

// Add AudioContext to global scope for tests
global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock for window.matchMedia
window.matchMedia = window.matchMedia || function(query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
};

// Mock for navigator.vibrate if not available (for haptic feedback)
if (!window.navigator.vibrate) {
  Object.defineProperty(window.navigator, 'vibrate', {
    value: jest.fn(),
    writable: true
  });
}

// Mock for window.metronomeDebug if not available
window.metronomeDebug = window.metronomeDebug || {
  audioBuffers: {
    normal: {},
    accent: {},
    first: {}
  },
  audioContext: new MockAudioContext(),
  playSound: jest.fn().mockImplementation(() => true)
};

// Clear all mocks before each test
beforeEach(() => {
  // Reset classList on document.body
  document.body.className = '';
  
  // Reset window globals
  window.audioFeedbackEnabled = false;
  window.screenReaderMessagesEnabled = true;
  window.hapticFeedbackEnabled = false;
  window.focusIndicatorsEnabled = true;
  
  // Reset mocks
  if (window.matchMedia) {
    window.matchMedia.mockClear && window.matchMedia.mockClear();
  }
  
  if (navigator.vibrate) {
    navigator.vibrate.mockClear && navigator.vibrate.mockClear();
  }
  
  if (window.metronomeDebug && window.metronomeDebug.playSound) {
    window.metronomeDebug.playSound.mockClear && window.metronomeDebug.playSound.mockClear();
  }
});

// Mock window document.createElement to handle potential issues in tests
const originalCreateElement = document.createElement;
document.createElement = function(tagName) {
  const element = originalCreateElement.call(document, tagName);
  
  // Add mock implementations for element methods that might not be available in jsdom
  if (element) {
    // Ensure element.classList is defined
    if (!element.classList) {
      element.classList = {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn().mockReturnValue(false),
        toggle: jest.fn()
      };
    }
    
    // Ensure setAttribute is defined
    if (!element.setAttribute) {
      element.setAttribute = jest.fn();
    }
  }
  
  return element;
};
