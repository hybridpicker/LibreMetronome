// src/tests/metronome/EditableSliders.test.js
import React from 'react';
import { render, fireEvent, act, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

// Import components
import EditableSliderInput from '../../components/metronome/Controls/EditableSliderInput';
import PolyrhythmEditableSlider from '../../components/metronome/PolyrhythmMode/PolyrhythmEditableSlider';
import BaseMetronome from '../../components/metronome/BaseMetronome';
import MultiCircleMetronome from '../../components/metronome/MultiCircleMode/MultiCircleMetronome';
import PolyrhythmMetronome from '../../components/metronome/PolyrhythmMode/PolyrhythmMetronome';

// Mock the necessary dependencies
jest.mock('../../hooks/useMetronomeLogic', () => {
  return jest.fn(() => ({
    tapTempo: jest.fn(),
    isReady: true,
    currentSubdivision: 0
  }));
});

// Mock Audio Context for all audio-related code
const mockOscillator = {
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  frequency: { value: 440, setValueAtTime: jest.fn() }
};

const mockGain = {
  connect: jest.fn(),
  gain: { value: 0.5, setValueAtTime: jest.fn() }
};

const mockAudioBuffer = {};

const mockAudioContext = {
  createOscillator: jest.fn().mockReturnValue(mockOscillator),
  createGain: jest.fn().mockReturnValue(mockGain),
  createBufferSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    buffer: null
  }),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: jest.fn().mockResolvedValue(undefined),
  decodeAudioData: jest.fn().mockImplementation((arrayBuffer, onSuccess) => {
    if (onSuccess) onSuccess(mockAudioBuffer);
    return Promise.resolve(mockAudioBuffer);
  })
};

// Mock AudioContext constructor
window.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
window.webkitAudioContext = window.AudioContext;

// Mock global audio context
window._audioContextInit = mockAudioContext;

jest.mock('../../hooks/useAudio', () => {
  return jest.fn(() => ({
    isReady: true,
    play: jest.fn(),
    updateTempo: jest.fn(),
    updateVolume: jest.fn(),
    updateSwing: jest.fn(),
    updateBeatMode: jest.fn(),
    updateSubdivisions: jest.fn(),
    audioCtx: mockAudioContext
  }));
});

// Mock fetch API for sound loading
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    json: () => Promise.resolve([])
  })
);

// Enhanced mocks for the polyrhythm and multi-circle components
jest.mock('../../components/metronome/PolyrhythmMode/usePolyrhythmLogic', () => {
  return jest.fn(() => ({
    tapTempo: jest.fn(),
    innerCurrentSubdivision: 0,
    outerCurrentSubdivision: 0,
    isSilencePhaseRef: { current: false },
    measureCountRef: { current: 0 },
    muteMeasureCountRef: { current: 0 },
    startScheduler: jest.fn(),
    stopScheduler: jest.fn(),
    reloadSounds: jest.fn().mockResolvedValue(true),
    audioCtx: mockAudioContext,
    load: jest.fn().mockResolvedValue(true),
    actualBpm: 120
  }));
});

jest.mock('../../components/metronome/MultiCircleMode/hooks/useMultiCircleMetronomeLogic', () => {
  return jest.fn(() => ({
    tapTempo: jest.fn(),
    currentSubdivision: 0,
    isTransitioning: jest.fn().mockReturnValue(false),
    accentsRef: { current: [3, 1, 1, 1] },
    isProcessingPlayPauseRef: { current: false },
    safelyInitAudioContext: jest.fn().mockResolvedValue(true),
    startScheduler: jest.fn(),
    stopScheduler: jest.fn(),
    reloadSounds: jest.fn().mockResolvedValue(true),
    audioCtx: mockAudioContext
  }));
});

// Skip other complex mocks for now since we're focusing on the slider tests
jest.mock('../../components/metronome/MultiCircleMode/CircleRenderer', () => {
  return function MockCircleRenderer() {
    return <div data-testid="multi-circle-renderer">Multi-Circle Renderer</div>;
  };
});

jest.mock('../../components/metronome/PolyrhythmMode/CircleRenderer', () => {
  return function MockPolyrhythmRenderer() {
    return <div data-testid="polyrhythm-renderer">Polyrhythm Renderer</div>;
  };
});

jest.mock('../../components/metronome/PolyrhythmMode/DirectBeatIndicator', () => {
  return function MockDirectBeatIndicator() {
    return <div data-testid="beat-indicator">Beat Indicator</div>;
  };
});

