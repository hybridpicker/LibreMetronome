# ui/slider.py

import pygame
from constants import BLACK, ACCENT_COLOR

class Slider:
    def __init__(self, rect, knob_size, min_value, max_value, initial_value, label, font, orientation='horizontal', value_format="{:.0f}"):
        self.rect = pygame.Rect(rect)
        self.knob_size = knob_size
        self.min_value = min_value
        self.max_value = max_value
        self.value = initial_value
        self.label = label
        self.font = font
        self.orientation = orientation
        self.value_format = value_format
        
        if self.orientation == 'vertical':
            self.knob_y = self.rect.y + int((self.max_value - self.value) / (self.max_value - self.min_value) * (self.rect.height - self.knob_size))
            self.knob_x = self.rect.x + (self.rect.width - self.knob_size) // 2
        else:
            self.knob_x = self.rect.x + int((self.value - self.min_value) / (self.max_value - self.min_value) * (self.rect.width - self.knob_size))
            self.knob_y = self.rect.y + (self.rect.height - self.knob_size) // 2

        self.dragging = False

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN and self.get_knob_rect().collidepoint(event.pos):
            self.dragging = True
        elif event.type == pygame.MOUSEBUTTONUP:
            self.dragging = False
        elif event.type == pygame.MOUSEMOTION and self.dragging:
            if self.orientation == 'horizontal':
                mouse_x = event.pos[0]
                self.knob_x = max(self.rect.x, min(mouse_x - self.knob_size // 2, self.rect.x + self.rect.width - self.knob_size))
                relative_pos = (self.knob_x + self.knob_size / 2 - self.rect.x) / self.rect.width
                self.value = round(self.min_value + relative_pos * (self.max_value - self.min_value), 3)
            else:
                mouse_y = event.pos[1]
                self.knob_y = max(self.rect.y, min(mouse_y - self.knob_size // 2, self.rect.y + self.rect.height - self.knob_size))
                relative_pos = (self.knob_y + self.knob_size / 2 - self.rect.y) / self.rect.height
                self.value = round(self.max_value - relative_pos * (self.max_value - self.min_value), 3)  # Präzise Berechnung

    def get_knob_rect(self):
        return pygame.Rect(self.knob_x, self.knob_y, self.knob_size, self.knob_size)

    def draw(self, screen, color_bg, color_border, color_knob, highlight=False):
        pygame.draw.rect(screen, color_bg, self.rect, border_radius=10)
        pygame.draw.rect(screen, color_border, self.rect, 2, border_radius=10)

        knob_color = ACCENT_COLOR if highlight else color_knob
        pygame.draw.ellipse(screen, knob_color, self.get_knob_rect())
        pygame.draw.ellipse(screen, BLACK, self.get_knob_rect(), 2)

        label_text = self.font.render(f'{self.label}', True, BLACK)
        value_text = self.font.render(self.value_format.format(self.value), True, BLACK)

        if self.orientation == 'horizontal':
            label_pos = (self.rect.centerx - self.font.size(self.label)[0] // 2, self.rect.y - 40)
            value_pos = (self.rect.centerx - self.font.size(self.value_format.format(self.value))[0] // 2, self.rect.y + self.rect.height + 10)
        else:
            label_pos = (self.rect.x - 60, self.rect.centery - self.font.size(self.label)[1] // 2)
            value_pos = (self.rect.x + self.rect.width + 10, self.knob_y + self.knob_size // 2 - self.font.size(self.value_format.format(self.value))[1] // 2)

        screen.blit(label_text, label_pos)
        screen.blit(value_text, value_pos)
