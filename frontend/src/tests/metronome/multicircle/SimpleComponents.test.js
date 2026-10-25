import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AddCircleButton from '../../../components/metronome/MultiCircleMode/AddCircleButton';
import PlayButton from '../../../components/metronome/MultiCircleMode/PlayButton';
import TrainingStatus from '../../../components/metronome/MultiCircleMode/TrainingStatus';

describe('AddCircleButton', () => {
  test('shows a plus and calls addCircle when clicked', () => {
    const addCircle = jest.fn();
    render(<AddCircleButton addCircle={addCircle} containerSize={200} isMobile={false} />);
    fireEvent.click(screen.getByText('+'));
    expect(addCircle).toHaveBeenCalledTimes(1);
  });

  test('is as large as the circle container and uses mobile or desktop margins', () => {
    const { rerender } = render(<AddCircleButton addCircle={jest.fn()} containerSize={180} isMobile />);
    const host = () => screen.getByText('+').parentElement; // eslint-disable-line testing-library/no-node-access
    expect(host()).toHaveStyle({ width: '180px', height: '180px', margin: '15px 0px' });
    rerender(<AddCircleButton addCircle={jest.fn()} containerSize={180} isMobile={false} />);
    expect(host()).toHaveStyle({ margin: '15px' });
  });
});

describe('PlayButton', () => {
  test('shows the play icon while paused and the pause icon while playing', () => {
    const { rerender } = render(<PlayButton handlePlayPause={jest.fn()} isPaused />);
    expect(screen.getByRole('img', { name: 'Play' }).getAttribute('src')).toContain('play.svg');
    rerender(<PlayButton handlePlayPause={jest.fn()} isPaused={false} />);
    expect(screen.getByRole('img', { name: 'Pause' }).getAttribute('src')).toContain('pause.svg');
  });

  test('toggles on click', () => {
    const toggle = jest.fn();
    render(<PlayButton handlePlayPause={toggle} isPaused />);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Play/Pause' }));
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  test('swallows key presses so global shortcuts and the browser default do not double-trigger', () => {
    const toggle = jest.fn();
    const bubbled = jest.fn();
    render(<div onKeyDown={bubbled}><PlayButton handlePlayPause={toggle} isPaused /></div>);
    const notPrevented = fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(notPrevented).toBe(false); // preventDefault was called
    expect(bubbled).not.toHaveBeenCalled();
    expect(toggle).not.toHaveBeenCalled();
  });
});

describe('TrainingStatus', () => {
  const refs = (silent = false, measures = 1, mute = 0) => ({
    isSilencePhaseRef: { current: silent }, measureCountRef: { current: measures }, muteMeasureCountRef: { current: mute }
  });
  const props = { measuresUntilMute: 4, muteDurationMeasures: 2 };

  test('renders nothing when both training modes are off', () => {
    const { container } = render(<TrainingStatus macroMode={0} speedMode={0} {...refs()} {...props} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('macro fixed silence: label, measure counter, no silence suffix', () => {
    render(<TrainingStatus macroMode={1} speedMode={0} {...refs(false, 3)} {...props} />);
    expect(screen.getByRole('heading', { name: 'Training Active' })).toBeInTheDocument();
    expect(screen.getByText(/Macro-Timing: Fixed Silence/)).toBeInTheDocument();
    expect(screen.getByText(/Measures: 3\/4/)).toBeInTheDocument();
    expect(screen.queryByText('(Silent)')).toBeNull();
    expect(screen.queryByText(/Silence: /)).toBeNull();
    expect(screen.queryByText(/Speed Training/)).toBeNull();
  });

  test('macro random silence while silent shows the silent marker and the silence counter', () => {
    render(<TrainingStatus macroMode={2} speedMode={0} {...refs(true, 4, 1)} {...props} />);
    expect(screen.getByText(/Macro-Timing: Random Silence/)).toBeInTheDocument();
    expect(screen.getByText('(Silent)')).toBeInTheDocument();
    expect(screen.getByText(/Silence: 1\/2/)).toBeInTheDocument();
  });

  test('speed training only', () => {
    render(<TrainingStatus macroMode={0} speedMode={1} {...refs()} {...props} />);
    expect(screen.getByText('Speed Training: Auto Increase')).toBeInTheDocument();
    expect(screen.queryByText(/Macro-Timing/)).toBeNull();
  });
});
