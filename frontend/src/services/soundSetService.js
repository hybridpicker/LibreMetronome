/**
 * Utility function to retrieve a cookie by name.
 * This is used to read the CSRF token.
 */
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      // Check if the cookie starts with the given name
      if (cookie.startsWith(name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

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
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
  }
  return await response.json();
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
  const sets = await getAllSoundSets();
  return sets.find((set) => set.is_active) || null;
};