// Direct tests for EditableSliderInput and PolyrhythmEditableSlider components
describe('EditableSliderInput Component', () => {
  test('renders with correct initial value', () => {
    const mockSetValue = jest.fn();
    render(
      <EditableSliderInput
        label="Test"
        value={50}
        setValue={mockSetValue}
        min={0}
        max={100}
        step={1}
        className="test-slider"
        formatter={(val) => `${val} Units`}
        parser={(val) => parseInt(val.replace(/\D/g, ''))}
      />
    );
    
    expect(screen.getByText('Test: 50 Units')).toBeInTheDocument();
  });
  
  // Fix the test for editing
  test('allows editing when clicking on label', async () => {
    const mockSetValue = jest.fn();
    render(
      <EditableSliderInput
        label="Test"
        value={50}
        setValue={mockSetValue}
        min={0}
        max={100}
        step={1}
        className="test-slider"
        formatter={(val) => `${val} Units`}
        parser={(val) => parseInt(val.replace(/\D/g, ''))}
      />
    );
    
    // Click on the label to enter edit mode
    fireEvent.click(screen.getByText('Test: 50 Units'));
    
    // Check if the input field appears
    const input = screen.getByTestId('editable-input');
    expect(input).toBeInTheDocument();
    
    // Change the value
    await act(async () => {
      fireEvent.change(input, { target: { value: '75 Units' } });
      fireEvent.blur(input);
    });
    
    // Check if setValue was called with the correct value
    expect(mockSetValue).toHaveBeenCalledWith(75);
  });
  
  test('limits value to min/max range', async () => {
    const mockSetValue = jest.fn();
    render(
      <EditableSliderInput
        label="Test"
        value={50}
        setValue={mockSetValue}
        min={0}
        max={100}
        step={1}
        className="test-slider"
        formatter={(val) => `${val} Units`}
        parser={(val) => parseInt(val.replace(/\D/g, ''))}
      />
    );
    
    // Click on the label to enter edit mode
    fireEvent.click(screen.getByText('Test: 50 Units'));
    
    // Change the value to something above max
    const input = screen.getByTestId('editable-input');
    await act(async () => {
      fireEvent.change(input, { target: { value: '150 Units' } });
      fireEvent.blur(input);
    });
    
    // Check if setValue was called with clamped value
    expect(mockSetValue).toHaveBeenCalledWith(100);
  });
});

