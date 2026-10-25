import { fireEvent, render, screen } from '@testing-library/react';
import MetronomeControls from '../../../components/metronome/Controls/MetronomeControls';

const setup = (props = {}) => {
  const handlers = {
    setBeatMode: jest.fn(),
    setSubdivisions: jest.fn(),
    setSwing: jest.fn(),
    setVolume: jest.fn(),
    setTempo: jest.fn()
  };
  render(
    <MetronomeControls
      mode="grid"
      beatMode="quarter"
      subdivisions={4}
      swing={0.1}
      volume={0.5}
      tempo={120}
      {...handlers}
      {...props}
    />
  );
  return handlers;
};

const editAndCommit = (label, text) => {
  fireEvent.click(screen.getByRole('button', { name: `Edit ${label}` }));
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('MetronomeControls layout per mode', () => {
  test('grid mode shows note value, beats per bar and all three sliders', () => {
    setup({ mode: 'grid' });
    expect(screen.getByRole('heading', { name: 'Note value' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Beats per bar' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Tempo' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Swing' })).toBeEnabled();
  });

  test('analog mode hides beats per bar and disables swing with an explanation', () => {
    setup({ mode: 'analog' });
    expect(screen.getByRole('heading', { name: 'Note value' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Beats per bar' })).toBeNull();
    expect(screen.getByRole('slider', { name: 'Swing' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit Swing' })).toBeDisabled();
    expect(screen.getByText('(Swing is not available in pendulum mode)')).toBeInTheDocument();
  });

  test('multi mode shows neither note value nor beats per bar', () => {
    setup({ mode: 'multi' });
    expect(screen.queryByRole('heading', { name: 'Note value' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Beats per bar' })).toBeNull();
    expect(screen.getByRole('slider', { name: 'Tempo' })).toBeInTheDocument();
  });
});

describe('MetronomeControls wiring', () => {
  test('note selector reports the beat mode', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Eighth Notes' }));
    expect(h.setBeatMode).toHaveBeenCalledWith('eighth');
  });

  test('subdivision selector reports the number of beats', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: '6 beats per bar' }));
    expect(h.setSubdivisions).toHaveBeenCalledWith(6);
  });

  test('tempo slider: range 15..240, step buttons, BPM formatting and parsing', () => {
    const h = setup({ tempo: 120 });
    const slider = screen.getByRole('slider', { name: 'Tempo' });
    expect(slider).toHaveAttribute('min', '15');
    expect(slider).toHaveAttribute('max', '240');
    expect(screen.getByRole('button', { name: 'Edit Tempo' })).toHaveTextContent('120 bpm');
    fireEvent.click(screen.getByRole('button', { name: 'Tempo plus 1' }));
    expect(h.setTempo).toHaveBeenLastCalledWith(121);
    editAndCommit('Tempo', '300 BPM');
    expect(h.setTempo).toHaveBeenLastCalledWith(240);
  });

  test('volume slider shows percent and parses percent back to 0..1', () => {
    const h = setup({ volume: 0.5 });
    expect(screen.getByRole('button', { name: 'Edit Volume' })).toHaveTextContent('50%');
    editAndCommit('Volume', '80%');
    expect(h.setVolume).toHaveBeenCalledWith(0.8);
    editAndCommit('Volume', '250%');
    expect(h.setVolume).toHaveBeenLastCalledWith(1);
  });

  test('swing slider shows 0..50 % as 0..100 % and parses it back', () => {
    const h = setup({ swing: 0.25 });
    expect(screen.getByRole('button', { name: 'Edit Swing' })).toHaveTextContent('50%');
    editAndCommit('Swing', '100%');
    expect(h.setSwing).toHaveBeenCalledWith(0.5);
    editAndCommit('Swing', '40');
    expect(h.setSwing).toHaveBeenLastCalledWith(0.2);
  });

  test('the disabled analog swing slider never calls setSwing', () => {
    const h = setup({ mode: 'analog' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Swing' }));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(h.setSwing).not.toHaveBeenCalled();
  });
});
