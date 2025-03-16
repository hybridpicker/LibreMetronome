import { render, screen } from '@testing-library/react';
import App from './App';

// Mock AudioContext
window.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn(),
  createGain: jest.fn(),
  destination: {},
  decodeAudioData: jest.fn().mockResolvedValue({}),
  createBufferSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    buffer: null
  })
}));

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
    expect(screen.getByText('Pendulum')).toBeInTheDocument();
    expect(screen.getByText('Circle')).toBeInTheDocument();
    expect(screen.getByText('Grid')).toBeInTheDocument();
    expect(screen.getByText('Multi Circle')).toBeInTheDocument();
  });
});