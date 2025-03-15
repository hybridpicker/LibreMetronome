// src/hooks/useMetronomeLogic/constants.js
export const TEMPO_MIN = 15;
export const TEMPO_MAX = 240;
export const SCHEDULE_AHEAD_TIME = 0.03; // 30 ms scheduling lookahead (reduced for higher precision)
export const SCHEDULER_INTERVAL = 10; // 10 ms interval for more frequent updates (was 20ms)