# metronome_thread.py

import threading
from time import perf_counter, sleep
import pygame
from constants import TEMPO_MIN, TEMPO_MAX, SWING_MAX, VOLUME_MAX


class MetronomeThread(threading.Thread):
    def __init__(
        self,
        tempo,
        subdivisions,
        first_beats,
        accented_beats,
        sound_normal,
        sound_accent,
        sound_first,
        stop_event
    ):
        super().__init__()
        self.tempo = tempo
        self.subdivisions = subdivisions
        self.first_beats = first_beats      # e.g. [0] if du nur den "Nullten" subdivision als "First" möchtest
        self.accented_beats = accented_beats
        self.sound_normal = sound_normal
        self.sound_accent = sound_accent
        self.sound_first = sound_first
        self.stop_event = stop_event

        self.paused = True
        self.current_subdivision = 0
        self.swing = 0.0
        self.intervals = []
        self.lock = threading.Lock()

        self.update_interval_times()
        self.last_tick_time = 0.0

        self.volume = 1.0

    def update_interval_times(self):
        # Calculate interval based on tempo and subdivisions
        self.interval_per_beat = 60 / max(1, self.tempo)
        self.interval_per_sub = self.interval_per_beat / max(1, self.subdivisions)
        self.update_intervals_with_swing()

    def update_intervals_with_swing(self):
        # Recalculate intervals when 'swing' is modified
        with self.lock:
            self.intervals = []
            for i in range(self.subdivisions):
                if self.subdivisions < 2:
                    adjusted_interval = self.interval_per_sub
                else:
                    if i % 2 == 0:
                        adjusted_interval = self.interval_per_sub * (1 + self.swing)
                    else:
                        adjusted_interval = self.interval_per_sub * (1 - self.swing)
                self.intervals.append(adjusted_interval)

    def run(self):
        """Main loop of the metronome thread."""
        # Set the start time
        self.last_tick_time = perf_counter()

        # Always start on subdivision=0 (the "first" beat).
        self.current_subdivision = 0

        # Calculate the time for the next tick
        next_tick = self.last_tick_time + self.intervals[self.current_subdivision]

        while not self.stop_event.is_set():
            if self.paused:
                sleep(0.01)
                # Reset timing to avoid drift if user paused
                self.last_tick_time = perf_counter()
                next_tick = self.last_tick_time + self.intervals[self.current_subdivision]
                continue

            now = perf_counter()
            if now >= next_tick:
                # Advance to the next subdivision
                self.current_subdivision = (self.current_subdivision + 1) % max(1, self.subdivisions)

                # Play appropriate beat sound
                self._play_beat_sound()

                # Update timing
                self.last_tick_time = now
                with self.lock:
                    interval = self.intervals[self.current_subdivision]
                next_tick += interval
            else:
                sleep(0.0005)

    def _play_beat_sound(self):
        """Play the correct sound based on the current subdivision."""
        # If the current subdivision is in 'first_beats', play the "first" sound.
        if self.current_subdivision in self.first_beats and self.sound_first:
            self.sound_first.play()
        # Else check if it's an accented beat
        elif self.current_subdivision in self.accented_beats and self.sound_accent:
            self.sound_accent.play()
        # Else if >1 subdivision, play normal beat (if available)
        elif self.subdivisions > 1 and self.sound_normal:
            self.sound_normal.play()

    def set_tempo(self, new_tempo):
        """Constrain the new tempo within the specified range and update intervals."""
        self.tempo = max(TEMPO_MIN, min(TEMPO_MAX, new_tempo))
        self.update_interval_times()

    def set_subdivisions(self, new_subdiv):
        """Change the subdivision count and reset timing."""
        self.subdivisions = max(1, new_subdiv)
        self.current_subdivision = 0
        self.update_interval_times()

    def set_swing(self, swing_value):
        """Clamp swing to [0.0, SWING_MAX] and update intervals."""
        self.swing = max(0.0, min(SWING_MAX, swing_value))
        self.update_intervals_with_swing()

    def set_volume(self, volume):
        """Clamp volume to [0.0, VOLUME_MAX] and set volume on all sounds."""
        self.volume = max(0.0, min(VOLUME_MAX, volume))
        if self.sound_normal:
            self.sound_normal.set_volume(self.volume)
        if self.sound_accent:
            self.sound_accent.set_volume(self.volume)
        if self.sound_first:
            self.sound_first.set_volume(self.volume)

    def pause(self, pause_state: bool):
        """Set the pause state of the metronome."""
        self.paused = pause_state
