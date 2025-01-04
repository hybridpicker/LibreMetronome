# ui/draw.py

import pygame
import math
from constants import PRIMARY_COLOR, ACCENT_COLOR, GREY, LIGHT_GREY, BLACK, CENTER, RADIUS
from utils.helpers import get_subdivision_float

def draw_subdivisions(screen, subdivision_positions, first_beats, accented_beats):
    """Draws the subdivision circles."""
    for idx, pos in enumerate(subdivision_positions):
        if idx in first_beats:
            color = PRIMARY_COLOR
        elif idx in accented_beats:
            color = ACCENT_COLOR
        else:
            color = GREY
        pygame.draw.circle(screen, color, (int(pos[0]), int(pos[1])), 10)

def draw_rotating_line(screen, metronome, subdivision_positions):
    """Draws the rotating line indicating the current subdivision."""
    current_subdiv_float = get_subdivision_float(metronome)
    angle = 2 * math.pi * (current_subdiv_float / max(1, metronome.subdivisions)) - math.pi / 2
    line_end = (
        CENTER[0] + (RADIUS - 15) * math.cos(angle),
        CENTER[1] + (RADIUS - 15) * math.sin(angle)
    )
    pygame.draw.line(screen, ACCENT_COLOR, CENTER, line_end, 4)

def draw_outer_circle(screen):
    """Draws the outer circle for subdivisions."""
    pygame.draw.circle(screen, PRIMARY_COLOR, CENTER, RADIUS, 2)
