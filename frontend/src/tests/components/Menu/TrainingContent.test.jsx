import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import TrainingContent from '../../../components/Menu/TrainingContent';

const settings = (over = {}) => ({
  macroMode: 0,
  speedMode: 0,
  measuresUntilMute: 4,
  muteDurationMeasures: 2,
  muteProbability: 0.3,
  measuresUntilSpeedUp: 8,
  tempoIncreasePercent: 5,
  ...over
});

const setup = (over = {}) => {
  const props = {
    trainingSettings: settings(over),
    setTrainingSettings: jest.fn(),
    setMode: jest.fn(),
    setIsPaused: jest.fn(),
    onClose: jest.fn()
  };
  const utils = render(<TrainingContent {...props} />);
  return { props, ...utils };
};

const macroPanel = () => screen.getAllByRole('tabpanel')[0];
const speedPanel = () => screen.getAllByRole('tabpanel')[1];
const apply = () => fireEvent.click(screen.getByRole('button', { name: 'Apply Settings' }));

describe('TrainingContent', () => {
  test('starts on the macro-timing tab', () => {
    setup();
    expect(screen.getByRole('tab', { name: /Macro-Timing/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Speed Training/ })).toHaveAttribute('aria-selected', 'false');
    expect(macroPanel()).toHaveClass('active');
    expect(speedPanel()).not.toHaveClass('active');
  });

  test('switches between the two sections', () => {
    setup();
    fireEvent.click(screen.getByRole('tab', { name: /Speed Training/ }));
    expect(screen.getByRole('tab', { name: /Speed Training/ })).toHaveAttribute('aria-selected', 'true');
    expect(speedPanel()).toHaveClass('active');
    expect(macroPanel()).not.toHaveClass('active');
    fireEvent.click(screen.getByRole('tab', { name: /Macro-Timing/ }));
    expect(macroPanel()).toHaveClass('active');
  });

  test('shows no option blocks while both modes are off', () => {
    setup();
    expect(screen.queryByText('Measures until mute:')).not.toBeInTheDocument();
    expect(screen.queryByText('Mute probability:')).not.toBeInTheDocument();
    expect(screen.queryByText('Tempo increase (%):')).not.toBeInTheDocument();
  });

  test('fixed silence mode shows the two measure inputs with the current values', () => {
    setup({ macroMode: 1 });
    expect(screen.getByLabelText(/Measures until mute/)).toHaveValue(4);
    expect(screen.getByLabelText(/Mute duration/)).toHaveValue(2);
    expect(screen.queryByText('Mute probability:')).not.toBeInTheDocument();
  });

  test('random silence mode shows the probability slider and value', () => {
    setup({ macroMode: 2 });
    expect(within(macroPanel()).getByRole('slider')).toHaveValue('0.3');
    expect(screen.getByText('0.3')).toBeInTheDocument();
    expect(screen.queryByText('Measures until mute:')).not.toBeInTheDocument();
  });

  test('auto increase shows measures and percent, manual increase only percent', () => {
    const { rerender, props } = setup({ speedMode: 1 });
    expect(screen.getByLabelText(/Measures between increases/)).toHaveValue(8);
    expect(within(speedPanel()).getByRole('slider')).toHaveValue('5');
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getByText(/Auto Increase mode, the tempo will automatically increase/)).toBeInTheDocument();

    rerender(<TrainingContent {...props} trainingSettings={settings({ speedMode: 2 })} />);
    expect(screen.queryByText('Measures between increases:')).not.toBeInTheDocument();
    expect(screen.getByText(/Manual Increase mode, you control/)).toBeInTheDocument();
    expect(within(speedPanel()).getByRole('slider')).toBeInTheDocument();
  });

  test('picking a macro mode switches speed training off', () => {
    const { props } = setup({ speedMode: 2 });
    const [macroSelect, speedSelect] = screen.getAllByRole('combobox');
    expect(speedSelect).toHaveValue('2');
    fireEvent.change(macroSelect, { target: { value: '1' } });
    expect(macroSelect).toHaveValue('1');
    expect(speedSelect).toHaveValue('0');
    apply();
    expect(props.setTrainingSettings).toHaveBeenCalledWith(expect.objectContaining({ macroMode: 1, speedMode: 0 }));
  });

  test('switching macro mode back to Off keeps the speed mode', () => {
    setup({ macroMode: 1, speedMode: 0 });
    const [macroSelect, speedSelect] = screen.getAllByRole('combobox');
    fireEvent.change(speedSelect, { target: { value: '1' } });
    fireEvent.change(macroSelect, { target: { value: '0' } });
    expect(speedSelect).toHaveValue('1');
  });

  test('speed mode is stored as a number and does not touch macro mode', () => {
    const { props } = setup({ macroMode: 2 });
    const [, speedSelect] = screen.getAllByRole('combobox');
    fireEvent.change(speedSelect, { target: { value: '1' } });
    apply();
    const saved = props.setTrainingSettings.mock.calls[0][0];
    expect(saved.speedMode).toBe(1);
    expect(saved.macroMode).toBe(2);
  });

  test('numeric fields are saved as numbers', () => {
    const { props } = setup({ macroMode: 1 });
    fireEvent.change(screen.getByLabelText(/Measures until mute/), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText(/Mute duration/), { target: { value: '3' } });
    apply();
    expect(props.setTrainingSettings).toHaveBeenCalledWith(
      expect.objectContaining({ measuresUntilMute: 6, muteDurationMeasures: 3 })
    );
  });

  test('probability and tempo percent sliders update the saved values', () => {
    const { props } = setup({ macroMode: 2 });
    fireEvent.change(within(macroPanel()).getByRole('slider'), { target: { value: '0.55' } });
    apply();
    expect(props.setTrainingSettings).toHaveBeenCalledWith(expect.objectContaining({ muteProbability: 0.55 }));
  });

  test('tempo increase slider updates the percent', () => {
    const { props } = setup({ speedMode: 1 });
    fireEvent.change(within(speedPanel()).getByRole('slider'), { target: { value: '12' } });
    expect(screen.getByText('12%')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Measures between increases/), { target: { value: '16' } });
    apply();
    expect(props.setTrainingSettings).toHaveBeenCalledWith(
      expect.objectContaining({ tempoIncreasePercent: 12, measuresUntilSpeedUp: 16 })
    );
  });

  test('Apply saves, pauses, closes and re-triggers the mode when training is active', () => {
    const { props } = setup({ macroMode: 1 });
    apply();
    expect(props.setIsPaused).toHaveBeenCalledWith(true);
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.setMode).toHaveBeenCalledTimes(1);
    expect(props.setMode.mock.calls[0][0]('grid')).toBe('grid');
  });

  test('Apply with training off does not touch the mode', () => {
    const { props } = setup();
    apply();
    expect(props.setTrainingSettings).toHaveBeenCalledWith(settings());
    expect(props.setIsPaused).toHaveBeenCalledWith(true);
    expect(props.onClose).toHaveBeenCalled();
    expect(props.setMode).not.toHaveBeenCalled();
  });

  test('Apply with only speed training active re-triggers the mode', () => {
    const { props } = setup({ speedMode: 2 });
    apply();
    expect(props.setMode).toHaveBeenCalledTimes(1);
  });

  test('local edits are replaced when the settings prop changes', () => {
    const { props, rerender } = setup({ macroMode: 1 });
    fireEvent.change(screen.getByLabelText(/Measures until mute/), { target: { value: '9' } });
    rerender(<TrainingContent {...props} trainingSettings={settings({ macroMode: 1, measuresUntilMute: 7 })} />);
    expect(screen.getByLabelText(/Measures until mute/)).toHaveValue(7);
  });
});
