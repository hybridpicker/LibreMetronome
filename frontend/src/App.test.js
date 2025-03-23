// App.test.js
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock AudioContext
const mockOscillator = {
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  frequency: { setValueAtTime: jest.fn() }
};

const mockGain = {
  connect: jest.fn(),
  gain: { 
    value: 0,
    setValueAtTime: jest.fn()
  }
};

window.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn().mockReturnValue(mockOscillator),
  createGain: jest.fn().mockReturnValue(mockGain),
  destination: {},
  currentTime: 0,
  resume: jest.fn().mockResolvedValue(undefined),
  decodeAudioData: jest.fn().mockResolvedValue({}),
  createBufferSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    buffer: null
  }),
  state: 'running'
}));

// Also mock the webkitAudioContext for cross-browser compatibility
window.webkitAudioContext = window.AudioContext;

// Mock the window._audioContextInit that gets created in App.js
window._audioContextInit = {
  createOscillator: jest.fn().mockReturnValue(mockOscillator),
  createGain: jest.fn().mockReturnValue(mockGain),
  destination: {},
  currentTime: 0,
  resume: jest.fn().mockResolvedValue(undefined),
  state: 'running'
};

// Mock all audio-related modules at once
jest.mock('./hooks/useMetronomeLogic', () => ({
  __esModule: true,
  default: () => ({
    isPlaying: false,
    tempo: 120,
    togglePlay: jest.fn(),
    setTempo: jest.fn(),
    setBeatCount: jest.fn(),
    setSubdivision: jest.fn()
  })
}));

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders header with correct text', async () => {
    render(<App />);
    expect(screen.getByText('Libre')).toBeInTheDocument();
    expect(screen.getByText('Metronome')).toBeInTheDocument();
  });

  test('renders mode selector buttons', async () => {
    render(<App />);
    expect(screen.getByText('Analog')).toBeInTheDocument();
    expect(screen.getByText('Circle')).toBeInTheDocument();
    expect(screen.getByText('Grid')).toBeInTheDocument();
    expect(screen.getByText('Multi')).toBeInTheDocument();
    expect(screen.getByText('Polyrhythm')).toBeInTheDocument();
  });
});