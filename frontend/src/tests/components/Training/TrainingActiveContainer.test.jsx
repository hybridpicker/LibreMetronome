import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TrainingActiveContainer from '../../../components/Training/TrainingActiveContainer';

const baseProps = (over = {}) => ({
  macroMode: 1,
  speedMode: 0,
  isSilencePhaseRef: { current: false },
  measureCountRef: { current: 0 },
  measuresUntilMute: 4,
  muteMeasureCountRef: { current: 0 },
  muteDurationMeasures: 2,
  tempoIncreasePercent: 5,
  measuresUntilSpeedUp: 8,
  isPaused: false,
  forceUpdate: 0,
  ...over
});

const capture = (type) => {
  const handler = jest.fn();
  window.addEventListener(type, handler);
  return { handler, off: () => window.removeEventListener(type, handler) };
};

describe('TrainingActiveContainer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete window.isSilencePhaseRef;
    window.innerWidth = 1024;
  });

  describe('visibility', () => {
    test('renders nothing when both modes are off', () => {
      const { container } = render(<TrainingActiveContainer {...baseProps({ macroMode: 0, speedMode: 0 })} />);
      expect(container).toBeEmptyDOMElement();
    });

    test('renders only the macro section for macro training', () => {
      render(<TrainingActiveContainer {...baseProps()} />);
      expect(screen.getByRole('heading', { name: 'Training Mode Active' })).toBeInTheDocument();
      expect(screen.getByText('Macro-Timing')).toBeInTheDocument();
      expect(screen.queryByText('Speed Training')).not.toBeInTheDocument();
    });

    test('renders only the speed section for speed training', () => {
      render(<TrainingActiveContainer {...baseProps({ macroMode: 0, speedMode: 1 })} />);
      expect(screen.getByText('Speed Training')).toBeInTheDocument();
      expect(screen.queryByText('Macro-Timing')).not.toBeInTheDocument();
    });

    test('renders both sections when both modes are on', () => {
      render(<TrainingActiveContainer {...baseProps({ speedMode: 2 })} />);
      expect(screen.getByText('Macro-Timing')).toBeInTheDocument();
      expect(screen.getByText('Speed Training')).toBeInTheDocument();
    });

    test('shows the R shortcut hint on desktop and hides it on mobile', () => {
      const { unmount } = render(<TrainingActiveContainer {...baseProps()} />);
      expect(screen.getByText(/to toggle training mode settings/)).toBeInTheDocument();
      unmount();
      window.innerWidth = 768;
      render(<TrainingActiveContainer {...baseProps()} />);
      expect(screen.queryByText(/to toggle training mode settings/)).not.toBeInTheDocument();
    });

    test('reacts to window resize for the mobile breakpoint', () => {
      render(<TrainingActiveContainer {...baseProps()} />);
      act(() => { window.innerWidth = 500; window.dispatchEvent(new Event('resize')); });
      expect(screen.queryByText(/to toggle training mode settings/)).not.toBeInTheDocument();
    });
  });

  describe('mode toggle buttons', () => {
    test.each([
      [{ macroMode: 1 }, 'Fixed Silence', { type: 'macroMode', newValue: 2 }],
      [{ macroMode: 2 }, 'Random Silence', { type: 'macroMode', newValue: 1 }],
      [{ macroMode: 0, speedMode: 1 }, 'Auto Increase', { type: 'speedMode', newValue: 2 }],
      [{ macroMode: 0, speedMode: 2 }, 'Manual Increase', { type: 'speedMode', newValue: 1 }]
    ])('%j: "%s" button dispatches %j', (modes, label, detail) => {
      const { handler, off } = capture('training-mode-toggle');
      render(<TrainingActiveContainer {...baseProps(modes)} />);
      fireEvent.click(screen.getByRole('button', { name: label }));
      off();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toEqual(detail);
    });
  });

  describe('summary text', () => {
    test('macro summary lists play and silent measures as editable buttons', () => {
      render(<TrainingActiveContainer {...baseProps({ measuresUntilMute: 6, muteDurationMeasures: 3 })} />);
      expect(screen.getByRole('button', { name: 'Play: 6 measures' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Silent: 3 measures' })).toBeInTheDocument();
    });

    test('auto speed summary', () => {
      render(<TrainingActiveContainer {...baseProps({ macroMode: 0, speedMode: 1, measuresUntilSpeedUp: 12, tempoIncreasePercent: 7 })} />);
      expect(screen.getByText('Auto Speed Increase')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Every 12 measures' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '7%' })).toBeInTheDocument();
    });

    test('manual speed summary', () => {
      render(<TrainingActiveContainer {...baseProps({ macroMode: 0, speedMode: 2, tempoIncreasePercent: 9 })} />);
      expect(screen.getByText('Manual Speed Increase')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '9%' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Every/ })).not.toBeInTheDocument();
    });
  });

  describe('inline parameter editing', () => {
    // [description, props, trigger button name, edit header, event type, initial value]
    const cases = [
      ['play phase', {}, 'Play: 4 measures', 'Play Phase Duration', 'measuresUntilMute', '4'],
      ['silent phase', {}, 'Silent: 2 measures', 'Silent Phase Duration', 'muteDurationMeasures', '2'],
      ['measures between increases', { macroMode: 0, speedMode: 1 }, 'Every 8 measures', 'Measures Between Tempo Increases', 'measuresUntilSpeedUp', '8'],
      ['tempo increase (auto)', { macroMode: 0, speedMode: 1 }, '5%', 'Tempo Increase Amount', 'tempoIncreasePercent', '5'],
      ['tempo increase (manual)', { macroMode: 0, speedMode: 2 }, '5%', 'Tempo Increase Amount', 'tempoIncreasePercent', '5']
    ];

    describe.each(cases)('%s', (_name, props, trigger, header, type, initial) => {
      const open = () => {
        render(<TrainingActiveContainer {...baseProps(props)} />);
        fireEvent.click(screen.getByRole('button', { name: trigger }));
        return screen.getByRole('spinbutton');
      };

      test('opens an editor prefilled with the current value and focused', () => {
        const input = open();
        expect(screen.getByText(header)).toBeInTheDocument();
        expect(input).toHaveValue(Number(initial));
        expect(input).toHaveFocus();
      });

      test('Enter dispatches training-param-update and closes the editor', () => {
        const { handler, off } = capture('training-param-update');
        const input = open();
        fireEvent.change(input, { target: { value: '7' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        off();
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail).toEqual({ type, newValue: 7 });
        expect(screen.queryByText(header)).not.toBeInTheDocument();
      });

      test('Save button dispatches the same event', () => {
        const { handler, off } = capture('training-param-update');
        const input = open();
        fireEvent.change(input, { target: { value: '3' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        off();
        expect(handler.mock.calls[0][0].detail).toEqual({ type, newValue: 3 });
        expect(screen.queryByText(header)).not.toBeInTheDocument();
      });

      test('Escape cancels without dispatching', () => {
        const { handler, off } = capture('training-param-update');
        const input = open();
        fireEvent.change(input, { target: { value: '9' } });
        fireEvent.keyDown(input, { key: 'Escape' });
        off();
        expect(handler).not.toHaveBeenCalled();
        expect(screen.queryByText(header)).not.toBeInTheDocument();
      });

      test('Cancel button closes without dispatching', () => {
        const { handler, off } = capture('training-param-update');
        open();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        off();
        expect(handler).not.toHaveBeenCalled();
        expect(screen.queryByText(header)).not.toBeInTheDocument();
      });

      test.each([['0'], ['-3'], ['']])('rejects invalid value "%s" and keeps the editor open', (bad) => {
        const { handler, off } = capture('training-param-update');
        const input = open();
        fireEvent.change(input, { target: { value: bad } });
        fireEvent.keyDown(input, { key: 'Enter' });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        off();
        expect(handler).not.toHaveBeenCalled();
        expect(screen.getByText(header)).toBeInTheDocument();
      });

      test('other keys neither save nor cancel', () => {
        const { handler, off } = capture('training-param-update');
        const input = open();
        fireEvent.keyDown(input, { key: 'a' });
        off();
        expect(handler).not.toHaveBeenCalled();
        expect(screen.getByText(header)).toBeInTheDocument();
      });
    });

    test('tempo increase is limited to 20 percent', () => {
      const { handler, off } = capture('training-param-update');
      render(<TrainingActiveContainer {...baseProps({ macroMode: 0, speedMode: 1 })} />);
      fireEvent.click(screen.getByRole('button', { name: '5%' }));
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('max', '20');
      fireEvent.change(input, { target: { value: '21' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(handler).not.toHaveBeenCalled();
      fireEvent.change(input, { target: { value: '20' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      off();
      expect(handler.mock.calls[0][0].detail).toEqual({ type: 'tempoIncreasePercent', newValue: 20 });
    });

    test('values with a fractional part are truncated', () => {
      const { handler, off } = capture('training-param-update');
      render(<TrainingActiveContainer {...baseProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Play: 4 measures' }));
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '5.9' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      off();
      expect(handler.mock.calls[0][0].detail.newValue).toBe(5);
    });
  });

  describe('state synchronisation wiring', () => {
    const watched = ['metronome-beat', 'metronome-measure-boundary', 'silent-beat-played',
      'training-measure-update', 'force-training-update'];

    test('subscribes to the training events while running and unsubscribes on unmount', () => {
      const add = jest.spyOn(window, 'addEventListener');
      const remove = jest.spyOn(window, 'removeEventListener');
      const addDoc = jest.spyOn(document, 'addEventListener');
      const removeDoc = jest.spyOn(document, 'removeEventListener');
      const { unmount } = render(<TrainingActiveContainer {...baseProps()} />);
      watched.forEach((t) => expect(add.mock.calls.map((c) => c[0])).toContain(t));
      expect(addDoc.mock.calls.map((c) => c[0])).toContain('training-state-changed');
      unmount();
      watched.forEach((t) => expect(remove.mock.calls.map((c) => c[0])).toContain(t));
      expect(removeDoc.mock.calls.map((c) => c[0])).toContain('training-state-changed');
    });

    test('does not subscribe while paused', () => {
      const add = jest.spyOn(window, 'addEventListener');
      render(<TrainingActiveContainer {...baseProps({ isPaused: true })} />);
      expect(add.mock.calls.map((c) => c[0])).not.toContain('metronome-beat');
    });

    test('unpausing subscribes, pausing again removes the subscriptions', () => {
      const add = jest.spyOn(window, 'addEventListener');
      const remove = jest.spyOn(window, 'removeEventListener');
      const props = baseProps({ isPaused: true });
      const { rerender } = render(<TrainingActiveContainer {...props} />);
      rerender(<TrainingActiveContainer {...props} isPaused={false} />);
      expect(add.mock.calls.map((c) => c[0])).toContain('metronome-beat');
      rerender(<TrainingActiveContainer {...props} isPaused />);
      expect(remove.mock.calls.map((c) => c[0])).toContain('metronome-beat');
    });

    test('processes every supported event shape, with and without detail, without errors', () => {
      window.isSilencePhaseRef = { current: true };
      render(<TrainingActiveContainer {...baseProps()} />);
      const fire = (target, type, detail) => act(() => {
        target.dispatchEvent(new CustomEvent(type, detail === undefined ? undefined : { detail }));
      });
      fire(window, 'metronome-beat');
      fire(window, 'metronome-beat', { isSilencePhase: true });
      fire(window, 'silent-beat-played', { isSilencePhase: false });
      fire(window, 'metronome-measure-boundary', { isSilencePhase: true, measureCount: 3, muteMeasureCount: 1 });
      fire(window, 'metronome-measure-boundary', {});
      fire(window, 'training-measure-update', { silencePhase: true });
      fire(window, 'training-measure-update');
      fire(document, 'training-state-changed', { silencePhase: false });
      fire(document, 'training-state-changed');
      fire(window, 'force-training-update');
      act(() => { jest.advanceTimersByTime(1000); });
      expect(screen.getByRole('heading', { name: 'Training Mode Active' })).toBeInTheDocument();
    });

    test('works without ref objects and reacts to forceUpdate and mode reset', () => {
      const props = baseProps({ isSilencePhaseRef: undefined, measureCountRef: undefined, muteMeasureCountRef: undefined });
      const { rerender } = render(<TrainingActiveContainer {...props} />);
      rerender(<TrainingActiveContainer {...props} forceUpdate={1} />);
      rerender(<TrainingActiveContainer {...baseProps({ forceUpdate: 2 })} />);
      rerender(<TrainingActiveContainer {...baseProps({ forceUpdate: undefined })} />);
      rerender(<TrainingActiveContainer {...baseProps({ macroMode: 0, speedMode: 0 })} />);
      act(() => { jest.advanceTimersByTime(250); });
      expect(screen.queryByRole('heading', { name: 'Training Mode Active' })).not.toBeInTheDocument();
    });

    test('the 250 ms polling interval is cleared on unmount', () => {
      const { unmount } = render(<TrainingActiveContainer {...baseProps()} />);
      expect(jest.getTimerCount()).toBe(1);
      unmount();
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
