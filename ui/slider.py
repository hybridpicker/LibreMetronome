# ui/slider.py

import pygame
from constants import BLACK, ACCENT_COLOR

class Slider:
    """
    A generic slider class supporting both horizontal and vertical orientations.
    Displays a label above the slider (if horizontal) or to the left (if vertical).
    Also displays the current value near the slider.
    """

    def __init__(
        self,
        rect,
        knob_size,
        min_value,
        max_value,
        initial_value,
        label,
        font,
        orientation='horizontal',
        value_format="{:.0f}"
    ):
        # Basic properties
        self.rect = pygame.Rect(rect)
        self.knob_size = knob_size
        self.min_value = min_value
        self.max_value = max_value
        self.value = max(self.min_value, min(self.max_value, initial_value))

        self.label = label
        self.font = font
        self.orientation = orientation
        self.value_format = value_format

        self.dragging = False

        # Compute the initial knob position
        self.update_knob_position()

    def update_knob_position(self):
        """Updates the knob position based on the current value."""
        if self.orientation == 'horizontal':
            fraction = (self.value - self.min_value) / (self.max_value - self.min_value)
            self.knob_x = self.rect.x + int(fraction * (self.rect.width - self.knob_size))
            self.knob_y = self.rect.y + (self.rect.height - self.knob_size) // 2
        else:
            # For a vertical slider, we assume top is max_value, bottom is min_value
            fraction = (self.max_value - self.value) / (self.max_value - self.min_value)
            self.knob_y = self.rect.y + int(fraction * (self.rect.height - self.knob_size))
            self.knob_x = self.rect.x + (self.rect.width - self.knob_size) // 2

    def handle_event(self, event):
        """Updates the slider value based on mouse interactions."""
        if event.type == pygame.MOUSEBUTTONDOWN:
            # Check if the user clicked on the knob
            if self.get_knob_rect().collidepoint(event.pos):
                self.dragging = True

        elif event.type == pygame.MOUSEBUTTONUP:
            self.dragging = False

        elif event.type == pygame.MOUSEMOTION and self.dragging:
            if self.orientation == 'horizontal':
                mouse_x = event.pos[0]
                left_limit = self.rect.x
                right_limit = self.rect.x + self.rect.width - self.knob_size
                self.knob_x = max(left_limit, min(mouse_x - self.knob_size // 2, right_limit))

                fraction = (self.knob_x - self.rect.x) / float(self.rect.width - self.knob_size)
                new_val = self.min_value + fraction * (self.max_value - self.min_value)
                self.value = round(new_val, 3)
                self.value = max(self.min_value, min(self.max_value, self.value))
            else:  # 'vertical'
                mouse_y = event.pos[1]
                top_limit = self.rect.y
                bottom_limit = self.rect.y + self.rect.height - self.knob_size
                self.knob_y = max(top_limit, min(mouse_y - self.knob_size // 2, bottom_limit))

                fraction = (self.knob_y - self.rect.y) / float(self.rect.height - self.knob_size)
                # Invert fraction for top= max_value
                new_val = self.max_value - fraction * (self.max_value - self.min_value)
                self.value = round(new_val, 3)
                self.value = max(self.min_value, min(self.max_value, self.value))

            self.update_knob_position()

    def get_knob_rect(self):
        """Returns the rectangle area of the knob."""
        return pygame.Rect(self.knob_x, self.knob_y, self.knob_size, self.knob_size)

    def draw(self, screen, color_bg, color_border, color_knob, highlight=False):
        """Render the slider track, knob, label above it, and the current value."""
        # Draw slider track
        pygame.draw.rect(screen, color_bg, self.rect, border_radius=8)
        pygame.draw.rect(screen, color_border, self.rect, 2, border_radius=8)

        # Determine knob color (highlight if dragging)
        knob_color = ACCENT_COLOR if highlight else color_knob
        pygame.draw.ellipse(screen, knob_color, self.get_knob_rect())
        pygame.draw.ellipse(screen, BLACK, self.get_knob_rect(), 2)

        # Create label text
        label_surface = self.font.render(self.label, True, BLACK)

        # Format the slider value according to user format.
        display_value_str = self.value_format.format(self.value)
        value_surface = self.font.render(display_value_str, True, BLACK)

        if self.orientation == 'horizontal':
            # Place label above the slider, value below
            label_x = self.rect.centerx - (label_surface.get_width() // 2)
            label_y = self.rect.y - label_surface.get_height() - 5

            value_x = self.rect.centerx - (value_surface.get_width() // 2)
            value_y = self.rect.y + self.rect.height + 5

            screen.blit(label_surface, (label_x, label_y))
            screen.blit(value_surface, (value_x, value_y))

        else:
            # Place label above the slider (centered horizontally)
            # and the value just below the label
            label_x = self.rect.x + (self.rect.width // 2) - (label_surface.get_width() // 2)
            label_y = self.rect.y - label_surface.get_height() - 10

            # Place the value below the label
            value_x = self.rect.x + (self.rect.width // 2) - (value_surface.get_width() // 2)
            value_y = self.rect.y + self.rect.height + 5

            # Draw the label above
            screen.blit(label_surface, (label_x, label_y))
            # Draw the value below
            screen.blit(value_surface, (value_x, value_y))

    def set_value(self, new_value):
        """Set the slider value programmatically."""
        self.value = max(self.min_value, min(self.max_value, new_value))
        self.update_knob_position()
