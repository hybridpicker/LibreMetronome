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

// Helper function to get the active sound set ID from cookie
export function getActiveSoundSetIdFromCookie() {
  const cookieId = getCookie('activeSoundSetId');
  return cookieId ? cookieId.toString() : null;
}

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
    normal_beat_sound_url: '/metronome_sounds/drum_first_sound.mp3'
  }
];

/**
 * Fetches all sound sets from the API with fallback.
 * Determines active state solely from cookie, not from backend is_active flag.
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
    
    let data = await response.json();
    console.log("Successfully loaded sound sets:", data.length);
    
    // Always determine active state from cookie, not from backend
    // This is crucial since we've removed the backend is_active reliance
    const cookieId = getActiveSoundSetIdFromCookie();
    
    if (cookieId) {
      const cookieIdStr = cookieId.toString();
      // Mark the sound set matching the cookie as active, all others as inactive
      data = data.map(set => ({
        ...set,
        is_active: set.id.toString() === cookieIdStr
      }));
      console.log(`Applied cookie sound set ID ${cookieIdStr} to loaded sound sets`);
    } else if (data.length > 0) {
      // If no cookie exists, mark the first sound set as active
      // and set a cookie for it
      const firstSetId = data[0].id.toString();
      setCookie('activeSoundSetId', firstSetId, 365);
      localStorage.setItem('activeSoundSetId', firstSetId);
      console.log(`No cookie found, setting first sound set ${firstSetId} as active`);
      
      data = data.map((set, index) => ({
        ...set,
        is_active: index === 0
      }));
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching all sound sets from", url, ":", error);
    console.log("Using default sound sets");
    
    // Apply cookie selection to default sound sets if available
    const cookieId = getActiveSoundSetIdFromCookie();
    
    // If no cookie exists, set one for the first default sound set
    if (!cookieId && defaultSoundSets.length > 0) {
      const firstDefaultId = defaultSoundSets[0].id.toString();
      setCookie('activeSoundSetId', firstDefaultId, 365);
      localStorage.setItem('activeSoundSetId', firstDefaultId);
      console.log(`No cookie found, setting default sound set ${firstDefaultId} as active`);
    }
    
    // Pre-check default soundset URLs to make sure they're valid
    // This prevents propagating bad paths to the audio buffer loader
    const validSoundSets = defaultSoundSets.map(set => {
      const isActive = cookieId 
        ? set.id.toString() === cookieId.toString() 
        : set.id.toString() === defaultSoundSets[0].id.toString();
      
      return {
        ...set,
        is_active: isActive,
        first_beat_sound_url: set.first_beat_sound_url || '/assets/audio/click_new_first.mp3',
        accent_sound_url: set.accent_sound_url || '/assets/audio/click_new_accent.mp3',
        normal_beat_sound_url: set.normal_beat_sound_url || '/assets/audio/click_new.mp3'
      };
    });
    
    return validSoundSets;
  }
};

/**
 * Sets a specific sound set as active.
 * This function saves the ID to cookie and localStorage for persistence.
 * It tries to call the API but will still save preferences locally even if API fails.
 * It immediately dispatches a soundSetChanged event with the new ID.
 * 
 * @param {string} id - The ID of the sound set to activate.
 * @returns {Promise<Object>} - The updated sound set object.
 */
export const setActiveSoundSet = async (id) => {
  // Convert id to string to ensure consistent type comparison
  const idStr = id.toString();
  
  // Check if this is already the active sound set to avoid unnecessary operations
  const currentId = getActiveSoundSetIdFromCookie();
  if (currentId === idStr) {
    console.log(`Sound set ${idStr} is already active, no change needed`);
    return { id: idStr, is_active: true, status: 'Already active' };
  }
  
  // Always store the choice locally - this is now the primary source of truth
  localStorage.setItem('activeSoundSetId', idStr);
  setCookie('activeSoundSetId', idStr, 365); // Keep for 1 year
  
  // Broadcast the change event immediately, regardless of API success
  window.dispatchEvent(new CustomEvent('soundSetChanged', { 
    detail: { soundSetId: idStr } 
  }));
  
  console.log(`Sound set activated (ID: ${idStr}), cookie set and event dispatched`);
  
  // Try to validate the sound set exists on the backend, but don't rely on the API
  // response to determine active status (which is now entirely client-side)
  const url = getApiUrl(`/sound-sets/${idStr}/set-active/`);
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
      body: JSON.stringify({ sound_set_id: idStr }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }
    
    // We don't actually need or use the server response anymore
    // since selection is entirely cookie-based
    await response.json();
    return { 
      id: idStr, 
      is_active: true,
      status: 'Preference saved'
    };
  } catch (error) {
    console.error("Error validating with server, but preference saved locally:", error);
    
    // Return a success response anyway since we're cookie-based
    return { 
      id: idStr, 
      is_active: true,
      status: 'Local preference saved'
    };
  }
};

/**
 * Retrieves the currently active sound set with fallbacks.
 * Checks cookies first, then localStorage, then first available.
 * Works entirely without backend is_active flag.
 * 
 * @returns {Promise<Object>} - The active sound set
 */
export const getActiveSoundSet = async () => {
  try {
    // Get all available sound sets (might return defaults if API fails)
    const sets = await getAllSoundSets();
    
    // Check cookie first - this is always our source of truth
    const cookieId = getActiveSoundSetIdFromCookie();
    if (cookieId) {
      const cookieIdStr = cookieId.toString();
      const foundByCookie = sets.find(set => set.id.toString() === cookieIdStr);
      if (foundByCookie) {
        console.log("Using sound set from cookie:", foundByCookie.name);
        return foundByCookie;
      } else {
        console.log(`Cookie ID ${cookieIdStr} not found in available sound sets`);
      }
    }
    
    // Then check localStorage as backup
    const storedId = localStorage.getItem('activeSoundSetId');
    if (storedId) {
      const storedIdStr = storedId.toString();
      const foundByStorage = sets.find(set => set.id.toString() === storedIdStr);
      if (foundByStorage) {
        // Sync cookie with localStorage since cookie was missing or invalid
        setCookie('activeSoundSetId', storedIdStr, 365);
        console.log("Using sound set from localStorage:", foundByStorage.name);
        return foundByStorage;
      }
    }
    
    // No longer using backend is_active flag - just use the first set
    if (sets && sets.length > 0) {
      const firstSetIdStr = sets[0].id.toString();
      // Store this selection as the new default
      localStorage.setItem('activeSoundSetId', firstSetIdStr);
      setCookie('activeSoundSetId', firstSetIdStr, 365);
      console.log("No stored preference found, using first available set:", sets[0].name);
      return sets[0];
    }
    
    throw new Error("No sound sets available");
  } catch (error) {
    console.error("Critical error fetching active sound set:", error);
    // Last resort fallback to first default
    const fallbackSet = defaultSoundSets[0];
    const fallbackIdStr = fallbackSet.id.toString();
    localStorage.setItem('activeSoundSetId', fallbackIdStr);
    setCookie('activeSoundSetId', fallbackIdStr, 365);
    console.log("Using fallback sound set:", fallbackSet.name);
    return fallbackSet;
  }
};