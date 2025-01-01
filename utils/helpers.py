# utils/helpers.py

import math
from time import perf_counter

def get_circle_positions(center, radius, steps):
    """
    Calculate positions of points arranged in a circle.

    Args:
        center (tuple): The (x, y) coordinates of the circle's center.
        radius (int): The radius of the circle.
        steps (int): Number of points to calculate.

    Returns:
        list: A list of (x, y) tuples representing the positions.
    """
    positions = []
    for step in range(steps):
        angle = 2 * math.pi * (step / steps) - math.pi / 2
        x = center[0] + radius * math.cos(angle)
        y = center[1] + radius * math.sin(angle)
        positions.append((x, y))
    return positions

def get_clicked_point(pos, positions):
    """
    Determine which point was clicked based on the mouse position.

    Args:
        pos (tuple): The (x, y) coordinates of the mouse click.
        positions (list): A list of (x, y) tuples representing points.

    Returns:
        int: The index of the clicked point, or -1 if none.
    """
    for idx, circle_pos in enumerate(positions):
        distance = math.hypot(pos[0] - circle_pos[0], pos[1] - circle_pos[1])
        if distance < 20:  # Larger click area for better usability
            return idx
    return -1

def get_subdivision_float(metronome):
    """
    Calculate the current subdivision as a float for smooth animation.

    Args:
        metronome (MetronomeThread): The metronome thread instance.

    Returns:
        float: The current subdivision with fractional progress.
    """
    if metronome.paused:
        return float(metronome.current_subdivision)
    
    now = perf_counter()
    with metronome.lock:
        interval = metronome.intervals[metronome.current_subdivision]
    fraction = (now - metronome.last_tick_time) / interval
    fraction = min(max(fraction, 0.0), 1.0)
    
    return metronome.current_subdivision + fraction