/**
 * Utility function to retrieve a cookie by name.
 * This is used to read the CSRF token.
 */
export function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
  
  // Für Testzwecke: global verfügbar machen (nicht in der Produktion verwenden)
  if (typeof window !== 'undefined') {
    window.getCookie = getCookie;
  }
  