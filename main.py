# main.py

import pygame
import math

from pygame.time import Clock
from threading import Event
from constants import (
    WHITE, PRIMARY_COLOR, ACCENT_COLOR, GREY, LIGHT_GREY, BLACK,
    WIDTH, HEIGHT, CENTER, RADIUS, TEMPO_MIN, TEMPO_MAX, TEMPO_RANGE,
    SWING_MAX, VOLUME_MAX
)
from metronome.metronome_thread import MetronomeThread
from ui.slider import Slider
from utils.helpers import get_circle_positions, get_clicked_point, get_subdivision_float
from time import perf_counter

def main():
    pygame.mixer.pre_init(frequency=44100, size=-16, channels=2, buffer=256)
    pygame.init()

    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Libre Metronome")

    # Improved fonts for better readability
    font = pygame.font.SysFont('Arial', 24, bold=True)
    small_font = pygame.font.SysFont('Arial', 20)

    subdivision_positions = get_circle_positions(CENTER, RADIUS, 4)  # Initial Subdivisions

    tap_times = []
    TAP_RESET_TIME = 2.0

    stop_event = Event()

    # Improved loading of sounds with clearer error messages
    try:
        sound_normal = pygame.mixer.Sound('assets/audio/metronome_click.mp3')
        sound_accent = pygame.mixer.Sound('assets/audio/metronome_click_accent.mp3')
        sound_first = pygame.mixer.Sound('assets/audio/metronome_click_first.mp3')
    except pygame.error as e:
        print("Error loading sounds:", e)
        sound_normal = sound_accent = sound_first = None

    # Metronome parameters
    tempo = 120
    subdivisions = 4
    first_beats = {0}
    accented_beats = set()

    metronome = MetronomeThread(
        tempo,
        subdivisions,
        first_beats,
        accented_beats,
        sound_normal,
        sound_accent,
        sound_first,
        stop_event
    )
    metronome.set_volume(1.0)
    metronome.start()

    running = True
    clock = Clock()

    # UI Components with vertical and horizontal orientation
    swing_slider = Slider(
        rect=(150, HEIGHT // 2 - 150, 20, 300),  # Vertical left
        knob_size=30,
        min_value=0.0,
        max_value=SWING_MAX,
        initial_value=0.0,
        label='Swing',
        font=font,
        orientation='vertical',
        value_format="{:.0%}"
    )

    volume_slider = Slider(
        rect=(WIDTH - 170, HEIGHT // 2 - 150, 20, 300),  # Vertical right
        knob_size=30,
        min_value=0.0,
        max_value=VOLUME_MAX,
        initial_value=1.0,
        label='Volume',
        font=font,
        orientation='vertical',
        value_format="{:.0%}"
    )

    tempo_slider = Slider(
        rect=(150, HEIGHT - 100, 700, 20),  # Horizontal bottom
        knob_size=30,
        min_value=TEMPO_MIN,
        max_value=TEMPO_MAX,
        initial_value=tempo,
        label='Tempo',
        font=font,
        orientation='horizontal',
        value_format="{:.0f} BPM"
    )

    sliders = {
        'swing': swing_slider,
        'volume': volume_slider,
        'tempo': tempo_slider
    }

    while running:
        screen.fill(WHITE)

        # Outer circle with better visibility and smoother lines
        pygame.draw.circle(screen, PRIMARY_COLOR, CENTER, RADIUS, 2)

        # Rotating pointer with animated color and smoother lines
        current_subdiv_float = get_subdivision_float(metronome)
        angle = 2 * math.pi * (current_subdiv_float / max(1, metronome.subdivisions)) - math.pi / 2
        line_end = (
            CENTER[0] + (RADIUS - 15) * math.cos(angle),
            CENTER[1] + (RADIUS - 15) * math.sin(angle)
        )
        pygame.draw.line(screen, ACCENT_COLOR, CENTER, line_end, 4)  # Thicker line and contrasting color

        # Subdivision points with clearer indicators and modern colors
        for idx, pos in enumerate(subdivision_positions):
            # Outline beats with higher contrast
            if idx in first_beats:
                pygame.draw.circle(screen, PRIMARY_COLOR, (int(pos[0]), int(pos[1])), 15, 2)
            elif idx in accented_beats:
                pygame.draw.circle(screen, ACCENT_COLOR, (int(pos[0]), int(pos[1])), 15, 2)

            # Fill the current subdivision point with distinct color
            if idx == metronome.current_subdivision:
                if idx in first_beats:
                    color = PRIMARY_COLOR
                elif idx in accented_beats:
                    color = ACCENT_COLOR
                else:
                    color = GREY
            else:
                color = GREY
            pygame.draw.circle(screen, color, (int(pos[0]), int(pos[1])), 10)

        # Connect polygons if enough subdivisions are present (optional, can be removed for more minimalism)
        if len(subdivision_positions) >= 3:
            polygon_points = [(int(px), int(py)) for px, py in subdivision_positions]
            pygame.draw.polygon(screen, GREY, polygon_points, 1)

        # Draw sliders with highlighting during interaction
        for name, slider in sliders.items():
            highlight = slider.dragging
            slider.draw(screen, LIGHT_GREY, GREY, PRIMARY_COLOR, highlight=highlight)

        # Status display with better readability and a modern look
        status_text = "Paused" if metronome.paused else "Running"
        status_display = small_font.render(f'Status: {status_text}', True, BLACK)
        screen.blit(status_display, (30, 30))

        # Display current subdivision
        subdiv_text = small_font.render(f'Subdivision: {metronome.subdivisions}', True, BLACK)
        screen.blit(subdiv_text, (30, 60))

        pygame.display.flip()

        # Event handling
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type in (pygame.MOUSEBUTTONDOWN, pygame.MOUSEBUTTONUP, pygame.MOUSEMOTION):
                # Interaction with sliders
                for slider in sliders.values():
                    slider.handle_event(event)

                if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    # Click on subdivision point: toggle accent
                    clicked_index = get_clicked_point(event.pos, subdivision_positions)
                    if clicked_index != -1 and clicked_index not in first_beats:
                        if clicked_index in accented_beats:
                            accented_beats.remove(clicked_index)
                        else:
                            accented_beats.add(clicked_index)
                        metronome.accented_beats = accented_beats

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_UP:
                    if metronome.tempo < TEMPO_MAX:
                        metronome.set_tempo(metronome.tempo + 5)
                        tempo_slider.value = metronome.tempo
                        tempo_slider.knob_x = tempo_slider.rect.x + int((metronome.tempo - TEMPO_MIN) / TEMPO_RANGE * (tempo_slider.rect.width - tempo_slider.knob_size))
                elif event.key == pygame.K_DOWN:
                    if metronome.tempo > TEMPO_MIN:
                        metronome.set_tempo(metronome.tempo - 5)
                        tempo_slider.value = metronome.tempo
                        tempo_slider.knob_x = tempo_slider.rect.x + int((metronome.tempo - TEMPO_MIN) / TEMPO_RANGE * (tempo_slider.rect.width - tempo_slider.knob_size))
                elif event.key == pygame.K_SPACE:
                    metronome.pause(not metronome.paused)
                elif event.key == pygame.K_t:
                    now = perf_counter()
                    if tap_times and now - tap_times[-1] > TAP_RESET_TIME:
                        tap_times = []
                    tap_times.append(now)
                    if len(tap_times) > 1:
                        intervals = [t2 - t1 for t1, t2 in zip(tap_times[:-1], tap_times[1:])]
                        avg_interval = sum(intervals) / len(intervals)
                        new_tempo = int(60 / avg_interval)
                        new_tempo = max(TEMPO_MIN, min(TEMPO_MAX, new_tempo))
                        metronome.set_tempo(new_tempo)
                        tempo_slider.value = new_tempo
                        tempo_slider.knob_x = tempo_slider.rect.x + int((new_tempo - TEMPO_MIN) / TEMPO_RANGE * (tempo_slider.rect.width - tempo_slider.knob_size))
                elif pygame.K_1 <= event.key <= pygame.K_9:
                    new_sub = event.key - pygame.K_0
                    metronome.set_subdivisions(new_sub)
                    subdivisions = new_sub
                    subdivision_positions = get_circle_positions(CENTER, RADIUS, subdivisions)
                    first_beats = {0}
                    metronome.first_beats = first_beats
                    accented_beats.clear()
                    metronome.accented_beats = accented_beats

        # Update metronome parameters based on sliders
        metronome.set_swing(swing_slider.value)
        metronome.set_volume(volume_slider.value)
        metronome.set_tempo(int(tempo_slider.value))

        clock.tick(60)

    # Terminate thread and quit Pygame
    stop_event.set()
    metronome.join()
    pygame.quit()

if __name__ == "__main__":
    main()