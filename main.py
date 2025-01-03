import pygame
import math
from pygame.time import Clock
from threading import Event
from constants import (
    WHITE, PRIMARY_COLOR, ACCENT_COLOR, GREY, LIGHT_GREY, BLACK,
    WIDTH, HEIGHT, CENTER, RADIUS, TEMPO_MIN, TEMPO_MAX,
    SWING_MAX, VOLUME_MAX
)
from metronome.metronome_thread import MetronomeThread
from ui.slider import Slider
from utils.helpers import get_circle_positions, get_clicked_point, get_subdivision_float
from time import perf_counter


def display_info_popup():
    """Displays a popup with keyboard shortcuts."""
    font = pygame.font.SysFont('Arial', 20)
    info_text = [
        "Shortcuts:",
        "SPACE: Start/Pause (resets on unpause)",
        "1-9: Change subdivisions",
        "Click: Toggle accent",
        "T: Tap Tempo",
        "I: Toggle Info"
    ]
    info_width, info_height = 400, 220
    info_surface = pygame.Surface((info_width, info_height))
    info_surface.fill(WHITE)

    for idx, line in enumerate(info_text):
        text_surface = font.render(line, True, BLACK)
        info_surface.blit(text_surface, (20, 20 + idx * 30))

    return info_surface