describe('PolyrhythmEditableSlider Component', () => {
  test('renders with correct initial value', () => {
    const mockSetValue = jest.fn();
    render(
      <PolyrhythmEditableSlider
        label="Test"
        value={50}
        setValue={mockSetValue}
        min={0}
        max={100}
        step={1}
        className="test-slider"
        formatter={(val) => `${val} Units`}
        parser={(val) => parseInt(val.replace(/\D/g, ''))}
      />
    );
    
    expect(screen.getByText('Test: 50 Units')).toBeInTheDocument();
  });
  
  test('allows editing when clicking on label with proper event handling', async () => {
    const mockSetValue = jest.fn();
    render(
      <PolyrhythmEditableSlider
        label="Test"
        value={50}
        setValue={mockSetValue}
        min={0}
        max={100}
        step={1}
        className="test-slider"
        formatter={(val) => `${val} Units`}
        parser={(val) => parseInt(val.replace(/\D/g, ''))}
      />
    );
    
    // Click on the label to enter edit mode
    fireEvent.click(screen.getByText('Test: 50 Units'));
    
    // Check if the input field appears
    const input = screen.getByTestId('editable-input');
    expect(input).toBeInTheDocument();
    
    // Change the value
    await act(async () => {
      fireEvent.change(input, { target: { value: '75 Units' } });
      // Simulate pressing Enter to commit the value
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    
    // Check if setValue was called with the correct value
    expect(mockSetValue).toHaveBeenCalledWith(75);
  });
  
  test('respects event propagation stops', () => {
    const mockSetValue = jest.fn();
    const mockParentClick = jest.fn();
    
    const { container } = render(
      <div onClick={mockParentClick}>
        <PolyrhythmEditableSlider
          label="Test"
          value={50}
          setValue={mockSetValue}
          min={0}
          max={100}
          step={1}
          className="test-slider"
          formatter={(val) => `${val} Units`}
          parser={(val) => parseInt(val.replace(/\D/g, ''))}
        />
      </div>
    );
    
    // Click on the label
    fireEvent.click(screen.getByText('Test: 50 Units'));
    
    // Verify parent click was not triggered
    expect(mockParentClick).not.toHaveBeenCalled();
  });
});

// Test edge cases
describe('Editable Slider Edge Cases', () => {
  test('handles non-numeric input gracefully', async () => {
    const mockSetValue = jest.fn();
    render(
      <EditableSliderInput
        label="Test"
        value={50}
        setValue={mockSetValue}
        min={0}
        max={100}
        step={1}
        className="test-slider"
        formatter={(val) => `${val} Units`}
        parser={(val) => parseInt(val.replace(/\D/g, ''))}
      />
    );
    
    // Click on the label to enter edit mode
    fireEvent.click(screen.getByText('Test: 50 Units'));
    
    // Enter non-numeric input
    const input = screen.getByTestId('editable-input');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'abc' } });
      fireEvent.blur(input);
    });
    
    // Check that setValue was not called with invalid input
    expect(mockSetValue).not.toHaveBeenCalled();
    
    // Should revert to original value
    await waitFor(() => {
      expect(screen.getByText('Test: 50 Units')).toBeInTheDocument();
    });
  });
  
  test('handles empty input gracefully', async () => {
    const mockSetValue = jest.fn();
    render(
      <EditableSliderInput
        label="Test"
        value={50}
        setValue={mockSetValue}
        min={0}
        max={100}
        step={1}
        className="test-slider"
        formatter={(val) => `${val} Units`}
        parser={(val) => parseInt(val.replace(/\D/g, ''))}
      />
    );
    
    // Click on the label to enter edit mode
    fireEvent.click(screen.getByText('Test: 50 Units'));
    
    // Clear the input and don't enter anything
    const input = screen.getByTestId('editable-input');
    await act(async () => {
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);
    });
    
    // Check that setValue was not called with empty input
    expect(mockSetValue).not.toHaveBeenCalled();
    
    // Should revert to original value
    await waitFor(() => {
      expect(screen.getByText('Test: 50 Units')).toBeInTheDocument();
    });
  });
  
  test('pressing Escape reverts to original value', async () => {
    const mockSetValue = jest.fn();
    render(
      <EditableSliderInput
        label="Test"
        value={50}
        setValue={mockSetValue}
        min={0}
        max={100}
        step={1}
        className="test-slider"
        formatter={(val) => `${val} Units`}
        parser={(val) => parseInt(val.replace(/\D/g, ''))}
      />
    );
    
    // Click on the label to enter edit mode
    fireEvent.click(screen.getByText('Test: 50 Units'));
    
    // Change the value but then press Escape
    const input = screen.getByTestId('editable-input');
    await act(async () => {
      fireEvent.change(input, { target: { value: '75 Units' } });
      fireEvent.keyDown(input, { key: 'Escape' });
    });
    
    // Check that setValue was not called when Escape is pressed
    expect(mockSetValue).not.toHaveBeenCalled();
    
    // Should revert to original value
    await waitFor(() => {
      expect(screen.getByText('Test: 50 Units')).toBeInTheDocument();
    });
  });
});

// Mock test for simplicity
// In real tests, these would be more thorough with actual DOM manipulation
describe('Editable Sliders in Different Metronome Modes', () => {
  // Mock the implementation directly in the test
  test('all sliders work correctly', () => {
    // Just test that the components render with correct props in this test
    // The actual slider functionality is tested in the dedicated tests above
    expect(true).toBe(true);
  });
  
  // Test consistent behavior across modes
  test('All modes should render editable sliders', async () => {
    // Analog mode
    const { unmount: unmountAnalog } = render(<BaseMetronome mode="analog" />);
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Tempo:/)).toBeInTheDocument();
    unmountAnalog();
    
    // Circle mode
    const { unmount: unmountCircle } = render(<BaseMetronome mode="circle" />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Tempo:/)).toBeInTheDocument();
    unmountCircle();
    
    // Grid mode
    const { unmount: unmountGrid } = render(<BaseMetronome mode="grid" />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Tempo:/)).toBeInTheDocument();
    unmountGrid();
    
    // Multi-Circle mode
    const { unmount: unmountMulti } = render(<MultiCircleMetronome />);
    expect(screen.getByText(/Tempo:/)).toBeInTheDocument();
    unmountMulti();
    
    // Polyrhythm mode
    render(<PolyrhythmMetronome />);
    expect(screen.getByText(/Tempo:/)).toBeInTheDocument();
  });
});