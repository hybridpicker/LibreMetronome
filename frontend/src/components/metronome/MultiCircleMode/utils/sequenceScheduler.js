/** Advance a single audio-clock cursor through complete bars in array order. */
export function scheduleSequence({ cursor, circles, now, horizon, tempo, swing = 0, onBeat, onMeasureComplete }) {
  if (!circles.length || !Number.isFinite(tempo) || tempo <= 0) return;
  while (cursor.when < now + horizon) {
    if (!cursor.pattern) {
      cursor.circleIndex %= circles.length;
      const pattern = circles[cursor.circleIndex];
      cursor.pattern = { ...pattern, accents: [...pattern.accents] };
    }
    const pattern = cursor.pattern;
    const beats = Math.max(1, pattern.subdivisions);
    const baseInterval = 60 / tempo / (pattern.beatMode === 'eighth' ? 2 : 1);
    const interval = baseInterval * (beats > 1 ? 1 + (cursor.subIndex % 2 === 0 ? swing : -swing) : 1);
    if (!Number.isFinite(interval) || interval <= 0) return;

    // A delayed UI thread must not replay expired beats in a burst.
    if (cursor.when >= now) {
      onBeat({ circleIndex: cursor.circleIndex, subIndex: cursor.subIndex, when: cursor.when, pattern, interval });
    }
    cursor.when += interval;
    cursor.subIndex++;
    if (cursor.subIndex >= beats) {
      cursor.subIndex = 0;
      cursor.circleIndex = (cursor.circleIndex + 1) % circles.length;
      cursor.pattern = null;
      if (onMeasureComplete) onMeasureComplete(cursor.when);
    }
  }
}
