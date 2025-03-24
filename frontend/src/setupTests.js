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
      stop: jest.fn()
    };
  }

  createBuffer() {
    return {
      duration: 1,
      numberOfChannels: 2,
      sampleRate: 44100
    };
  }

  decodeAudioData() {
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
