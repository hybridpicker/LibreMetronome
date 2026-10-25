import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SettingsContent from '../../../components/Menu/SettingsContent';
import {
  getAllSoundSets,
  setActiveSoundSet,
  getActiveSoundSetIdFromCookie
} from '../../../services/soundSetService';

jest.mock('../../../services/soundSetService', () => ({
  getAllSoundSets: jest.fn(),
  setActiveSoundSet: jest.fn(),
  getActiveSoundSetIdFromCookie: jest.fn()
}));

const BACKEND = 'http://localhost:8000';

const wood = { id: 1, name: 'Wood', is_active: false };
const drums = { id: 2, name: 'Drums', is_active: true };
const synth = {
  id: 3, name: 'Synth', is_active: false,
  first_beat_sound_url: '/s/first.mp3', accent_sound_url: '/s/accent.mp3', normal_beat_sound_url: '/s/normal.mp3'
};

let audioInstances;
let playImpl;

const baseProps = () => ({
  volume: 0.5,
  setVolume: jest.fn(),
  defaultTempo: 100,
  setDefaultTempo: jest.fn(),
  defaultSubdivisions: 3,
  setDefaultSubdivisions: jest.fn(),
  currentMode: 'circle',
  onClose: jest.fn(),
  setSoundSetReloadTrigger: jest.fn()
});

const mountSettings = async (overrides = {}, sets = [wood, drums, synth]) => {
  getAllSoundSets.mockResolvedValue(sets);
  const props = { ...baseProps(), ...overrides };
  render(<SettingsContent {...props} />);
  await waitFor(() => expect(screen.queryByText('Loading sound sets…')).not.toBeInTheDocument());
  return props;
};

const goAudio = () => fireEvent.click(screen.getByRole('tab', { name: 'Audio' }));

