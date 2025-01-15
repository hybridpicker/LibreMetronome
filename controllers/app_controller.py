# controllers/app_controller.py

import pygame
from pygame.time import Clock
from threading import Event
from time import perf_counter

from constants import (
    WHITE, PRIMARY_COLOR, GREY, LIGHT_GREY, BLACK,
    WIDTH, HEIGHT, CENTER, RADIUS, TEMPO_MIN, TEMPO_MAX,
    SWING_MAX, VOLUME_MAX
)
from metronome.metronome_thread import MetronomeThread
from ui.slider import Slider
from ui.info_popup import display_info_popup
from ui.buttons import draw_info_button
from ui import draw
from utils.helpers import get_circle_positions
from sound.sound_manager import SoundManager
from ui.event_handler import EventHandler
from utils.audio_processor import AudioProcessor

class AppController:
    def __init__(self):
        pygame.mixer.pre_init(frequency=44100, size=-16, channels=2, buffer=256)
        pygame.init()

        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        pygame.display.set_caption("Libre Metronome")

        self.font = pygame.font.SysFont('Arial', 24, bold=True)
        self.small_font = pygame.font.SysFont('Arial', 20)

        self.stop_event = Event()

        self.subdivision_positions = get_circle_positions(CENTER, RADIUS, 4)
        self.first_beats = {0}
        self.accented_beats = set()

        # Sound Manager
        self.sound_manager = SoundManager()

        # Audio Processor for BPM detection
        self.audio_processor = AudioProcessor()

        # Metronome Thread
        self.metronome = MetronomeThread(
            tempo=120,
            subdivisions=4,
            first_beats=self.first_beats,
            accented_beats=self.accented_beats,
            sound_normal=self.sound_manager.get_sound('normal'),
            sound_accent=self.sound_manager.get_sound('accent'),
            sound_first=self.sound_manager.get_sound('first'),
            stop_event=self.stop_event
        )
        self.metronome.set_volume(1.0)
        self.metronome.start()

        # Sliders
        self.sliders = self.create_sliders()

        self.clock = Clock()
        self.running = True

        # Info button
        self.info_button_rect = pygame.Rect(WIDTH - 100, 20, 80, 40)
        self.show_info = False

        # Tap Tempo
        self.tap_times = []
        self.TAP_RESET_TIME = 2.0  # reset taps if last tap is older than 2 seconds

        # Event Handler
        self.event_handler = EventHandler(self)

    def create_sliders(self):
        swing_slider = Slider(
            rect=(150, HEIGHT // 2 - 150, 20, 300),
            knob_size=30,
            min_value=0.0,
            max_value=SWING_MAX,
            initial_value=0.0,
            label='Swing',
            font=self.font,
            orientation='vertical',
            value_format="{:.1%}"
        )

        volume_slider = Slider(
            rect=(WIDTH - 170, HEIGHT // 2 - 150, 20, 300),
            knob_size=30,
            min_value=0.0,
            max_value=VOLUME_MAX,
            initial_value=1.0,
            label='Volume',
            font=self.font,
            orientation='vertical',
            value_format="{:.0%}"
        )

        tempo_slider = Slider(
            rect=(150, HEIGHT - 100, 700, 20),
            knob_size=30,
            min_value=TEMPO_MIN,
            max_value=TEMPO_MAX,
            initial_value=120,
            label='Tempo',
            font=self.font,
            orientation='horizontal',
            value_format="{:.0f} BPM"
        )

        return {
            'swing': swing_slider,
            'volume': volume_slider,
            'tempo': tempo_slider
        }

    def toggle_info(self):
        self.show_info = not self.show_info

    def toggle_pause(self):
        new_pause_state = not self.metronome.paused
        self.metronome.pause(new_pause_state)

        if not new_pause_state:
            # Unpauset: reset to first beat
            self.metronome.current_subdivision = 0
            self.metronome.last_tick_time = perf_counter()
            # Immediately play the first beat
            if 0 in self.first_beats and self.metronome.sound_first:
                self.metronome.sound_first.play()

    def tap_tempo(self):
        now = perf_counter()
        if self.tap_times and (now - self.tap_times[-1] > self.TAP_RESET_TIME):
            self.tap_times = []
        self.tap_times.append(now)

        if len(self.tap_times) > 1:
            intervals = [self.tap_times[i] - self.tap_times[i - 1] for i in range(1, len(self.tap_times))]
            avg_interval = sum(intervals) / len(intervals)
            new_tempo = min(max(int(60 / avg_interval), TEMPO_MIN), TEMPO_MAX)

            self.set_tempo(new_tempo)

    def detect_bpm(self):
        """Detect BPM using microphone input and set it in the application."""
        self.audio_processor.stop_metronome_during_detection(self.metronome)
        bpm = self.audio_processor.get_bpm_from_audio(duration=5)
        if bpm > 0:
            print(f"Detected BPM: {bpm:.2f}")
            self.set_tempo(int(bpm))
        else:
            print("Could not detect BPM. Please try again.")
        self.metronome.pause(False)  # Resume metronome after detection

    def set_tempo(self, new_tempo):
        self.metronome.set_tempo(new_tempo)
        self.sliders['tempo'].set_value(new_tempo)

    def set_subdivisions(self, new_subdiv):
        self.metronome.set_subdivisions(new_subdiv)
        self.subdivision_positions = get_circle_positions(CENTER, RADIUS, new_subdiv)
        self.first_beats = {0}
        self.accented_beats.clear()
        self.metronome.first_beats = self.first_beats
        self.metronome.accented_beats = self.accented_beats

    def update_metronome_from_sliders(self):
        swing = round(self.sliders['swing'].value, 2)
        volume = round(self.sliders['volume'].value, 2)
        tempo = int(self.sliders['tempo'].value)

        self.metronome.set_swing(swing)
        self.metronome.set_volume(volume)
        self.metronome.set_tempo(tempo)

        # Update Sound Manager volume
        self.sound_manager.set_volume(volume)

    def draw(self):
        self.screen.fill(WHITE)

        # Draw UI Elements
        draw.draw_outer_circle(self.screen)
        draw.draw_rotating_line(self.screen, self.metronome, self.subdivision_positions)
        draw.draw_subdivisions(self.screen, self.subdivision_positions, self.first_beats, self.accented_beats)

        # Draw Sliders
        for slider in self.sliders.values():
            slider.draw(self.screen, LIGHT_GREY, GREY, PRIMARY_COLOR, highlight=slider.dragging)

        # Display status and subdivisions
        status_text = "Paused" if self.metronome.paused else "Running"
        status_display = self.small_font.render(f'Status: {status_text}', True, BLACK)
        subdivisions_display = self.small_font.render(f'Subdivisions: {self.metronome.subdivisions}', True, BLACK)
        self.screen.blit(status_display, (30, 30))
        self.screen.blit(subdivisions_display, (30, 60))

        # Draw Info Button
        draw_info_button(self.screen, self.font, self.info_button_rect)

        if self.show_info:
            info_surface, popup_position = display_info_popup(self.font)
            self.screen.blit(info_surface, popup_position)

        pygame.display.flip()

    def run(self):
        while self.running:
            for event in pygame.event.get():
                self.event_handler.handle_event(event)

            self.update_metronome_from_sliders()
            self.draw()
            self.clock.tick(60)

        self.cleanup()

    def exit(self):
        self.running = False

    def cleanup(self):
        self.stop_event.set()
        self.metronome.join()
        pygame.quit()
