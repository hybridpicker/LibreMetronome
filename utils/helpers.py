# utils/helpers.py

import math
from time import perf_counter

def get_circle_positions(center, radius, steps):
    """
    Calculate positions of points arranged on a circle.
    
    Args:
        center (tuple): (x, y) coordinates of the circle center.
        radius (int): Radius of the circle.
        steps (int): Number of subdivisions.
        
    Returns:
        list: List of (x, y) positions.
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
        pos (tuple): (x, y) coordinates of the mouse click.
        positions (list): List of (x, y) positions to check.
        
    Returns:
        int: Index of the clicked position or -1 if none was clicked.
    """
    for idx, circle_pos in enumerate(positions):
        distance = math.hypot(pos[0] - circle_pos[0], pos[1] - circle_pos[1])
        if distance < 20:
            return idx
    return -1

def get_subdivision_float(metronome):
    """
    Calculate current subdivision as a float for smooth animation.
    
    Args:
        metronome (MetronomeThread): The metronome thread instance.
        
    Returns:
        float: Current subdivision with fraction.
    """
    if metronome.paused:
        return float(metronome.current_subdivision)

    now = perf_counter()
    with metronome.lock:
        interval = metronome.intervals[metronome.current_subdivision]
    fraction = (now - metronome.last_tick_time) / interval
    fraction = min(max(fraction, 0.0), 1.0)

    return metronome.current_subdivision + fraction
