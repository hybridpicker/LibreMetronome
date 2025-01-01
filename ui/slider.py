# ui/slider.py

import pygame
from constants import BLACK, ACCENT_COLOR, LIGHT_GREY, GREY

class Slider:
    """
    A Slider UI component for Pygame.

    Attributes:
        rect (pygame.Rect): The position and size of the slider.
        knob_size (int): The size of the knob.
        min_value (float): The minimum value of the slider.
        max_value (float): The maximum value of the slider.
        value (float): The current value of the slider.
        label (str): The label of the slider.
        font (pygame.font.Font): The font for the label.
        orientation (str): The orientation of the slider ('horizontal' or 'vertical').
        value_format (str): The format for displaying the value.
    """
    def __init__(self, rect, knob_size, min_value, max_value, initial_value, label, font, orientation='horizontal', value_format="{:.0f}"):
        self.rect = pygame.Rect(rect)
        self.knob_size = knob_size
        self.min_value = min_value
        self.max_value = max_value
        self.value = initial_value
        self.label = label
        self.font = font
        self.orientation = orientation  # 'horizontal' or 'vertical'
        self.value_format = value_format

        if self.orientation == 'horizontal':
            self.knob_x = self.rect.x + int((self.value - self.min_value) / (self.max_value - self.min_value) * (self.rect.width - self.knob_size))
            self.knob_y = self.rect.y + (self.rect.height - self.knob_size) // 2
        else:
            # Inverted positioning for vertical sliders (0 at bottom, max at top)
            self.knob_y = self.rect.y + int((self.max_value - self.value) / (self.max_value - self.min_value) * (self.rect.height - self.knob_size))
            self.knob_x = self.rect.x + (self.rect.width - self.knob_size) // 2

        self.dragging = False

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN:
            if self.get_knob_rect().collidepoint(event.pos):
                self.dragging = True
        elif event.type == pygame.MOUSEBUTTONUP:
            self.dragging = False
        elif event.type == pygame.MOUSEMOTION:
            if self.dragging:
                if self.orientation == 'horizontal':
                    mouse_x = event.pos[0]
                    self.knob_x = max(self.rect.x, min(mouse_x - self.knob_size // 2, self.rect.x + self.rect.width - self.knob_size))
                    relative_pos = (self.knob_x + self.knob_size / 2 - self.rect.x) / self.rect.width
                    self.value = self.min_value + relative_pos * (self.max_value - self.min_value)
                else:
                    mouse_y = event.pos[1]
                    self.knob_y = max(self.rect.y, min(mouse_y - self.knob_size // 2, self.rect.y + self.rect.height - self.knob_size))
                    relative_pos = (self.knob_y + self.knob_size / 2 - self.rect.y) / self.rect.height
                    # Inverted value mapping for vertical sliders
                    self.value = self.max_value - relative_pos * (self.max_value - self.min_value)

    def get_knob_rect(self):
        return pygame.Rect(self.knob_x, self.knob_y, self.knob_size, self.knob_size)

    def draw(self, screen, color_bg, color_border, color_knob, highlight=False):
        # Slider background
        pygame.draw.rect(screen, color_bg, self.rect, border_radius=10)
        # Slider border
        pygame.draw.rect(screen, color_border, self.rect, 2, border_radius=10)
        # Draw knob
        knob_color = ACCENT_COLOR if highlight else color_knob
        knob_rect = self.get_knob_rect()
        pygame.draw.ellipse(screen, knob_color, knob_rect)
        pygame.draw.ellipse(screen, BLACK, knob_rect, 2)
        # Label
        if self.orientation == 'horizontal':
            label_pos = (self.rect.centerx - self.font.size(self.label)[0] // 2, self.rect.y - 40)
            value_pos = (self.rect.centerx - self.font.size(self.value_format.format(self.value))[0] // 2, self.rect.y + self.rect.height + 10)
        else:
            label_pos = (self.rect.x - 60, self.rect.centery - self.font.size(self.label)[1] // 2)
            value_pos = (self.rect.x + self.rect.width + 10, self.knob_y + self.knob_size // 2 - self.font.size(self.value_format.format(self.value))[1] // 2)

        label_text = self.font.render(f'{self.label}', True, BLACK)
        screen.blit(label_text, label_pos)

        # Display value
        value_text = self.font.render(f'{self.value_format.format(self.value)}', True, BLACK)
        screen.blit(value_text, value_pos)