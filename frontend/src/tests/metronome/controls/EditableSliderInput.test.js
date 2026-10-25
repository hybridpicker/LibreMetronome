/* eslint-disable testing-library/no-container, testing-library/no-node-access, testing-library/render-result-naming-convention --
   These tests assert SVG/canvas geometry, CSS state classes and img sources that have no accessible role. */
import { fireEvent, render, screen } from '@testing-library/react';
import EditableSliderInput from '../../../components/metronome/Controls/EditableSliderInput';

const setup = (props = {}) => {
  const setValue = jest.fn();
  const utils = render(
    <EditableSliderInput label="Tempo" value={120} setValue={setValue} min={15} max={240} step={1} {...props} />
  );
  return { setValue, ...utils };
};

const bpm = {
  formatter: (v) => `${v} BPM`,
  parser: (v) => parseInt(v.replace(/\D/g, ''), 10)
};

describe('EditableSliderInput display', () => {
  test('a plain value without unit is shown as is', () => {
    setup({ label: 'Count' });
    expect(screen.getByRole('button', { name: 'Edit Count' })).toHaveTextContent('Count120');
  });

  test('"<number> BPM" is drawn as a tempo mark with a lower-case unit', () => {
    const { container } = setup({ ...bpm });
    const button = screen.getByRole('button', { name: 'Edit Tempo' });
    expect(container.querySelector('.tempo-note')).not.toBeNull();
    expect(button).toHaveTextContent('Tempo=120 bpm');
    expect(button.querySelector('.slider-value-number')).toHaveTextContent('120');
    expect(button.querySelector('.slider-value-unit')).toHaveTextContent('bpm');
  });

  test('another "<number> <unit>" keeps the unit as written and has no tempo note', () => {
    const { container } = setup({ label: 'Gap', formatter: (v) => `${v} ms` });
    expect(container.querySelector('.tempo-note')).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit Gap' })).toHaveTextContent('Gap120 ms');
    expect(container.querySelector('.slider-value-unit')).toHaveTextContent('ms');
  });

  test('percent values (no space-separated unit) fall back to the plain label value', () => {
    const { container } = setup({ label: 'Volume', formatter: (v) => `${v}%` });
    expect(container.querySelector('.slider-value-number')).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit Volume' })).toHaveTextContent('Volume120%');
  });

  test('className and disabled state are reflected on the wrapper', () => {
    const { container } = setup({ className: 'tempo-slider', disabled: true });
    const root = container.querySelector('.editable-slider');
    expect(root).toHaveClass('tempo-slider');
    expect(root).toHaveClass('disabled');
    expect(screen.getByRole('button', { name: 'Edit Tempo' })).toBeDisabled();
    expect(screen.getByRole('slider', { name: 'Tempo' })).toBeDisabled();
  });

  test('the slider carries min, max, step and value', () => {
    setup({ min: 15, max: 240, step: 5 });
    const slider = screen.getByRole('slider', { name: 'Tempo' });
    expect(slider).toHaveAttribute('min', '15');
    expect(slider).toHaveAttribute('max', '240');
    expect(slider).toHaveAttribute('step', '5');
    expect(slider).toHaveValue('120');
  });
});

describe('EditableSliderInput slider', () => {
  test('moving the range reports a float', () => {
    const { setValue } = setup({ min: 0, max: 1, step: 0.01, value: 0.5 });
    fireEvent.change(screen.getByRole('slider', { name: 'Tempo' }), { target: { value: '0.25' } });
    expect(setValue).toHaveBeenCalledWith(0.25);
  });
});

