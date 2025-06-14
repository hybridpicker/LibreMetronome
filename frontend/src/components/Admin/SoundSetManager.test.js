import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SoundSetManager from './SoundSetManager';

// Mock fetch
global.fetch = jest.fn();

// Mock Audio
beforeEach(() => {
  const mockAudioInstance = {
    play: jest.fn().mockResolvedValue(undefined)
  };
  global.Audio = jest.fn(() => mockAudioInstance);
});

describe('SoundSetManager Component', () => {
  const mockSoundSets = [
    {
      id: 1,
      name: 'Test Set 1',
      description: 'Test description 1',
      is_active: true,
      normal_beat_sound_url: '/sounds/normal1.mp3',
      accent_sound_url: '/sounds/accent1.mp3',
      first_beat_sound_url: '/sounds/first1.mp3'
    },
    {
      id: 2,
      name: 'Test Set 2',
      description: 'Test description 2',
      is_active: false,
      normal_beat_sound_url: '/sounds/normal2.mp3',
      accent_sound_url: '/sounds/accent2.mp3',
      first_beat_sound_url: '/sounds/first2.mp3'
    }
  ];

  beforeEach(() => {
    fetch.mockClear();
    localStorage.setItem('adminToken', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('loads and displays sound sets', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSoundSets
    });

    render(<SoundSetManager />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Sound Set Management')).toBeInTheDocument();
      expect(screen.getByText('Test Set 1')).toBeInTheDocument();
      expect(screen.getByText('Test Set 2')).toBeInTheDocument();
    });
  });

  test('shows add form when button clicked', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSoundSets
    });

    render(<SoundSetManager />);

    await waitFor(() => {
      expect(screen.getByText('Add New Sound Set')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add New Sound Set'));

    expect(screen.getByText('New Sound Set')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  test('handles sound preview', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSoundSets
    });

    render(<SoundSetManager />);

    await waitFor(() => {
      const previewButtons = screen.getAllByText('🔊 Normal');
      expect(previewButtons).toHaveLength(2);
    });

    const firstPreviewButton = screen.getAllByText('🔊 Normal')[0];
    fireEvent.click(firstPreviewButton);

    expect(global.Audio).toHaveBeenCalledWith('/sounds/normal1.mp3');
  });

  test('handles delete confirmation', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSoundSets
    });

    window.confirm = jest.fn(() => true);

    render(<SoundSetManager />);

    await waitFor(() => {
      expect(screen.getAllByText('Delete')).toHaveLength(2);
    });

    // Mock the delete request
    fetch.mockResolvedValueOnce({
      ok: true
    });

    // Mock the refresh request
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockSoundSets[1]] // Only second item remains
    });

    fireEvent.click(screen.getAllByText('Delete')[0]);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this sound set?');
      expect(fetch).toHaveBeenCalledWith('/api/sound-sets/1/', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': 'Token test-token'
        }
      });
    });
  });

  test('handles edit mode', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSoundSets
    });

    render(<SoundSetManager />);

    await waitFor(() => {
      expect(screen.getAllByText('Edit')).toHaveLength(2);
    });

    fireEvent.click(screen.getAllByText('Edit')[0]);

    expect(screen.getByText('Edit Sound Set')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Set 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description 1')).toBeInTheDocument();
  });

  test('handles form submission', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(<SoundSetManager />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Add New Sound Set'));
    });

    // Fill form
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'New Sound Set' }
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'New Description' }
    });

    // Mock file inputs
    const file = new File(['dummy content'], 'test.mp3', { type: 'audio/mpeg' });
    const normalInput = screen.getByLabelText('Normal Beat Sound (MP3)');
    const accentInput = screen.getByLabelText('Accent Sound (MP3)');
    const firstInput = screen.getByLabelText('First Beat Sound (MP3)');

    Object.defineProperty(normalInput, 'files', {
      value: [file],
      writable: false,
    });
    Object.defineProperty(accentInput, 'files', {
      value: [file],
      writable: false,
    });
    Object.defineProperty(firstInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(normalInput);
    fireEvent.change(accentInput);
    fireEvent.change(firstInput);

    // Mock successful submission
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 3, name: 'New Sound Set' })
    });

    // Mock refresh
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [...mockSoundSets, { id: 3, name: 'New Sound Set' }]
    });

    fireEvent.click(screen.getByText('Create Sound Set'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/sound-sets/', expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': 'Token test-token'
        }
      }));
    });
  });
});
