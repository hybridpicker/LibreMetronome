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
        self.first_beats = first_beats
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
        """Recalculate the metronome intervals for each subdivision."""
        self.interval_per_beat = 60 / max(1, self.tempo)
        self.interval_per_sub = self.interval_per_beat / max(1, self.subdivisions)
        self.update_intervals_with_swing()

    def update_intervals_with_swing(self):
        """Adjust intervals based on current swing value."""
        with self.lock:
            self.intervals = []
            for i in range(self.subdivisions):
                if self.subdivisions < 2:
                    adjusted_interval = self.interval_per_sub
                else:
                    # even i -> lengthen by 'swing', odd i -> shorten
                    if i % 2 == 0:
                        adjusted_interval = self.interval_per_sub * (1 + self.swing)
                    else:
                        adjusted_interval = self.interval_per_sub * (1 - self.swing)
                self.intervals.append(adjusted_interval)

    def run(self):
        """Main loop of the metronome thread."""
        self.last_tick_time = perf_counter()
        self.current_subdivision = 0

        # Schedule next tick
        next_tick = self.last_tick_time + self.intervals[self.current_subdivision]

        while not self.stop_event.is_set():
            if self.paused:
                sleep(0.01)
                # Reset timing if paused
                self.last_tick_time = perf_counter()
                next_tick = self.last_tick_time + self.intervals[self.current_subdivision]
                continue

            now = perf_counter()
            if now >= next_tick:
                self.current_subdivision = (self.current_subdivision + 1) % max(1, self.subdivisions)
                self._play_beat_sound()

                self.last_tick_time = now
                with self.lock:
                    interval = self.intervals[self.current_subdivision]
                next_tick += interval
            else:
                sleep(0.0005)

    def _play_beat_sound(self):
        """Plays the appropriate beat sound based on current_subdivision."""
        if self.current_subdivision in self.first_beats and self.sound_first:
            self.sound_first.play()
        elif self.current_subdivision in self.accented_beats and self.sound_accent:
            self.sound_accent.play()
        elif self.subdivisions > 1 and self.sound_normal:
            self.sound_normal.play()

    def set_tempo(self, new_tempo):
        self.tempo = max(TEMPO_MIN, min(TEMPO_MAX, new_tempo))
        self.update_interval_times()

    def set_subdivisions(self, new_subdiv):
        self.subdivisions = max(1, new_subdiv)
        self.current_subdivision = 0
        self.update_interval_times()

    def set_swing(self, swing_value):
        self.swing = max(0.0, min(SWING_MAX, swing_value))
        self.update_intervals_with_swing()

    def set_volume(self, volume):
        self.volume = max(0.0, min(VOLUME_MAX, volume))
        if self.sound_normal:
            self.sound_normal.set_volume(self.volume)
        if self.sound_accent:
            self.sound_accent.set_volume(self.volume)
        if self.sound_first:
            self.sound_first.set_volume(self.volume)

    def pause(self, pause_state: bool):
        self.paused = pause_state
