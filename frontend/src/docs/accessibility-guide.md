# LibreMetronome Accessibility Guide

LibreMetronome is designed to be accessible for all users, including those with disabilities. This guide explains the accessibility features available and how to use them.

## Accessing Accessibility Settings

1. Click the menu button (⚙️) in the top right corner of the screen.
2. Select the "Settings" tab.
3. Click on the "Accessibility" sub-tab.

## Available Features

### Display Options

#### High Contrast Mode
Enhances color contrast throughout the application for better visibility. This is especially helpful for users with low vision or color vision deficiencies.

#### Large Text
Increases the size of text throughout the application, making it easier to read for users with visual impairments.

#### Reduced Motion
Minimizes animations and visual effects for users who are sensitive to motion or have vestibular disorders.

### Feedback Options

#### Audio Feedback
Plays subtle sounds when you interact with buttons and controls, providing additional feedback beyond visual cues.

#### Screen Reader Announcements
Provides detailed announcements for screen readers, including beat counts, tempo changes, and other important information.

## Keyboard Shortcuts

LibreMetronome can be fully controlled using a keyboard:

- **Space**: Play/Pause the metronome
- **T**: Tap tempo (tap repeatedly to set the tempo)
- **1-9**: Set beats per measure
- **↑/↓**: Increase/decrease tempo by 1 BPM
- **←/→**: Increase/decrease tempo by 5 BPM
- **+/-**: Adjust volume
- **S**: Open settings menu
- **ESC**: Close any open dialog or menu

## Beat Visualization

For users who have difficulty seeing the standard metronome visualization:

1. When accessibility features are enabled, an additional beat indicator appears below the main metronome visualization.
2. This indicator shows the current beat with high contrast colors and larger elements.
3. The first beat and accented beats are clearly distinguished.

## Using with Screen Readers

LibreMetronome works with popular screen readers including:
- NVDA and JAWS (Windows)
- VoiceOver (Mac/iOS)
- TalkBack (Android)

When using a screen reader:
1. The application announces the current state (playing/paused)
2. Tempo and time signature changes are announced
3. The first beat of each measure is announced
4. All controls have proper labels and ARIA attributes

## System Preferences

LibreMetronome respects your system preferences:
- If you have "Reduce Motion" enabled in your operating system settings, the app will automatically enable Reduced Motion mode.
- Your preferences are saved between sessions.

## Touch Device Support

All accessibility features work on touch devices:
- Buttons and controls are sized appropriately for touch
- Audio feedback helps confirm touch interactions
- The beat indicator scales to remain visible on small screens

## Getting Help

If you encounter any accessibility issues or have suggestions for improvements, please contact us at [support@libremetronome.com](mailto:support@libremetronome.com) or open an issue on our [GitHub repository](https://github.com/hybridpicker/LibreMetronome).
