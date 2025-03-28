/**
 * disableConsoleLogs.js
 * This script disables console.log output when the app is running on the production domain.
 * Production is determined by checking if the hostname is "libremetronome.com".
 */
(function () {
  "use strict";
  if (window.location.hostname === "libremetronome.com") {
    // Disable console.log in production
    console.log = function() {};
    // Optionally, disable other logging methods:
    // console.debug = function() {};
    // console.info  = function() {};
    // console.warn  = function() {};
    // console.error = function() {};
  }
})();