def main():
    """
    Main function for the Libre Metronome app.
    Integrates metronome control, sliders (Swing, Volume, Tempo),
    and a simple UI with visual subdivisions and rotating cursor.
    Resets to first beat on unpause (SPACE).
    """

    # Initialize the mixer for low latency
    pygame.mixer.pre_init(frequency=44100, size=-16, channels=2, buffer=256)
    pygame.init()

    # Create the main window
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Libre Metronome")

    font = pygame.font.SysFont('Arial', 24, bold=True)
    small_font = pygame.font.SysFont('Arial', 20)

    # Event to stop the metronome thread on exit
    stop_event = Event()

    # Initial subdivisions (e.g., 4)
    subdivision_positions = get_circle_positions(CENTER, RADIUS, 4)
    first_beats = {0}     # which subdivision(s) get the first-beat sound
    accented_beats = set()

    # --------------------
    # Load the click sounds
    # --------------------
    try:
        sound_normal = pygame.mixer.Sound('assets/audio/click_new.mp3')
        sound_accent = pygame.mixer.Sound('assets/audio/click_new_accent.mp3')
        sound_first = pygame.mixer.Sound('assets/audio/click_new_first.mp3')
    except pygame.error as e:
        print(f"Error loading sounds: {e}")
        sound_normal = sound_accent = sound_first = None

    # ---------------------------------------------
    # Initialize and start the metronome thread
    # ---------------------------------------------
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
    metronome.set_volume(1.0)  # start at 100% volume
    metronome.start()

    # --------------------------------
    # Create Sliders for Swing, Volume, Tempo
    # --------------------------------
    swing_slider = Slider(
        rect=(150, HEIGHT // 2 - 150, 20, 300),
        knob_size=30,
        min_value=0.0,
        max_value=SWING_MAX,
        initial_value=0.0,
        label='Swing',
        font=font,
        orientation='vertical',
        # e.g. 0.20 -> "20.0%"
        value_format="{:.1%}"
    )

    volume_slider = Slider(
        rect=(WIDTH - 170, HEIGHT // 2 - 150, 20, 300),
        knob_size=30,
        min_value=0.0,
        max_value=VOLUME_MAX,  # 1.0
        initial_value=1.0,
        label='Volume',
        font=font,
        orientation='vertical',
        # e.g. 1.0 -> "100%"
        value_format="{:.0%}"
    )

    tempo_slider = Slider(
        rect=(150, HEIGHT - 100, 700, 20),
        knob_size=30,
        min_value=TEMPO_MIN,   # e.g. 26
        max_value=TEMPO_MAX,   # e.g. 294
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

    # Button to toggle info popup
    info_button_rect = pygame.Rect(WIDTH - 100, 20, 80, 40)
    show_info = False

    # Tap Tempo storage
    tap_times = []
    TAP_RESET_TIME = 2.0  # Reset taps if time gap is > 2s

    while running:
        screen.fill(WHITE)

        # 1) Draw the circle (outer ring)
        pygame.draw.circle(screen, PRIMARY_COLOR, CENTER, RADIUS, 2)

        # 2) Draw the rotating line indicating current subdivision
        current_subdiv_float = get_subdivision_float(metronome)
        angle = 2 * math.pi * (current_subdiv_float / max(1, metronome.subdivisions)) - math.pi / 2
        line_end = (
            CENTER[0] + (RADIUS - 15) * math.cos(angle),
            CENTER[1] + (RADIUS - 15) * math.sin(angle)
        )
        pygame.draw.line(screen, ACCENT_COLOR, CENTER, line_end, 4)

        # 3) Draw circles for each subdivision
        for idx, pos in enumerate(subdivision_positions):
            if idx in first_beats:
                color = PRIMARY_COLOR
            elif idx in accented_beats:
                color = ACCENT_COLOR
            else:
                color = GREY
            pygame.draw.circle(screen, color, (int(pos[0]), int(pos[1])), 10)

        # 4) Draw Sliders
        for slider in sliders.values():
            slider.draw(screen, LIGHT_GREY, GREY, PRIMARY_COLOR, highlight=slider.dragging)

        # 5) Display status (Paused/Running) + Subdivisions
        status_text = "Paused" if metronome.paused else "Running"
        status_display = small_font.render(f'Status: {status_text}', True, BLACK)
        subdivisions_display = small_font.render(f'Subdivisions: {metronome.subdivisions}', True, BLACK)
        screen.blit(status_display, (30, 30))
        screen.blit(subdivisions_display, (30, 60))

        # 6) Draw Info button
        pygame.draw.rect(screen, LIGHT_GREY, info_button_rect)
        pygame.draw.rect(screen, BLACK, info_button_rect, 2)
        info_text = font.render("Info", True, BLACK)
        screen.blit(info_text, (info_button_rect.x + 15, info_button_rect.y + 5))

        if show_info:
            info_surface = display_info_popup()
            screen.blit(info_surface, ((WIDTH - 400) // 2, (HEIGHT - 220) // 2))

        pygame.display.flip()

        # -----------------------
        # Event Handling
        # -----------------------
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.MOUSEBUTTONDOWN:
                if info_button_rect.collidepoint(event.pos):
                    show_info = not show_info
                else:
                    # Check if clicked on a subdivision circle
                    clicked_index = get_clicked_point(event.pos, subdivision_positions)
                    if clicked_index != -1 and clicked_index not in first_beats:
                        # Toggle accent
                        if clicked_index in accented_beats:
                            accented_beats.remove(clicked_index)
                        else:
                            accented_beats.add(clicked_index)
                        metronome.accented_beats = accented_beats

                    # Pass event to all sliders
                    for slider in sliders.values():
                        slider.handle_event(event)

            elif event.type == pygame.MOUSEMOTION:
                for slider in sliders.values():
                    slider.handle_event(event)

            elif event.type == pygame.MOUSEBUTTONUP:
                for slider in sliders.values():
                    slider.handle_event(event)

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    # Toggle pause state
                    new_pause_state = not metronome.paused
                    metronome.pause(new_pause_state)

                    # If we have just unpaused (meaning new_pause_state is False),
                    # reset to first subdivision and play the first beat immediately
                    if not new_pause_state:
                        # current_subdivision = 0 => visual reset
                        metronome.current_subdivision = 0
                        metronome.last_tick_time = perf_counter()

                        # Play first beat sound right away (if it's defined)
                        if 0 in metronome.first_beats and metronome.sound_first:
                            metronome.sound_first.play()

                elif event.key == pygame.K_i:
                    # Toggle info overlay
                    show_info = not show_info

                elif event.key == pygame.K_t:
                    # Tap Tempo
                    now = perf_counter()
                    if tap_times and (now - tap_times[-1] > TAP_RESET_TIME):
                        tap_times = []
                    tap_times.append(now)

                    if len(tap_times) > 1:
                        intervals = [tap_times[i] - tap_times[i - 1] for i in range(1, len(tap_times))]
                        avg_interval = sum(intervals) / len(intervals)
                        new_tempo = min(max(int(60 / avg_interval), TEMPO_MIN), TEMPO_MAX)

                        metronome.set_tempo(new_tempo)
                        tempo_slider.value = new_tempo
                        # Move slider knob visually
                        tempo_slider.knob_x = tempo_slider.rect.x + int(
                            (tempo_slider.value - tempo_slider.min_value)
                            / (tempo_slider.max_value - tempo_slider.min_value)
                            * (tempo_slider.rect.width - tempo_slider.knob_size)
                        )

                elif pygame.K_1 <= event.key <= pygame.K_9:
                    new_subdiv = event.key - pygame.K_0  # 1..9
                    metronome.set_subdivisions(new_subdiv)
                    subdivision_positions = get_circle_positions(CENTER, RADIUS, new_subdiv)

                    # Reset first and accented sets
                    first_beats = {0}
                    accented_beats.clear()
                    metronome.first_beats = first_beats
                    metronome.accented_beats = accented_beats

        # -----------------------
        # Update Metronome params from Sliders
        # -----------------------
        metronome.set_swing(round(swing_slider.value, 2))
        metronome.set_volume(round(volume_slider.value, 2))
        metronome.set_tempo(int(tempo_slider.value))

        clock.tick(60)

    # Cleanup on exit
    stop_event.set()
    metronome.join()
    pygame.quit()


if __name__ == "__main__":
    main()
