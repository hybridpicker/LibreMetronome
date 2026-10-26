/* eslint-disable testing-library/no-container, testing-library/no-node-access, testing-library/render-result-naming-convention --
   These tests assert SVG/canvas geometry, CSS state classes and img sources that have no accessible role. */
import { fireEvent, render, screen } from '@testing-library/react';
import NoteSelector from '../../../components/metronome/Controls/NoteSelector';
import SubdivisionSelector from '../../../components/metronome/Controls/SubdivisionSelector';
import RangeInput from '../../../components/metronome/Controls/RangeInput';
import AccelerateButton from '../../../components/metronome/Controls/AccelerateButton';

describe('NoteSelector', () => {
  test('renders nothing when hidden', () => {
    const { container } = render(<NoteSelector beatMode="quarter" onSelect={() => {}} hideOptions />);
    expect(container).toBeEmptyDOMElement();
  });

  test('marks the active note value with aria-pressed', () => {
    const { rerender } = render(<NoteSelector beatMode="quarter" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'Quarter Notes' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Eighth Notes' })).toHaveAttribute('aria-pressed', 'false');
    rerender(<NoteSelector beatMode="eighth" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'Quarter Notes' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Eighth Notes' })).toHaveAttribute('aria-pressed', 'true');
  });

  test.each([
    ['Quarter Notes', 'quarter', 1],
    ['Eighth Notes', 'eighth', 2]
  ])('clicking %s selects it and broadcasts beat-mode-change', (name, mode, multiplier) => {
    const onSelect = jest.fn();
    const listener = jest.fn();
    window.addEventListener('beat-mode-change', listener);
    render(<NoteSelector beatMode="quarter" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name }));
    window.removeEventListener('beat-mode-change', listener);
    expect(onSelect).toHaveBeenCalledWith(mode);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual({ beatMode: mode, beatMultiplier: multiplier });
  });

  test('icons are decorative', () => {
    render(<NoteSelector beatMode="quarter" onSelect={() => {}} />);
    screen.getAllByRole('button').forEach((b) => {
      expect(b.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    });
  });
});

describe('SubdivisionSelector', () => {
  test('renders nothing when hidden', () => {
    const { container } = render(<SubdivisionSelector subdivisions={4} onSelect={() => {}} hideOptions />);
    expect(container).toBeEmptyDOMElement();
  });

  test('nine chips named 1 beat / n beats per bar, only the active one pressed', () => {
    render(<SubdivisionSelector subdivisions={4} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: '1 beat per bar' })).toBeInTheDocument();
    for (let n = 2; n <= 9; n += 1) {
      expect(screen.getByRole('button', { name: `${n} beats per bar` })).toHaveAttribute('aria-pressed', String(n === 4));
    }
  });

  test('clicking a chip reports its number', () => {
    const onSelect = jest.fn();
    render(<SubdivisionSelector subdivisions={4} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: '7 beats per bar' }));
    expect(onSelect).toHaveBeenCalledWith(7);
  });

  test('stepper shows the count and steps by one', () => {
    const onSelect = jest.fn();
    render(<SubdivisionSelector subdivisions={4} onSelect={onSelect} />);
    expect(screen.getByRole('group', { name: 'Beats per bar' })).toHaveTextContent('4');
    fireEvent.click(screen.getByRole('button', { name: 'Fewer beats per bar' }));
    expect(onSelect).toHaveBeenLastCalledWith(3);
    fireEvent.click(screen.getByRole('button', { name: 'More beats per bar' }));
    expect(onSelect).toHaveBeenLastCalledWith(5);
  });

  test('stepper is bounded: minus disabled at 1, plus disabled at 9', () => {
    const { rerender } = render(<SubdivisionSelector subdivisions={1} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'Fewer beats per bar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'More beats per bar' })).toBeEnabled();
    rerender(<SubdivisionSelector subdivisions={9} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'More beats per bar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Fewer beats per bar' })).toBeEnabled();
  });

  test('the style prop goes to the chip container', () => {
    render(<SubdivisionSelector subdivisions={4} onSelect={() => {}} style={{ marginTop: '7px' }} />);
    expect(screen.getByTestId('subdivision-selector')).toHaveStyle({ marginTop: '7px' });
  });
});

describe('RangeInput', () => {
  const progress = (container) => container.querySelector('.range-field').style.getPropertyValue('--range-p');

  test.each([
    [15, 15, 240, '0'],
    [240, 15, 240, '1'],
    [127.5, 15, 240, '0.5'],
    [-50, 0, 100, '0'],
    [500, 0, 100, '1']
  ])('value %s in [%s, %s] gives progress %s', (value, min, max, expected) => {
    const { container } = render(<RangeInput value={value} min={min} max={max} step={1} onChange={() => {}} />);
    expect(progress(container)).toBe(expected);
  });

  test('a degenerate range (min === max) has progress 0', () => {
    const { container } = render(<RangeInput value={5} min={5} max={5} step={1} onChange={() => {}} />);
    expect(progress(container)).toBe('0');
  });

  test('passes className and extra props to the input and marks disabled', () => {
    const { container } = render(
      <RangeInput value={1} min={0} max={2} step={1} className="slider" aria-label="X" disabled onChange={() => {}} />
    );
    const input = screen.getByRole('slider', { name: 'X' });
    expect(input).toHaveClass('slider');
    expect(input).toBeDisabled();
    expect(container.querySelector('.range-field')).toHaveClass('is-disabled');
    expect(container.querySelector('.range-progress')).toHaveAttribute('aria-hidden', 'true');
  });

  test('is not marked disabled by default and forwards change events', () => {
    const onChange = jest.fn();
    const { container } = render(<RangeInput value={1} min={0} max={2} step={1} aria-label="X" onChange={onChange} />);
    expect(container.querySelector('.range-field')).not.toHaveClass('is-disabled');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('AccelerateButton', () => {
  test.each([[0], [3], [undefined], ['0']])('renders nothing for speedMode %p', (speedMode) => {
    const { container } = render(<AccelerateButton onClick={() => {}} speedMode={speedMode} />);
    expect(container).toBeEmptyDOMElement();
  });

  test.each([
    [1, 'Auto'],
    ['1', 'Auto'],
    [2, 'Manual'],
    ['2', 'Manual']
  ])('speedMode %p shows the %s button and fires onClick', (speedMode, text) => {
    const onClick = jest.fn();
    render(<AccelerateButton onClick={onClick} speedMode={speedMode} />);
    const button = screen.getByRole('button', { name: `Accelerate tempo in ${text} Speed Training Mode` });
    expect(button).toHaveTextContent('Accelerate +10 BPM');
    expect(button).toHaveAttribute('title', `Increase tempo by max 10 BPM (up to 180 BPM max) in ${text} Speed Training Mode`);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
