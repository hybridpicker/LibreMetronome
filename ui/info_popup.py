# ui/info_popup.py

import pygame
from constants import WHITE, BLACK, WIDTH, HEIGHT

def display_info_popup(font):
    """Displays a popup with keyboard shortcuts."""
    info_text = [
        "Shortcuts:",
        "SPACE: Start/Pause",
        "1-9: Change subdivisions",
        "Click on a circle: Toggle accent",
        "T: Tap Tempo",
        "I: Toggle Info"
    ]
    info_width, info_height = 400, 220
    info_surface = pygame.Surface((info_width, info_height))
    info_surface.fill(WHITE)

    for idx, line in enumerate(info_text):
        text_surface = font.render(line, True, BLACK)
        info_surface.blit(text_surface, (20, 20 + idx * 30))

    popup_position = ((WIDTH - info_width) // 2, (HEIGHT - info_height) // 2)
    return info_surface, popup_position
