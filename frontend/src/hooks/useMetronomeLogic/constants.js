// src/hooks/useMetronomeLogic/constants.js
export const TEMPO_MIN = 15;
export const TEMPO_MAX = 240;
// Audio is scheduled on the AudioContext timeline. A generous look-ahead keeps
// the click sample-accurate even when WebKit briefly delays the JavaScript
// thread for layout, touch handling, or garbage collection.
export const SCHEDULE_AHEAD_TIME = 0.1;
export const SCHEDULER_INTERVAL = 20;
export const STARTUP_LEAD_TIME = 0.025;