describe('SettingsContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getActiveSoundSetIdFromCookie.mockReturnValue(null);
    setActiveSoundSet.mockResolvedValue(undefined);
    audioInstances = [];
    playImpl = () => {};
    global.Audio = jest.fn(function Audio(url) {
      this.url = url;
      this.volume = 1;
      this.play = jest.fn(() => playImpl());
      audioInstances.push(this);
    });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete global.Audio;
  });

  describe('general tab', () => {
    test('shows the tempo and beats per bar passed in', async () => {
      await mountSettings();
      expect(screen.getByRole('spinbutton', { name: /tempo/i })).toHaveValue(100);
      expect(screen.getByRole('combobox', { name: /beats per bar/i })).toHaveValue('3');
    });

    test('falls back to 120 BPM and 4 beats when no defaults are given', async () => {
      await mountSettings({ defaultTempo: undefined, defaultSubdivisions: undefined });
      expect(screen.getByRole('spinbutton', { name: /tempo/i })).toHaveValue(120);
      expect(screen.getByRole('combobox', { name: /beats per bar/i })).toHaveValue('4');
    });

    test('offers 1 to 9 beats per bar', async () => {
      await mountSettings();
      const options = screen.getAllByRole('option').map((o) => o.textContent);
      expect(options).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    });

    test.each([
      ['circle', 'Beat Mode'],
      ['multi', 'Sequence Mode'],
      ['grid', 'Grid Mode'],
      ['analog', 'Analog Mode'],
      ['polyrhythm', 'Polyrhythm Mode']
    ])('labels the current mode %s as "%s"', async (mode, label) => {
      await mountSettings({ currentMode: mode });
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    test('follows prop changes', async () => {
      getAllSoundSets.mockResolvedValue([]);
      const props = baseProps();
      const { rerender } = render(<SettingsContent {...props} />);
      rerender(<SettingsContent {...props} defaultTempo={150} defaultSubdivisions={7} volume={0.2} />);
      expect(screen.getByRole('spinbutton', { name: /tempo/i })).toHaveValue(150);
      expect(screen.getByRole('combobox', { name: /beats per bar/i })).toHaveValue('7');
      goAudio();
      expect(screen.getByText('Master Volume: 20%')).toBeInTheDocument();
      await waitFor(() => expect(getAllSoundSets).toHaveBeenCalled());
    });

    test('tab buttons expose aria-selected', async () => {
      await mountSettings();
      expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true');
      goAudio();
      expect(screen.getByRole('tab', { name: 'Audio' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'false');
      fireEvent.click(screen.getByRole('tab', { name: 'General' }));
      expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('apply', () => {
    test('writes tempo and beats back, dispatches the settings event, saves the sound set and closes', async () => {
      const listener = jest.fn();
      window.addEventListener('metronome-settings-applied', listener);
      const props = await mountSettings();
      fireEvent.change(screen.getByRole('spinbutton', { name: /tempo/i }), { target: { value: '90' } });
      fireEvent.change(screen.getByRole('combobox', { name: /beats per bar/i }), { target: { value: '6' } });
      fireEvent.click(screen.getByRole('button', { name: 'Apply Settings' }));

      expect(props.setDefaultTempo).toHaveBeenCalledWith(90);
      expect(props.setDefaultSubdivisions).toHaveBeenCalledWith(6);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].detail).toEqual({
        tempo: 90, subdivisions: 6, volume: 0.5, soundSetId: '2'
      });
      expect(setActiveSoundSet).toHaveBeenCalledWith(2);
      await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
      const updater = props.setSoundSetReloadTrigger.mock.calls[0][0];
      expect(updater(4)).toBe(5);
      window.removeEventListener('metronome-settings-applied', listener);
    });

    test('closes even if saving the sound set fails', async () => {
      const props = await mountSettings();
      setActiveSoundSet.mockRejectedValue(new Error('offline'));
      fireEvent.click(screen.getByRole('button', { name: 'Apply Settings' }));
      await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
      expect(props.setSoundSetReloadTrigger).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Failed to update sound set:', expect.any(Error));
    });

    test('without a reload trigger or onClose it still completes', async () => {
      const props = await mountSettings({ setSoundSetReloadTrigger: undefined, onClose: undefined });
      fireEvent.click(screen.getByRole('button', { name: 'Apply Settings' }));
      await waitFor(() => expect(setActiveSoundSet).toHaveBeenCalledWith(2));
      expect(props.setDefaultTempo).toHaveBeenCalledWith(100);
    });

    test('failure path without onClose does not throw', async () => {
      await mountSettings({ onClose: undefined });
      setActiveSoundSet.mockRejectedValue(new Error('x'));
      fireEvent.click(screen.getByRole('button', { name: 'Apply Settings' }));
      await waitFor(() => expect(console.error).toHaveBeenCalledWith('Failed to update sound set:', expect.any(Error)));
    });

    test('without any sound set it only applies values and closes', async () => {
      const listener = jest.fn();
      window.addEventListener('metronome-settings-applied', listener);
      const props = await mountSettings({}, []);
      fireEvent.click(screen.getByRole('button', { name: 'Apply Settings' }));
      expect(props.setDefaultTempo).toHaveBeenCalledWith(100);
      expect(props.onClose).toHaveBeenCalledTimes(1);
      expect(setActiveSoundSet).not.toHaveBeenCalled();
      expect(listener).not.toHaveBeenCalled();
      window.removeEventListener('metronome-settings-applied', listener);
    });

    test('without any sound set and without onClose it does not throw', async () => {
      await mountSettings({ onClose: undefined }, []);
      expect(() => fireEvent.click(screen.getByRole('button', { name: 'Apply Settings' }))).not.toThrow();
    });
  });

  describe('volume', () => {
    test('slider updates the label and calls setVolume with a number', async () => {
      const props = await mountSettings();
      goAudio();
      expect(screen.getByText('Master Volume: 50%')).toBeInTheDocument();
      fireEvent.change(screen.getByRole('slider'), { target: { value: '0.75' } });
      expect(props.setVolume).toHaveBeenCalledWith(0.75);
      expect(screen.getByText('Master Volume: 75%')).toBeInTheDocument();
    });

    test('volume at the extremes', async () => {
      const props = await mountSettings();
      goAudio();
      fireEvent.change(screen.getByRole('slider'), { target: { value: '0' } });
      expect(props.setVolume).toHaveBeenLastCalledWith(0);
      expect(screen.getByText('Master Volume: 0%')).toBeInTheDocument();
      fireEvent.change(screen.getByRole('slider'), { target: { value: '1' } });
      expect(props.setVolume).toHaveBeenLastCalledWith(1);
    });
  });

  describe('sound sets', () => {
    test('lists every set as a radio, selecting the one marked active', async () => {
      await mountSettings();
      goAudio();
      expect(screen.getByRole('radio', { name: 'Drums' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Wood' })).not.toBeChecked();
      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    test('the cookie wins over the API flag', async () => {
      getActiveSoundSetIdFromCookie.mockReturnValue('1');
      await mountSettings();
      goAudio();
      expect(screen.getByRole('radio', { name: 'Wood' })).toBeChecked();
    });

    test('a cookie that matches no set is ignored in favour of the API flag', async () => {
      getActiveSoundSetIdFromCookie.mockReturnValue('999');
      await mountSettings();
      goAudio();
      expect(screen.getByRole('radio', { name: 'Drums' })).toBeChecked();
    });

    test('without cookie or active flag, the first set is selected', async () => {
      await mountSettings({}, [{ ...wood }, { id: 5, name: 'Other', is_active: false }]);
      goAudio();
      expect(screen.getByRole('radio', { name: 'Wood' })).toBeChecked();
    });

    test('shows a loading hint while fetching', async () => {
      let resolve;
      getAllSoundSets.mockReturnValue(new Promise((r) => { resolve = r; }));
      render(<SettingsContent {...baseProps()} />);
      goAudio();
      expect(screen.getByText('Loading sound sets…')).toBeInTheDocument();
      await act(async () => { resolve([]); });
      expect(screen.queryByText('Loading sound sets…')).not.toBeInTheDocument();
    });

    test('shows the error when fetching fails', async () => {
      getAllSoundSets.mockRejectedValue(new Error('network down'));
      render(<SettingsContent {...baseProps()} />);
      goAudio();
      expect(await screen.findByText('Error: network down')).toBeInTheDocument();
      expect(screen.queryByText('Loading sound sets…')).not.toBeInTheDocument();
    });

    test('choosing another set persists it, triggers a buffer reload and previews the first beat after 300 ms', async () => {
      const props = await mountSettings();
      goAudio();
      jest.useFakeTimers();
      fireEvent.click(screen.getByRole('radio', { name: 'Wood' }));
      await act(async () => { await Promise.resolve(); });
      expect(screen.getByRole('radio', { name: 'Wood' })).toBeChecked();
      expect(setActiveSoundSet).toHaveBeenCalledWith(1);
      expect(props.setSoundSetReloadTrigger).toHaveBeenCalledTimes(1);
      expect(props.setSoundSetReloadTrigger.mock.calls[0][0](0)).toBe(1);
      expect(audioInstances).toHaveLength(0);
      act(() => { jest.advanceTimersByTime(299); });
      expect(audioInstances).toHaveLength(0);
      act(() => { jest.advanceTimersByTime(1); });
      expect(audioInstances).toHaveLength(1);
      expect(audioInstances[0].url).toBe(`${BACKEND}/metronome_sounds/wood_first_sound.mp3`);
    });

    test('selecting the already active set does nothing', async () => {
      const props = await mountSettings();
      goAudio();
      fireEvent.click(screen.getByRole('radio', { name: 'Drums' }));
      expect(setActiveSoundSet).not.toHaveBeenCalled();
      expect(props.setSoundSetReloadTrigger).not.toHaveBeenCalled();
    });

    test('a failing save is logged and does not trigger a reload', async () => {
      const props = await mountSettings();
      goAudio();
      setActiveSoundSet.mockRejectedValue(new Error('save failed'));
      fireEvent.click(screen.getByRole('radio', { name: 'Wood' }));
      await waitFor(() => expect(console.error).toHaveBeenCalledWith('Error updating sound set:', expect.any(Error)));
      expect(props.setSoundSetReloadTrigger).not.toHaveBeenCalled();
    });

    test('changing the set works without a reload trigger prop', async () => {
      await mountSettings({ setSoundSetReloadTrigger: undefined });
      goAudio();
      jest.useFakeTimers();
      fireEvent.click(screen.getByRole('radio', { name: 'Wood' }));
      await act(async () => { await Promise.resolve(); });
      expect(setActiveSoundSet).toHaveBeenCalledWith(1);
      act(() => { jest.advanceTimersByTime(300); });
      expect(audioInstances).toHaveLength(1);
    });

    test('the delayed preview swallows playback errors', async () => {
      await mountSettings();
      goAudio();
      jest.useFakeTimers();
      playImpl = () => { throw new Error('blocked'); };
      fireEvent.click(screen.getByRole('radio', { name: 'Wood' }));
      await act(async () => { await Promise.resolve(); });
      expect(() => act(() => { jest.advanceTimersByTime(300); })).not.toThrow();
    });
  });

  describe('sound preview', () => {
    const previewUrl = async (button, set) => {
      getActiveSoundSetIdFromCookie.mockReturnValue(set.id);
      await mountSettings();
      goAudio();
      fireEvent.click(screen.getByRole('button', { name: button }));
      return audioInstances[0].url;
    };

    test('backend sound set URLs are used when all three are provided', async () => {
      expect(await previewUrl('First Beat', synth)).toBe(`${BACKEND}/s/first.mp3`);
    });

    test.each([
      ['Accent', 'wood_accent_sound.mp3'],
      ['Normal', 'wood_normal_sound.mp3']
    ])('default wood fallback plays %s', async (button, file) => {
      // No sound sets at all: the initial wood paths stay
      await mountSettings({}, []);
      goAudio();
      fireEvent.click(screen.getByRole('button', { name: button }));
      expect(audioInstances[0].url).toBe(`${BACKEND}/metronome_sounds/${file}`);
    });

    test.each([
      ['woodblock', 'wood'],
      ['default-woodblock', 'wood'],
      ['drums', 'drum'],
      ['default-drums', 'drum']
    ])('id "%s" without URLs falls back to the %s samples', async (id, prefix) => {
      getActiveSoundSetIdFromCookie.mockReturnValue(id);
      await mountSettings({}, [{ id, name: 'Custom', is_active: false }]);
      goAudio();
      fireEvent.click(screen.getByRole('button', { name: 'Normal' }));
      expect(audioInstances[0].url).toBe(`${BACKEND}/metronome_sounds/${prefix}_normal_sound.mp3`);
    });

    test('an unknown id warns and uses the wood default', async () => {
      getActiveSoundSetIdFromCookie.mockReturnValue('mystery');
      await mountSettings({}, [{ id: 'mystery', name: 'Mystery', is_active: false }]);
      goAudio();
      expect(console.warn).toHaveBeenCalledWith('Could not find sound paths for ID: mystery, using default');
      fireEvent.click(screen.getByRole('button', { name: 'First Beat' }));
      expect(audioInstances[0].url).toBe(`${BACKEND}/metronome_sounds/wood_first_sound.mp3`);
    });

    test('a set with only some URLs is treated as incomplete', async () => {
      const partial = { id: 'drums', name: 'Partial', first_beat_sound_url: '/x.mp3' };
      getActiveSoundSetIdFromCookie.mockReturnValue('drums');
      await mountSettings({}, [partial]);
      goAudio();
      fireEvent.click(screen.getByRole('button', { name: 'First Beat' }));
      expect(audioInstances[0].url).toBe(`${BACKEND}/metronome_sounds/drum_first_sound.mp3`);
    });

    test('playback uses the local volume and disables the buttons until the sound ended', async () => {
      await mountSettings();
      goAudio();
      fireEvent.change(screen.getByRole('slider'), { target: { value: '0.3' } });
      fireEvent.click(screen.getByRole('button', { name: 'Accent' }));
      expect(audioInstances[0].volume).toBe(0.3);
      expect(audioInstances[0].play).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'First Beat' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Accent' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Normal' })).toBeDisabled();
      act(() => { audioInstances[0].onended(); });
      expect(screen.getByRole('button', { name: 'Normal' })).toBeEnabled();
    });

    test('a failing play() call re-enables the buttons and logs', async () => {
      await mountSettings();
      goAudio();
      playImpl = () => { throw new Error('NotAllowedError'); };
      fireEvent.click(screen.getByRole('button', { name: 'Normal' }));
      expect(console.error).toHaveBeenCalledWith('Error playing sound:', expect.any(Error));
      expect(screen.getByRole('button', { name: 'Normal' })).toBeEnabled();
    });
  });
});
