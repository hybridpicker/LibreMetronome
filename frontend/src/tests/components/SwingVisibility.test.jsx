import { fireEvent, render, screen } from '@testing-library/react';
import MetronomeControls from '../../components/metronome/Controls/MetronomeControls';

test.each(['circle', 'grid', 'multi'])('Swing stays editable for odd bars in %s', (mode) => {
  const setSwing = jest.fn();
  const props = { mode, subdivisions: 4, beatMode: 'quarter', swing: 0.2,
    tempo: 120, volume: 0.5, setSwing, setTempo: jest.fn(), setVolume: jest.fn(),
    setBeatMode: jest.fn(), setSubdivisions: jest.fn() };
  const { rerender } = render(<MetronomeControls {...props} />);
  rerender(<MetronomeControls {...props} subdivisions={3} />);
  const slider = screen.getByRole('slider', { name: 'Swing' });
  expect(slider).toBeEnabled();
  expect(slider).toHaveValue('0.2');
  fireEvent.change(slider, { target: { value: '0' } });
  expect(setSwing).toHaveBeenCalledWith(0);
});
