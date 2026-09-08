// App.test.js
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Silence console.error before mocking AudioContext to avoid Web Audio API error
const originalConsoleError = console.error;
console.error = jest.fn();

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
  close: jest.fn().mockResolvedValue(undefined),
  decodeAudioData: jest.fn().mockResolvedValue({}),
  createBufferSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    buffer: null
  }),
  state: 'running',
  sampleRate: 48000
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
  close: jest.fn().mockResolvedValue(undefined),
  state: 'running',
  sampleRate: 48000
};

// Restore console.error after mocking
console.error = originalConsoleError;

// Mock all audio-related modules at once
jest.mock('./hooks/useMetronomeLogic', () => ({
  __esModule: true,
  default: () => ({
    isPlaying: false,
    tempo: 120,
    togglePlay: jest.fn(),
    setTempo: jest.fn(),
    setBeatCount: jest.fn(),
    setSubdivision: jest.fn(),
    audioCtx: globalThis._audioContextInit,
    normalBufferRef: { current: {} },
    accentBufferRef: { current: {} },
    firstBufferRef: { current: {} },
    reloadSounds: jest.fn().mockResolvedValue(true),
    startScheduler: jest.fn(),
    stopScheduler: jest.fn()
  })
}));

jest.mock('./components/metronome/AnalogMode/AnalogMetronomeCanvas', () => () => null);

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  test('renders header with logo', async () => {
    render(<App />);
    expect(screen.getByAltText('LibreMetronome')).toBeInTheDocument();
  });

  test('renders mode selector buttons', async () => {
    render(<App />);
    expect(screen.getByText('Analog')).toBeInTheDocument();
    expect(screen.getByText('Beat')).toBeInTheDocument();
    expect(screen.getByText('Grid')).toBeInTheDocument();
    expect(screen.getByText('Sequence')).toBeInTheDocument();
    expect(screen.getByText('Polyrhythm')).toBeInTheDocument();
  });

  test('starts playback at the full device input level', () => {
    render(<App />);

    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveValue('1');
  });

  test('upgrades the former default volume without replacing a chosen level', () => {
    window.localStorage.setItem('libreMetronome.volume', '0.85');
    render(<App />);

    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveValue('1');
    expect(window.localStorage.getItem('libreMetronome.volume')).toBe('1');
  });

  test('keeps a previously selected volume', () => {
    window.localStorage.setItem('libreMetronome.volume', '0.5');
    render(<App />);

    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveValue('0.5');
  });

  test('keeps a visible Tap Tempo label in every mode', () => {
    render(<App />);

    ['Analog', 'Beat', 'Grid', 'Sequence', 'Polyrhythm'].forEach((mode) => {
      fireEvent.click(screen.getByRole('button', { name: `${mode} mode` }));
      expect(screen.getByRole('button', { name: 'Tap Tempo' })).toHaveTextContent('Tap Tempo');
    });
  });

  test('keeps the play icon and text-only Tap Tempo accessible in every mode', () => {
    render(<App />);

    ['Analog', 'Beat', 'Grid', 'Sequence', 'Polyrhythm'].forEach((mode) => {
      fireEvent.click(screen.getByRole('button', { name: `${mode} mode` }));

      const startButton = screen.getByRole('button', { name: 'Start' });
      const tapButton = screen.getByRole('button', { name: 'Tap Tempo' });
      expect(startButton.querySelector('img')).toHaveAttribute('src', expect.stringContaining('play'));
      expect(tapButton.querySelector('img')).toBeNull();
      expect(startButton).toHaveTextContent('Start');
      expect(tapButton).toHaveTextContent('Tap Tempo');
    });
  });

  test('handles each Space shortcut as one playback transition', async () => {
    const dateNow = jest.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1400);
    render(<App />);

    fireEvent.keyDown(window, { code: 'Space' });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Metronome playing'));

    fireEvent.keyDown(window, { code: 'Space' });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Metronome paused'));
    dateNow.mockRestore();
  });

  test('restores and persists the last selected tempo', () => {
    window.localStorage.setItem('libreMetronome.tempo', '172');
    render(<App />);

    expect(screen.getByRole('slider', { name: 'Tempo' })).toHaveValue('172');

    fireEvent.change(screen.getByRole('slider', { name: 'Tempo' }), {
      target: { value: '156' }
    });

    expect(window.localStorage.getItem('libreMetronome.tempo')).toBe('156');
  });
});
