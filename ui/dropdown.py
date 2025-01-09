# ui/dropdown.py

import pygame
from constants import BLACK, GREY, LIGHT_GREY, PRIMARY_COLOR, ACCENT_COLOR
import logging

class Dropdown:
    """
    A simple dropdown menu for selecting options.
    """

    def __init__(self, rect, font, options, default_index=0, label=""):
        """
        Initializes the Dropdown.

        Args:
            rect (tuple): (x, y, width, height) of the dropdown.
            font (pygame.font.Font): Font for rendering text.
            options (list): List of string options.
            default_index (int): Index of the default selected option.
            label (str): Label for the dropdown.
        """
        self.rect = pygame.Rect(rect)
        self.font = font
        self.options = options
        self.selected_index = default_index
        self.label = label

        self.expanded = False
        self.option_rects = []
        for i, option in enumerate(self.options):
            option_rect = pygame.Rect(rect[0], rect[1] + (i + 1) * rect[3], rect[2], rect[3])
            self.option_rects.append(option_rect)

        # Logger
        self.logger = logging.getLogger(__name__)

    def handle_event(self, event):
        """
        Handles Pygame events related to the dropdown.

        Args:
            event (pygame.event.Event): The event to handle.
        """
        try:
            if event.type == pygame.MOUSEBUTTONDOWN:
                if self.rect.collidepoint(event.pos):
                    self.expanded = not self.expanded
                    self.logger.debug(f"Dropdown '{self.label}' expanded: {self.expanded}")
                elif self.expanded:
                    clicked = False
                    for idx, option_rect in enumerate(self.option_rects):
                        if option_rect.collidepoint(event.pos):
                            self.selected_index = idx
                            self.expanded = False
                            self.logger.debug(f"Dropdown '{self.label}' option '{self.options[idx]}' selected")
                            clicked = True
                            break
                    if not clicked:
                        self.expanded = False
                        self.logger.debug(f"Dropdown '{self.label}' collapsed")
        except Exception as e:
            self.logger.exception(f"Error handling event in dropdown '{self.label}': {e}")

    def draw(self, screen, color_bg, color_border, color_text, highlight=False):
        """
        Renders the dropdown to the screen.

        Args:
            screen (pygame.Surface): The surface to draw on.
            color_bg (tuple): Background color of the dropdown.
            color_border (tuple): Border color of the dropdown.
            color_text (tuple): Text color.
            highlight (bool): Whether the dropdown is highlighted (active).
        """
        try:
            # Draw label if exists
            if self.label:
                label_surface = self.font.render(self.label, True, BLACK)
                screen.blit(label_surface, (self.rect.x, self.rect.y - 25))

            # Draw the main dropdown rectangle
            pygame.draw.rect(screen, color_bg, self.rect, border_radius=5)
            pygame.draw.rect(screen, color_border, self.rect, 2, border_radius=5)

            # Draw the selected option
            selected_text = self.options[self.selected_index]
            text_surface = self.font.render(selected_text, True, color_text)
            screen.blit(text_surface, (self.rect.x + 5, self.rect.y + (self.rect.height - text_surface.get_height()) // 2))

            # Draw the dropdown arrow
            pygame.draw.polygon(screen, color_text, [
                (self.rect.x + self.rect.width - 20, self.rect.y + self.rect.height // 3),
                (self.rect.x + self.rect.width - 10, self.rect.y + self.rect.height // 3),
                (self.rect.x + self.rect.width - 15, self.rect.y + 2 * self.rect.height // 3)
            ])

            # If expanded, draw all options
            if self.expanded:
                for idx, option_rect in enumerate(self.option_rects):
                    pygame.draw.rect(screen, GREY if idx % 2 == 0 else LIGHT_GREY, option_rect)
                    pygame.draw.rect(screen, BLACK, option_rect, 1)
                    option_text = self.options[idx]
                    option_surface = self.font.render(option_text, True, BLACK)
                    screen.blit(option_surface, (option_rect.x + 5, option_rect.y + (option_rect.height - option_surface.get_height()) // 2))
        except Exception as e:
            self.logger.exception(f"Error drawing dropdown '{self.label}': {e}")