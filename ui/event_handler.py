# ui/event_handler.py

import pygame
from constants import TEMPO_MIN, TEMPO_MAX
from utils.helpers import get_clicked_point

class EventHandler:
    """
    Handles all Pygame events and delegates actions to the AppController.
    """

    def __init__(self, app_controller):
        """
        Initializes the EventHandler with a reference to the AppController.
        
        Args:
            app_controller (AppController): The main application controller.
        """
        self.app = app_controller

    def handle_event(self, event):
        """
        Processes a single Pygame event.
        
        Args:
            event (pygame.event.Event): The event to handle.
        """
        if event.type == pygame.QUIT:
            self.app.exit()

        elif event.type == pygame.MOUSEBUTTONDOWN:
            self.handle_mouse_button_down(event)

        elif event.type == pygame.MOUSEMOTION:
            self.handle_mouse_motion(event)

        elif event.type == pygame.MOUSEBUTTONUP:
            self.handle_mouse_button_up(event)

        elif event.type == pygame.KEYDOWN:
            self.handle_key_down(event)

    def handle_mouse_button_down(self, event):
        """Handles mouse button down events."""
        if self.app.info_button_rect.collidepoint(event.pos):
            self.app.toggle_info()
        else:
            # Check if user clicked on a subdivision circle
            clicked_index = get_clicked_point(event.pos, self.app.subdivision_positions)
            if clicked_index != -1 and clicked_index not in self.app.first_beats:
                # Toggle accent on that circle
                if clicked_index in self.app.accented_beats:
                    self.app.accented_beats.remove(clicked_index)
                else:
                    self.app.accented_beats.add(clicked_index)
                self.app.metronome.accented_beats = self.app.accented_beats

            # Sliders
            for slider in self.app.sliders.values():
                slider.handle_event(event)

    def handle_mouse_motion(self, event):
        """Handles mouse motion events."""
        for slider in self.app.sliders.values():
            slider.handle_event(event)

    def handle_mouse_button_up(self, event):
        """Handles mouse button up events."""
        for slider in self.app.sliders.values():
            slider.handle_event(event)

    def handle_key_down(self, event):
        """Handles key down events."""
        if event.key == pygame.K_SPACE:
            self.app.toggle_pause()

        elif event.key == pygame.K_i:
            self.app.toggle_info()

        elif event.key == pygame.K_t:
            self.app.tap_tempo()

        elif pygame.K_1 <= event.key <= pygame.K_9:
            new_subdiv = event.key - pygame.K_0
            self.app.set_subdivisions(new_subdiv)
