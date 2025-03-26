# Accessibility Features in LibreMetronome

This directory contains components and utilities that provide accessibility features for the LibreMetronome application.

## Overview

LibreMetronome includes several accessibility features to make the application usable for people with various disabilities and preferences:

1. **High Contrast Mode** - Increases color contrast for better visibility
2. **Large Text Mode** - Enlarges text throughout the application
3. **Reduced Motion** - Minimizes animations for users with vestibular disorders
4. **Audio Feedback** - Provides audio cues when interacting with UI elements
5. **Screen Reader Announcements** - Sends detailed announcements to screen readers
6. **Keyboard Shortcuts** - Allows control of all features using the keyboard
7. **ARIA Attributes** - Enhances screen reader compatibility
8. **Accessible Beat Indicators** - Visual and auditory cues for beats

## Components

### AccessibilitySettings

This component is integrated into the main settings panel. It provides toggles for all accessibility features and saves preferences to localStorage.

### AccessibleBeatIndicator

A visual indicator that displays the current beat in a high-contrast, accessible format. Useful for visually impaired users or in noisy environments.

### ScreenReaderAnnouncer

A utility component that creates temporary ARIA live regions to make announcements to screen readers.

## Utilities

### accessibilityUtils.js

Contains utility functions for accessibility features:

- `loadAccessibilitySettings()` - Loads settings from localStorage and applies them
- `announceToScreenReader(message, priority)` - Announces a message to screen readers
- `playAudioFeedback(type)` - Plays audio feedback for user interactions
- `getBeatAnnouncement(beat, totalBeats)` - Generates beat announcement text

## Implementation

Accessibility features are integrated into the main application settings rather than as a separate menu, making them a core part of the user experience rather than an afterthought.

### CSS Classes

The following CSS classes are used for accessibility features:

- `high-contrast` - Applied to the body element when high contrast mode is active
- `large-text` - Applied to the body element when large text mode is active
- `reduced-motion` - Applied to the body element when reduced motion mode is active
- `sr-only` - Makes content visible only to screen readers

### LocalStorage Keys

Settings are stored in localStorage with the following keys:

- `accessibility-high-contrast`
- `accessibility-large-text` 
- `accessibility-reduced-motion`
- `accessibility-audio-feedback`
- `accessibility-screen-reader-messages`

### Global Variables

The following global variables are used to track accessibility settings across components:

- `window.audioFeedbackEnabled` - Boolean indicating if audio feedback is enabled
- `window.screenReaderMessagesEnabled` - Boolean indicating if screen reader messages are enabled

## Keyboard Shortcuts

LibreMetronome provides comprehensive keyboard shortcuts for all main functionality:

- **Space** - Play/Pause metronome
- **T** - Tap tempo
- **1-9** - Set beats per measure
- **Arrow Up/Down** - Adjust tempo by 1 BPM
- **Arrow Left/Right** - Adjust tempo by 5 BPM
- **+/-** - Adjust volume
- **ESC** - Close any dialog or overlay
- **S** - Open Settings menu
- **R** - Open Training menu
- **P** - Switch to Pendulum mode
- **C** - Switch to Circle mode
- **G** - Switch to Grid mode
- **M** - Switch to Multi-Circle mode

## Beat Visualization and Sonification

For users with visual impairments or those who need additional beat cues:

1. The `AccessibleBeatIndicator` component provides high-contrast visual cues for the current beat
2. Screen reader announcements can indicate important beats (first beat and accented beats)
3. Different sounds are used for first beats, accented beats, and normal beats

## Browser Compatibility

Accessibility features are tested on:
- Chrome/Edge (latest versions)
- Firefox (latest version)
- Safari (latest version)
- Mobile browsers (iOS Safari, Chrome for Android)

## System Preference Detection

The application detects and respects system preferences for:
- Reduced motion (`prefers-reduced-motion` media query)
- Color scheme (`prefers-color-scheme` media query)

## Testing

To test accessibility features:

1. Enable each feature in the Settings menu
2. Verify that visual changes are applied correctly
3. Test keyboard navigation through all components
4. Test with screen readers (VoiceOver, NVDA, JAWS, etc.)
5. Verify that audio feedback works correctly

## Future Improvements

Planned accessibility enhancements:

1. Add more detailed ARIA descriptions for complex visualizations
2. Improve keyboard focus management
3. Add color blindness accommodation options
4. Implement haptic feedback for mobile devices
5. Add voice control capabilities

## Resources

- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Inclusive Components](https://inclusive-components.design/)
