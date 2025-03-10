/**
 * Service for fetching metronome sound sets from the API
 */

// Set the API base URL based on environment
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin 
  : 'http://localhost:8000';

// Ensure we have the API prefix consistently
const getApiUrl = (endpoint) => {
  // Make sure endpoint starts with a slash if it doesn't already
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Always include /api/ in the path
  if (!formattedEndpoint.startsWith('/api/')) {
    return `${API_BASE_URL}/api${formattedEndpoint}`;
  }
  
  return `${API_BASE_URL}${formattedEndpoint}`;
};

// Export the getApiUrl function to be used in other files
export { getApiUrl };

/**
 * Helper function to validate API response
 * @param {Response} response - The fetch response object
 * @returns {Promise<any>} - The parsed JSON data
 * @throws {Error} - If the response is not ok or the JSON is invalid
 */
const validateResponse = async (response) => {
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
  }
  
  // Check if response is empty
  const text = await response.text();
  if (!text || text.trim() === '') {
    throw new Error('Empty response from server');
  }
  
  // Check if the response starts with <!DOCTYPE or <html, indicating HTML instead of JSON
  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    console.error('Received HTML instead of JSON. Check API endpoint configuration.');
    
    // Try with an explicitly constructed URL that includes /api/
    if (!response.url.includes('/api/')) {
      let newUrl = new URL(response.url);
      let pathWithApi = newUrl.pathname;
      
      // Ensure path starts with /api/
      if (!pathWithApi.startsWith('/api/')) {
        pathWithApi = pathWithApi.startsWith('/') ? `/api${pathWithApi}` : `/api/${pathWithApi}`;
      }
      
      newUrl.pathname = pathWithApi;
      console.log(`Retrying with URL: ${newUrl.toString()}`);
      
      // Return a promise for a new fetch request with the modified URL
      return fetch(newUrl.toString())
        .then(newResponse => {
          if (!newResponse.ok) {
            throw new Error(`Retry failed with status: ${newResponse.status}`);
          }
          return newResponse.text();
        })
        .then(newText => {
          if (!newText || newText.trim() === '') {
            throw new Error('Empty response from server on retry');
          }
          
          if (newText.trim().startsWith('<!DOCTYPE') || newText.trim().startsWith('<html')) {
            throw new Error('Still received HTML instead of JSON on retry');
          }
          
          try {
            return JSON.parse(newText);
          } catch (parseError) {
            console.error('JSON parse error on retry:', parseError);
            throw new Error(`Invalid JSON response on retry: ${parseError.message}`);
          }
        })
        .catch(error => {
          console.error('Retry failed:', error);
          throw new Error('Invalid API response: received HTML instead of JSON');
        });
    }
    
    throw new Error('Invalid API response: received HTML instead of JSON');
  }
  
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('JSON parse error:', error, 'Response text:', text);
    throw new Error(`Invalid JSON response: ${error.message}`);
  }
};

/**
 * Process sound set URLs to ensure they are absolute
 * @param {Object} soundSet - The sound set object
 * @returns {Object} - The processed sound set
 */
const processSoundSetUrls = (soundSet) => {
  if (!soundSet) return null;
  
  const result = { ...soundSet };
  
  ['first_beat_sound_url', 'accent_sound_url', 'normal_beat_sound_url'].forEach(key => {
    if (result[key] && !result[key].startsWith('http') && !result[key].startsWith('/')) {
      result[key] = `/${result[key]}`;
    }
    
    if (result[key] && !result[key].startsWith('http')) {
      result[key] = `${window.location.origin}${result[key]}`;
    }
  });
  
  return result;
};

/**
 * Get the active sound set from the API
 * This is the sound set that should be used by the metronome
 * @returns {Promise<Object>} The active sound set
 */
export const getActiveSoundSet = async () => {
  try {
    const url = getApiUrl('/active-sound-set/');
    console.log(`Fetching active sound set from: ${url}`);
    const response = await fetch(url);
    const data = await validateResponse(response);
    return processSoundSetUrls(data);
  } catch (error) {
    console.error('Error fetching active sound set:', error);
    return null;
  }
};

/**
 * Get the default sound set from the API
 * @returns {Promise<Object>} The default sound set
 */
export const getDefaultSoundSet = async () => {
  try {
    const url = getApiUrl('/default-sound-set/');
    console.log(`Fetching default sound set from: ${url}`);
    const response = await fetch(url);
    const data = await validateResponse(response);
    return processSoundSetUrls(data);
  } catch (error) {
    console.error('Error fetching default sound set:', error);
    return null;
  }
};

/**
 * Get all sound sets from the API
 * @returns {Promise<Array>} List of sound sets
 */
export const getAllSoundSets = async () => {
  try {
    const url = getApiUrl('/sound-sets/');
    console.log(`Fetching all sound sets from: ${url}`);
    const response = await fetch(url);
    const data = await validateResponse(response);
    return data.map(set => processSoundSetUrls(set));
  } catch (error) {
    console.error('Error fetching all sound sets:', error);
    return [];
  }
};

/**
 * Get a specific sound set by ID
 * @param {number} id - The sound set ID
 * @returns {Promise<Object>} The sound set
 */
export const getSoundSetById = async (id) => {
  try {
    const url = getApiUrl(`/sound-sets/${id}/`);
    console.log(`Fetching sound set ${id} from: ${url}`);
    const response = await fetch(url);
    const data = await validateResponse(response);
    return processSoundSetUrls(data);
  } catch (error) {
    console.error(`Error fetching sound set ${id}:`, error);
    return null;
  }
};

/**
 * Set a sound set as active
 * @param {number} id - The sound set ID to set as active
 * @returns {Promise<Object>} The updated sound set
 */
export const setActiveSoundSet = async (id) => {
  try {
    const url = getApiUrl(`/sound-sets/${id}/set-active/`);
    console.log(`Setting sound set ${id} as active via: ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    const data = await validateResponse(response);
    return processSoundSetUrls(data);
  } catch (error) {
    console.error(`Error setting sound set ${id} as active:`, error);
    throw error;
  }
};

/**
 * Clear any cached sound set data
 * This is a placeholder function to match the import in SoundSetSelector.js
 * The actual caching happens in audioBuffers.js
 */
export const clearCachedSoundSet = () => {
  console.log('Clearing cached sound set data');
  // This is a placeholder. The actual implementation would depend on how sound sets are cached.
  // For now, we'll just log the action.
};
