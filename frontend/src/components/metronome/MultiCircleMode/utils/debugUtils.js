// src/components/metronome/MultiCircleMode/utils/debugUtils.js

/**
 * Debug logging prefix for MultiCircleMode components
 */
const DEBUG_PREFIX = '[MultiCircleLogic]';

/**
 * Determines if debug logging is enabled
 * Can be toggled via localStorage for production debugging
 */
export const isDebugMode = () => {
  try {
    return localStorage.getItem('metronomeDebug') === 'true' || 
           window.location.search.includes('debug=true');
  } catch (e) {
    return false; // Default to off if localStorage isn't available
  }
};

/**
 * Enhanced logging function that adds consistent prefix and handles objects
 * @param {string} message - Debug message
 * @param {Object} [data] - Optional data to log
 */
export const debugLog = (message, data) => {
  if (!isDebugMode()) return;
  
  if (data) {
    console.log(`${DEBUG_PREFIX} ${message}`, data);
  } else {
    console.log(`${DEBUG_PREFIX} ${message}`);
  }
};

/**
 * Log important errors, always visible regardless of debug mode
 * @param {string} message - Error message
 * @param {Error} [error] - Optional error object
 */
export const logError = (message, error) => {
  if (error) {
    console.error(`${DEBUG_PREFIX} ${message}`, error);
  } else {
    console.error(`${DEBUG_PREFIX} ${message}`);
  }
};

/**
 * Group related logs together with timestamp
 * @param {string} groupName - Name for the log group
 * @param {Function} logFn - Function containing logs to group
 */
export const groupLogs = (groupName, logFn) => {
  if (!isDebugMode()) return;
  
  const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
  console.group(`${DEBUG_PREFIX} ${groupName} [${timestamp}]`);
  logFn();
  console.groupEnd();
};

/**
 * Track performance metrics for specific operations
 * @param {string} operationName - Name of the operation being measured
 * @param {Function} fn - Function to measure
 * @returns {any} - Return value from the measured function
 */
export const measurePerformance = (operationName, fn) => {
  if (!isDebugMode()) return fn();
  
  const startTime = performance.now();
  const result = fn();
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`${DEBUG_PREFIX} Performance [${operationName}]: ${duration.toFixed(2)}ms`);
  return result;
};