import { getCookie, setCookie } from './cookieUtils';

// Use REACT_APP_BACKEND_URL (if set) or window.location.origin in production
// For development, ensure it's set to the Django backend URL
const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? (process.env.REACT_APP_BACKEND_URL || window.location.origin)
    : 'http://localhost:8000';

/**
 * Constructs the full API URL given an endpoint.
 * @param {string} endpoint - e.g. '/sound-sets/'
 * @returns {string} - The full URL.
 */
const getApiUrl = (endpoint) => {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}/api${formattedEndpoint}`;
};

// Default sound sets to use when API is not available
const defaultSoundSets = [
  {
    id: 'default-woodblock',
    name: 'Wood Block',
    is_active: true,
    first_beat_sound_url: '/metronome_sounds/wood_first_sound.mp3',
    accent_sound_url: '/metronome_sounds/wood_accent_sound.mp3',
    normal_beat_sound_url: '/metronome_sounds/wood_normal_sound.mp3'
  },
  {
    id: 'default-drums',
    name: 'Drums',
    is_active: false,
    first_beat_sound_url: '/metronome_sounds/drum_first_sound.mp3',
    accent_sound_url: '/metronome_sounds/drum_accent_sound.mp3',
    normal_beat_sound_url: '/metronome_sounds/drum_normal_sound.mp3'
  }
];

/**
 * Fetches all sound sets from the API with fallback.
 * @returns {Promise<Array>} - An array of sound set objects.
 */
export const getAllSoundSets = async () => {
  const url = getApiUrl('/sound-sets/');
  try {
    console.log("Fetching sound sets from:", url);
    const response = await fetch(url, { 
      credentials: 'include',
      // Add these headers to help with CORS
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      // Add timeout for fetch
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Successfully loaded sound sets:", data.length);
    return data;
  } catch (error) {
    console.error("Error fetching all sound sets from", url, ":", error);
    console.log("Using default sound sets");
    
    // Pre-check default soundset URLs to make sure they're valid
    // This prevents propagating bad paths to the audio buffer loader
    const validSoundSets = defaultSoundSets.map(set => ({
      ...set,
      first_beat_sound_url: set.first_beat_sound_url || '/assets/audio/click_new_first.mp3',
      accent_sound_url: set.accent_sound_url || '/assets/audio/click_new_accent.mp3',
      normal_beat_sound_url: set.normal_beat_sound_url || '/assets/audio/click_new.mp3'
    }));
    
    return validSoundSets;
  }
};

/**
 * Sets a specific sound set as active.
 * This function saves the ID to cookie and localStorage for persistence.
 * It tries to call the API but will still save preferences locally even if API fails.
 * 
 * @param {string} id - The ID of the sound set to activate.
 * @returns {Promise<Object>} - The updated sound set object.
 */
export const setActiveSoundSet = async (id) => {
  // Always store the choice locally
  localStorage.setItem('activeSoundSetId', id.toString());
  setCookie('activeSoundSetId', id.toString(), 365); // Keep for 1 year
  
  // Try to update server state if possible
  const url = getApiUrl(`/sound-sets/${id}/set-active/`);
  const csrfToken = getCookie('csrftoken');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ is_active: true }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error updating server, but preference saved locally:", error);
    
    // Return a mock success response
    return { 
      id, 
      is_active: true,
      status: 'Local preference saved'
    };
  }
};

/**
 * Retrieves the currently active sound set with fallbacks.
 * Checks cookies first, then localStorage, then server state.
 * Works even when API is unavailable.
 * 
 * @returns {Promise<Object>} - The active sound set
 */
export const getActiveSoundSet = async () => {
  try {
    // Get all available sound sets (might return defaults if API fails)
    const sets = await getAllSoundSets();
    
    // Check cookie first
    const cookieId = getCookie('activeSoundSetId');
    if (cookieId) {
      const foundByCookie = sets.find(set => set.id.toString() === cookieId);
      if (foundByCookie) {
        console.log("Using sound set from cookie:", foundByCookie.name);
        return foundByCookie;
      }
    }
    
    // Then check localStorage
    const storedId = localStorage.getItem('activeSoundSetId');
    if (storedId) {
      const foundByStorage = sets.find(set => set.id.toString() === storedId);
      if (foundByStorage) {
        // Sync cookie with localStorage
        setCookie('activeSoundSetId', storedId, 365);
        console.log("Using sound set from localStorage:", foundByStorage.name);
        return foundByStorage;
      }
    }
    
    // Fall back to server's active flag
    const activeSet = sets.find((set) => set.is_active);
    if (activeSet) {
      // Update both storage mechanisms with server value
      localStorage.setItem('activeSoundSetId', activeSet.id.toString());
      setCookie('activeSoundSetId', activeSet.id.toString(), 365);
      console.log("Using sound set from server:", activeSet.name);
      return activeSet;
    }
    
    // Last resort: use first available set
    console.log("No active sound set found, using first available set:", sets[0].name);
    return sets[0];
  } catch (error) {
    console.error("Critical error fetching active sound set:", error);
    // Last resort fallback to first default
    return defaultSoundSets[0];
  }
};