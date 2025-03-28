// Mock implementation of useAudio hook
const useAudio = jest.fn(() => ({
  isReady: true,
  play: jest.fn(),
  updateTempo: jest.fn(),
  updateVolume: jest.fn(),
  updateSwing: jest.fn(),
  updateBeatMode: jest.fn(),
  updateSubdivisions: jest.fn()
}));

export default useAudio;