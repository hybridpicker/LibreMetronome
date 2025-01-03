# slider.py

import pygame
from constants import BLACK, ACCENT_COLOR

class Slider:
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
        value_format="{:.0f}%"
    ):
        """
        - rect: The position and size of the slider (x, y, width, height).
        - knob_size: Diameter of the knob (if elliptical or circular).
        - min_value, max_value: The allowed range of values.
        - initial_value: Starting value within [min_value, max_value].
        - label: Text label shown near the slider.
        - font: Pygame font used to render texts.
        - orientation: 'horizontal' or 'vertical'.
        - value_format: Format string for displaying the value (e.g. "{:.1f}", "{:.0f}%", etc.).
        """
        self.rect = pygame.Rect(rect)
        self.knob_size = knob_size
        self.min_value = min_value
        self.max_value = max_value
        self.value = max(min_value, min(max_value, initial_value))  # clamp within range
        self.label = label
        self.font = font
        self.orientation = orientation
        self.value_format = value_format

        # Calculate the knob's initial position
        if self.orientation == 'vertical':
            # Vertical slider: top = max, bottom = min
            total_range = float(self.max_value - self.min_value)
            # Invert the axis so that top is max_value, bottom is min_value
            pct = (self.max_value - self.value) / total_range
            self.knob_y = int(self.rect.y + pct * (self.rect.height - self.knob_size))
            self.knob_x = self.rect.x + (self.rect.width - self.knob_size) // 2
        else:
            # Horizontal slider: left = min, right = max
            total_range = float(self.max_value - self.min_value)
            pct = (self.value - self.min_value) / total_range
            self.knob_x = int(self.rect.x + pct * (self.rect.width - self.knob_size))
            self.knob_y = self.rect.y + (self.rect.height - self.knob_size) // 2

        self.dragging = False

    def handle_event(self, event):
        """Update the slider value based on mouse interaction."""
        if event.type == pygame.MOUSEBUTTONDOWN and self.get_knob_rect().collidepoint(event.pos):
            self.dragging = True
        elif event.type == pygame.MOUSEBUTTONUP:
            self.dragging = False
        elif event.type == pygame.MOUSEMOTION and self.dragging:
            # Mouse is moving the knob
            if self.orientation == 'horizontal':
                mouse_x = event.pos[0]
                # Keep knob within slider area
                left_limit = self.rect.x
                right_limit = self.rect.x + self.rect.width - self.knob_size
                self.knob_x = max(left_limit, min(mouse_x - self.knob_size // 2, right_limit))

                # Recalculate value based on knob position
                knob_center = self.knob_x + self.knob_size / 2
                slider_pct = (knob_center - self.rect.x) / float(self.rect.width)
                new_val = self.min_value + slider_pct * (self.max_value - self.min_value)
                self.value = round(new_val, 3)  # store with minimal decimals
                # Clamp final
                self.value = max(self.min_value, min(self.max_value, self.value))

            else:  # vertical
                mouse_y = event.pos[1]
                top_limit = self.rect.y
                bottom_limit = self.rect.y + self.rect.height - self.knob_size
                self.knob_y = max(top_limit, min(mouse_y - self.knob_size // 2, bottom_limit))

                # Recalculate value (invert direction for vertical)
                knob_center = self.knob_y + self.knob_size / 2
                slider_pct = (knob_center - self.rect.y) / float(self.rect.height)
                new_val = self.max_value - slider_pct * (self.max_value - self.min_value)
                self.value = round(new_val, 3)
                self.value = max(self.min_value, min(self.max_value, self.value))

    def get_knob_rect(self):
        """Return the Rect representing the knob area."""
        return pygame.Rect(self.knob_x, self.knob_y, self.knob_size, self.knob_size)

    def draw(self, screen, color_bg, color_border, color_knob, highlight=False):
        """Draw slider background, knob, label, and current value on the screen."""
        # Draw the slider background
        pygame.draw.rect(screen, color_bg, self.rect, border_radius=10)
        pygame.draw.rect(screen, color_border, self.rect, 2, border_radius=10)

        # Draw the knob
        knob_color = ACCENT_COLOR if highlight else color_knob
        pygame.draw.ellipse(screen, knob_color, self.get_knob_rect())
        pygame.draw.ellipse(screen, BLACK, self.get_knob_rect(), 2)

        # Render the label
        label_text = self.font.render(self.label, True, BLACK)
        
        # Format the displayed value:
        # Example: if self.value_format = "{:.0f}%", and self.value=0.25, then we might do:
        #   display_value = "{:.0f}%".format(0.25 * 100) -> "25%"
        #   or if you want direct BPM -> "{:.0f}".format(self.value) -> "120", etc.
        #
        # => Adapt the multiplication by 100 only if your range is 0.0..1.0 for e.g. volume or swing.
        # => For a BPM slider from 26..294, you probably don't want the "* 100".
        
        display_value = self.value_format.format(self.value)
        value_text = self.font.render(display_value, True, BLACK)

        # Position texts
        if self.orientation == 'horizontal':
            # Label above the slider, value below the slider
            label_pos = (self.rect.centerx - label_text.get_width() // 2,
                         self.rect.y - label_text.get_height() - 5)
            value_pos = (self.rect.centerx - value_text.get_width() // 2,
                         self.rect.y + self.rect.height + 5)
        else:
            # Label to the left, value to the right
            label_pos = (self.rect.x - label_text.get_width() - 10,
                         self.rect.centery - label_text.get_height() // 2)
            value_pos = (self.rect.right + 10,
                         self.rect.centery - value_text.get_height() // 2)

        # Blit them onto screen
        screen.blit(label_text, label_pos)
        screen.blit(value_text, value_pos)
