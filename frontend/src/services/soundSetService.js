import { getCookie } from './cookieUtils';

// Base URL for the API requests
const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? window.location.origin
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

/**
 * Fetches all sound sets from the API.
 * @returns {Promise<Array>} - An array of sound set objects.
 */
export const getAllSoundSets = async () => {
  const url = getApiUrl('/sound-sets/');
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching all sound sets from", url, ":", error);
    throw error;
  }
};

/**
 * Sets a specific sound set as active.
 * This function sends a POST request with the CSRF token included.
 * @param {number} id - The ID of the sound set to activate.
 * @returns {Promise<Object>} - The updated sound set object.
 */
export const setActiveSoundSet = async (id) => {
  const url = getApiUrl(`/sound-sets/${id}/set-active/`);
  const csrfToken = getCookie('csrftoken');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify({ is_active: true }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
  }
  return await response.json();
};

/**
 * Retrieves the currently active sound set.
 * This function fetches all sound sets and returns the one marked as active.
 * @returns {Promise<Object|null>} - The active sound set or null if none is active.
 */
export const getActiveSoundSet = async () => {
  try {
    const sets = await getAllSoundSets();
    const storedId = localStorage.getItem('activeSoundSetId');
    if (storedId) {
      const found = sets.find(set => set.id === storedId);
      if (found) return found;
    }
    return sets.find((set) => set.is_active) || null;
  } catch (error) {
    console.error("Error fetching active sound set:", error);
    return null;
  }
};
