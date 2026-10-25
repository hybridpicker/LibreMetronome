/* eslint-disable testing-library/no-container, testing-library/no-node-access, testing-library/render-result-naming-convention --
   These tests assert SVG/canvas geometry, CSS state classes and img sources that have no accessible role. */
import { fireEvent, render, screen } from '@testing-library/react';
import BaseMetronome from '../../../components/metronome/BaseMetronome';
import { manualTempoAcceleration } from '../../../hooks/useMetronomeLogic/trainingLogic';

jest.mock('../../../hooks/useMetronomeLogic/trainingLogic', () => ({
  manualTempoAcceleration: jest.fn()
}));

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  manualTempoAcceleration.mockClear();
});

afterEach(() => jest.restoreAllMocks());

const play = () => fireEvent.click(screen.getByAltText('Toggle Play').closest('button'));

describe('BaseMetronome', () => {
  test('starts paused at 120 BPM, 4 beats, quarter notes, volume 50 %', () => {
    render(<BaseMetronome />);
    expect(screen.getByText(/Tempo: 120 BPM/)).toBeInTheDocument();
    expect(screen.getByText(/Volume: 50%/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quarter Notes' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '4 beats per bar' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByAltText('Toggle Play').getAttribute('src')).toContain('play.svg');
  });

  test('the placeholder visualisation is named after the mode', () => {
    const { rerender } = render(<BaseMetronome />);
    expect(screen.getByText('Circle Mode')).toBeInTheDocument();
    rerender(<BaseMetronome mode="grid" />);
    expect(screen.getByText('Grid Mode')).toHaveClass('grid-mode');
  });

  test('the circle placeholder is round, other modes are square', () => {
    const { rerender } = render(<BaseMetronome mode="circle" />);
    expect(screen.getByText('Circle Mode')).toHaveStyle({ borderRadius: '50%' });
    rerender(<BaseMetronome mode="grid" />);
    expect(screen.getByText('Grid Mode')).toHaveStyle({ borderRadius: '0' });
  });

  test('note value and beat count selections update the selectors', () => {
    render(<BaseMetronome />);
    fireEvent.click(screen.getByRole('button', { name: 'Eighth Notes' }));
    expect(screen.getByRole('button', { name: 'Eighth Notes' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '7 beats per bar' }));
    expect(screen.getByRole('button', { name: '7 beats per bar' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('the swing slider only appears for an even number of beats', () => {
    render(<BaseMetronome />);
    expect(screen.getByLabelText(/Swing:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '5 beats per bar' }));
    expect(screen.queryByLabelText(/Swing:/)).toBeNull();
  });

  test('sliders change tempo, volume and swing', () => {
    render(<BaseMetronome />);
    fireEvent.change(screen.getByLabelText(/Tempo:/), { target: { value: '90' } });
    expect(screen.getByText(/Tempo: 90 BPM/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Volume:/), { target: { value: '0.8' } });
    expect(screen.getByText(/Volume: 80%/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Swing:/), { target: { value: '0.1' } });
    expect(screen.getByText(/Swing: 20%/)).toBeInTheDocument();
  });

  test('the play button toggles the icon', () => {
    render(<BaseMetronome />);
    play();
    expect(screen.getByAltText('Toggle Play').getAttribute('src')).toContain('pause.svg');
    play();
    expect(screen.getByAltText('Toggle Play').getAttribute('src')).toContain('play.svg');
  });

  test('tap tempo dispatches the global event (from the base and from the layout)', () => {
    const details = [];
    const listener = (e) => details.push(e.detail);
    window.addEventListener('metronome-tap-tempo', listener);
    render(<BaseMetronome />);
    fireEvent.click(screen.getByAltText('Tap Tempo').closest('button'));
    window.removeEventListener('metronome-tap-tempo', listener);
    expect(details).toHaveLength(2);
    expect(details[0]).toEqual({ timestamp: expect.any(Number) });
    expect(details[1]).toEqual({ timestamp: expect.any(Number), handled: true });
  });
});

describe('BaseMetronome accelerate button', () => {
  test('is absent without speed training', () => {
    render(<BaseMetronome speedMode={0} />);
    expect(screen.queryByRole('button', { name: /Accelerate tempo/ })).toBeNull();
  });

  test.each([[1, 'Auto'], [2, 'Manual']])('speedMode %i: click while paused does nothing', (speedMode, text) => {
    render(<BaseMetronome speedMode={speedMode} />);
    fireEvent.click(screen.getByRole('button', { name: `Accelerate tempo in ${text} Speed Training Mode` }));
    expect(manualTempoAcceleration).not.toHaveBeenCalled();
  });

  test('while playing it passes the current tempo, percentage and setter to the training logic', () => {
    render(<BaseMetronome speedMode={2} tempoIncreasePercent={8} />);
    play();
    fireEvent.click(screen.getByRole('button', { name: 'Accelerate tempo in Manual Speed Training Mode' }));
    expect(manualTempoAcceleration).toHaveBeenCalledTimes(1);
    const arg = manualTempoAcceleration.mock.calls[0][0];
    expect(arg.tempoIncreasePercent).toBe(8);
    expect(arg.tempoRef).toEqual({ current: 120 });
    expect(typeof arg.setTempo).toBe('function');
  });

  test('uses the default 5 % when none is given', () => {
    render(<BaseMetronome speedMode={1} />);
    play();
    fireEvent.click(screen.getByRole('button', { name: /Accelerate tempo in Auto/ }));
    expect(manualTempoAcceleration.mock.calls[0][0].tempoIncreasePercent).toBe(5);
  });
});
