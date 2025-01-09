# ui/buttons.py

import pygame
from constants import LIGHT_GREY, BLACK

def draw_info_button(screen, font, rect, text="Info"):
    """Draws the Info button."""
    pygame.draw.rect(screen, LIGHT_GREY, rect)
    pygame.draw.rect(screen, BLACK, rect, 2)
    text_surface = font.render(text, True, BLACK)
    text_x = rect.x + (rect.width - text_surface.get_width()) // 2
    text_y = rect.y + (rect.height - text_surface.get_height()) // 2
    screen.blit(text_surface, (text_x, text_y))
