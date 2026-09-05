import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MultiCircleMetronome from '../../components/metronome/MultiCircleMode/MultiCircleMetronome';
import useMultiCircleMetronomeLogic from '../../components/metronome/MultiCircleMode/hooks/useMultiCircleMetronomeLogic';

jest.mock('../../components/Training/withTrainingContainer', () => Component => Component);
jest.mock('../../components/metronome/MultiCircleMode/hooks/useMultiCircleMetronomeLogic', () => jest.fn(() => ({})));

const props = { tempo: 120, setTempo: jest.fn(), isPaused: true, setIsPaused: jest.fn(), swing: 0, setSwing: jest.fn(), volume: 0.5, setVolume: jest.fn() };

test('adds multiple circles, edits a later circle, and removes it without losing the sequence', () => {
  render(<MultiCircleMetronome {...props} />);
  const add = screen.getByRole('button', { name: 'Add rhythm circle' });
  for (let i = 0; i < 4; i++) fireEvent.click(add);
  expect(screen.getAllByRole('button', { name: /Select circle \d+ for editing/ })).toHaveLength(6);
  expect(add).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Select circle 6 for editing' }));
  fireEvent.click(screen.getByRole('button', { name: '7 beats per bar' }));
  let settings = useMultiCircleMetronomeLogic.mock.calls.at(-1)[0].circleSettings;
  expect(settings).toHaveLength(6);
  expect(settings[5].subdivisions).toBe(7);
  expect(settings[0].subdivisions).toBe(4);
  fireEvent.click(screen.getByRole('button', { name: 'Remove circle 6' }));
  settings = useMultiCircleMetronomeLogic.mock.calls.at(-1)[0].circleSettings;
  expect(settings).toHaveLength(5);
  expect(screen.getByRole('button', { name: 'Select circle 1 for editing' })).toHaveAttribute('aria-pressed', 'true');
});

test('the shared minus button preserves the final circle', () => {
  render(<MultiCircleMetronome {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove circle 1' }));
  expect(screen.getByRole('button', { name: 'Remove circle 1' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Add rhythm circle' })).toBeEnabled();
});