describe('EditableSliderInput text editing', () => {
  test('click opens a text field pre-filled with the formatted value', () => {
    setup({ ...bpm });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Tempo' }));
    const input = screen.getByRole('textbox', { name: 'Edit Tempo value' });
    expect(input).toHaveValue('120 BPM');
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('inputmode', 'decimal');
    expect(screen.queryByRole('button', { name: 'Edit Tempo' })).toBeNull();
  });

  test('Enter commits a parsed value and closes the editor', () => {
    const { setValue } = setup({ ...bpm });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Tempo' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '90 BPM' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(setValue).toHaveBeenCalledWith(90);
    expect(screen.getByRole('button', { name: 'Edit Tempo' })).toBeInTheDocument();
  });

  test('blur commits as well', () => {
    const { setValue } = setup({ ...bpm });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Tempo' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.blur(input);
    expect(setValue).toHaveBeenCalledWith(100);
  });

  test.each([
    ['below min', '3', 15],
    ['at min', '15', 15],
    ['at max', '240', 240],
    ['above max', '999', 240]
  ])('value %s is clamped to the range', (_name, typed, expected) => {
    const { setValue } = setup({ ...bpm });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Tempo' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: typed } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(setValue).toHaveBeenCalledWith(expected);
  });

  test('Escape cancels without calling setValue', () => {
    const { setValue } = setup({ ...bpm });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Tempo' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '77' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(setValue).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Edit Tempo' })).toBeInTheDocument();
  });

  test('other keys neither commit nor close', () => {
    const { setValue } = setup({ ...bpm });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Tempo' }));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'a' });
    expect(setValue).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('unparseable text (NaN) closes the editor but keeps the old value', () => {
    const { setValue } = setup({ ...bpm });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Tempo' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'fast' } });
    fireEvent.blur(input);
    expect(setValue).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Edit Tempo' })).toBeInTheDocument();
  });

  test('a throwing parser closes the editor without calling setValue', () => {
    const { setValue } = setup({
      parser: () => { throw new Error('bad input'); }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Tempo' }));
    fireEvent.blur(screen.getByRole('textbox'));
    expect(setValue).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Edit Tempo' })).toBeInTheDocument();
  });

  test('without a parser the raw text is used (string, clamped via Math.max/min)', () => {
    const { setValue } = setup({ min: 0, max: 100 });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Tempo' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '42' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(setValue).toHaveBeenCalledWith(42);
  });

  test('a disabled slider cannot be opened for editing', () => {
    setup({ disabled: true });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Tempo' }));
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  test('re-opening the editor re-reads the current value', () => {
    const { rerender } = setup({ ...bpm });
    rerender(
      <EditableSliderInput label="Tempo" value={130} setValue={() => {}} min={15} max={240} step={1} {...bpm} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit Tempo' }));
    expect(screen.getByRole('textbox')).toHaveValue('130 BPM');
  });
});

describe('EditableSliderInput step buttons', () => {
  test('are absent unless requested', () => {
    setup();
    expect(screen.queryByRole('button', { name: /minus|plus/ })).toBeNull();
  });

  test('minus and plus nudge by step and name the step', () => {
    const { setValue } = setup({ stepButtons: true, step: 5 });
    fireEvent.click(screen.getByRole('button', { name: 'Tempo minus 5' }));
    expect(setValue).toHaveBeenLastCalledWith(115);
    fireEvent.click(screen.getByRole('button', { name: 'Tempo plus 5' }));
    expect(setValue).toHaveBeenLastCalledWith(125);
  });

  test('a missing step defaults to 1', () => {
    const { setValue } = setup({ stepButtons: true, step: undefined });
    fireEvent.click(screen.getByRole('button', { name: 'Tempo plus 1' }));
    expect(setValue).toHaveBeenCalledWith(121);
  });

  test('fractional steps are rounded to two decimals', () => {
    const { setValue } = setup({ stepButtons: true, step: 0.01, value: 0.29, min: 0, max: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Tempo plus 0.01' }));
    expect(setValue).toHaveBeenCalledWith(0.3); // 0.29 + 0.01 is 0.30000000000000004
  });

  test('minus is disabled at min, plus at max', () => {
    const atMin = setup({ stepButtons: true, value: 15 });
    expect(screen.getByRole('button', { name: 'Tempo minus 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tempo plus 1' })).toBeEnabled();
    atMin.unmount();
    setup({ stepButtons: true, value: 240 });
    expect(screen.getByRole('button', { name: 'Tempo plus 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tempo minus 1' })).toBeEnabled();
  });

  test('both are disabled when the slider is disabled', () => {
    setup({ stepButtons: true, disabled: true });
    expect(screen.getByRole('button', { name: 'Tempo minus 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tempo plus 1' })).toBeDisabled();
  });

  test('nudging beyond the range is clamped when the value is just inside', () => {
    const { setValue } = setup({ stepButtons: true, value: 238, step: 5 });
    fireEvent.click(screen.getByRole('button', { name: 'Tempo plus 5' }));
    expect(setValue).toHaveBeenCalledWith(240);
  });
});
