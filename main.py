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

    font = pygame.font.SysFont('Arial', 24, bold=True)
    small_font = pygame.font.SysFont('Arial', 20)

    # Initialisierung
    stop_event = Event()
    subdivision_positions = get_circle_positions(CENTER, RADIUS, 4)
    first_beats = {0}
    accented_beats = set()

    try:
        sound_normal = pygame.mixer.Sound('assets/audio/click_new.mp3')
        sound_accent = pygame.mixer.Sound('assets/audio/click_new_accent.mp3')
        sound_first = pygame.mixer.Sound('assets/audio/click_new_first.mp3')
    except pygame.error as e:
        print(f"Error loading sounds: {e}")
        sound_normal = sound_accent = sound_first = None

    metronome = MetronomeThread(
        tempo=120,
        subdivisions=4,
        first_beats=first_beats,
        accented_beats=accented_beats,
        sound_normal=sound_normal,
        sound_accent=sound_accent,
        sound_first=sound_first,
        stop_event=stop_event
    )
    metronome.set_volume(1.0)
    metronome.start()

    # Slider für Swing, Volume und Tempo
    swing_slider = Slider(
        rect=(150, HEIGHT // 2 - 150, 20, 300),
        knob_size=30,
        min_value=0.0,
        max_value=SWING_MAX,
        initial_value=0.0,
        label='Swing',
        font=font,
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
        font=font,
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
        font=font,
        orientation='horizontal',
        value_format="{:.0f} BPM"
    )

    sliders = {
        'swing': swing_slider,
        'volume': volume_slider,
        'tempo': tempo_slider
    }

    running = True
    clock = Clock()

    while running:
        screen.fill(WHITE)

        # Zeichnen der UI-Komponenten
        pygame.draw.circle(screen, PRIMARY_COLOR, CENTER, RADIUS, 2)

        # Rotierender Cursor
        current_subdiv_float = get_subdivision_float(metronome)
        angle = 2 * math.pi * (current_subdiv_float / max(1, metronome.subdivisions)) - math.pi / 2
        line_end = (
            CENTER[0] + (RADIUS - 15) * math.cos(angle),
            CENTER[1] + (RADIUS - 15) * math.sin(angle)
        )
        pygame.draw.line(screen, ACCENT_COLOR, CENTER, line_end, 4)

        # Subdivisionen anzeigen
        for idx, pos in enumerate(subdivision_positions):
            if idx in first_beats:
                color = PRIMARY_COLOR
            elif idx in accented_beats:
                color = ACCENT_COLOR
            else:
                color = GREY
            pygame.draw.circle(screen, color, (int(pos[0]), int(pos[1])), 10)

        for name, slider in sliders.items():
            slider.draw(screen, LIGHT_GREY, GREY, PRIMARY_COLOR, highlight=slider.dragging)

        # Statusanzeige
        status_text = "Paused" if metronome.paused else "Running"
        status_display = small_font.render(f'Status: {status_text}', True, BLACK)
        screen.blit(status_display, (30, 30))

        pygame.display.flip()

        # Event-Handling
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type in (pygame.MOUSEBUTTONDOWN, pygame.MOUSEBUTTONUP, pygame.MOUSEMOTION):
                for slider in sliders.values():
                    slider.handle_event(event)

                if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    clicked_index = get_clicked_point(event.pos, subdivision_positions)
                    if clicked_index != -1 and clicked_index not in first_beats:
                        if clicked_index in accented_beats:
                            accented_beats.remove(clicked_index)
                        else:
                            accented_beats.add(clicked_index)
                        metronome.accented_beats = accented_beats

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    metronome.pause(not metronome.paused)
                elif pygame.K_1 <= event.key <= pygame.K_9:
                    new_subdiv = event.key - pygame.K_0
                    metronome.set_subdivisions(new_subdiv)
                    subdivision_positions = get_circle_positions(CENTER, RADIUS, new_subdiv)
                    first_beats = {0}
                    metronome.first_beats = first_beats
                    accented_beats.clear()
                    metronome.accented_beats = accented_beats

        # Slider-Werte anpassen
        metronome.set_swing(round(swing_slider.value, 2))
        metronome.set_volume(round(volume_slider.value, 2))
        metronome.set_tempo(int(tempo_slider.value))

        clock.tick(60)

    stop_event.set()
    metronome.join()
    pygame.quit()


if __name__ == "__main__":
    main()
