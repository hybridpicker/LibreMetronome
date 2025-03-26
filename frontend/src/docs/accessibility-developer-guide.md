# Accessibility Developer Guide

This guide provides information for developers who want to maintain or extend the accessibility features in LibreMetronome.

## Architecture Overview

The accessibility system in LibreMetronome consists of several key components:

1. **Settings Integration** - Accessibility settings are integrated into the main Settings menu rather than as a separate component
2. **Utility Functions** - Core accessibility functions in `utils/accessibility/accessibilityUtils.js`
3. **CSS Classes** - Global CSS classes that are toggled based on user preferences
4. **Component Enhancements** - Accessibility enhancements to core components like metronome visualization
5. **Screen Reader Support** - Dedicated components for screen reader announcements

## Adding New Accessibility Features

### Step 1: Identify the Need

Before implementing a new accessibility feature, identify:
- Which users will benefit from the feature
- How it aligns with [WCAG guidelines](https://www.w3.org/WAI/standards-guidelines/wcag/)
- How it will integrate with existing features

### Step 2: Update Settings

To add a new setting:

1. Modify `SettingsContent.js` to add the new setting toggle
2. Add localStorage key for the setting (use the `accessibility-` prefix)
3. Update the `loadAccessibilitySettings` function in `accessibilityUtils.js`
4. Add any necessary global variables (using `window.featureName`)

Example:
```javascript
// In SettingsContent.js - Add new setting
<div className="settings-row checkbox-row">
  <label>
    <input 
      type="checkbox" 
      checked={accessibilitySettings.newFeature} 
      onChange={e => updateAccessibilitySetting('newFeature', e.target.checked)} 
    />
    <span>New Feature Name</span>
  </label>
  <p className="setting-description">Description of the new feature</p>
</div>

// In accessibilityUtils.js - Update loadAccessibilitySettings function
export const loadAccessibilitySettings = () => {
  const settings = {
    // Existing settings...
    newFeature: localStorage.getItem('accessibility-newFeature') === 'true',
  };
  
  // Apply settings
  // ...
  window.newFeatureEnabled = settings.newFeature;
  
  return settings;
};
```

### Step 3: Add CSS Support

If your feature requires CSS, add styles to `App.css` using the appropriate class name:

```css
/* Base styles */
.feature-element {
  /* Default styling */
}

/* Accessible styling */
body.high-contrast .feature-element {
  /* High contrast styling */
}

body.large-text .feature-element {
  /* Large text styling */
}

body.reduced-motion .feature-element {
  /* Reduced motion styling */
}
```

### Step 4: Enhance Existing Components

When modifying existing components for accessibility:

1. Use semantic HTML wherever possible
2. Add appropriate ARIA attributes
3. Ensure keyboard navigability
4. Test with screen readers

Example:
```jsx
// Before
<div onClick={handleClick}>
  {children}
</div>

// After - More accessible
<button 
  onClick={handleClick}
  aria-label="Descriptive label"
  tabIndex="0"
>
  {children}
</button>
```

### Step 5: Add Screen Reader Support

For dynamic content that should be announced to screen readers:

```javascript
import { announceToScreenReader } from '../utils/accessibility/accessibilityUtils';

// Later in your component
useEffect(() => {
  if (someStateChanged) {
    announceToScreenReader(`State changed to ${newState}`, 'polite');
  }
}, [someStateChanged, newState]);
```

### Step 6: Testing

Test new features with:
- Keyboard navigation
- Screen readers (NVDA, VoiceOver, JAWS)
- Different color schemes
- Large text
- Reduced motion

## Common Accessibility Patterns

### Focus Management

Ensure proper focus management:

```javascript
const buttonRef = useRef(null);

// Move focus
useEffect(() => {
  if (isDialogOpen && buttonRef.current) {
    buttonRef.current.focus();
  }
}, [isDialogOpen]);

// In JSX
<button ref={buttonRef}>Focused Button</button>
```

### Keyboard Events

Handle keyboard events for custom components:

```javascript
const handleKeyDown = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleAction();
  }
};

// In JSX
<div 
  tabIndex="0"
  onKeyDown={handleKeyDown}
  role="button"
  aria-label="Action description"
>
  Custom Button
</div>
```

### Audio Feedback

Add audio feedback for important actions:

```javascript
import { playAudioFeedback } from '../utils/accessibility/accessibilityUtils';

const handleImportantAction = () => {
  // Perform action
  playAudioFeedback('click');
};
```

## Best Practices

1. **Test Early and Often** - Integrate accessibility testing into your development workflow
2. **Consider Keyboard First** - Design interactions for keyboard users before adding mouse/touch support
3. **Use Semantic HTML** - Use the appropriate HTML elements for their intended purpose
4. **Provide Alternatives** - Always provide alternatives for content that might not be accessible
5. **Respect User Preferences** - Honor user settings and system preferences
6. **Minimize Motion** - Ensure animations are subtle and can be disabled
7. **Clear Language** - Use clear, simple language for labels and instructions
8. **Sufficient Contrast** - Maintain at least 4.5:1 contrast ratio for text
9. **Responsive Design** - Ensure accessibility features work at all screen sizes
10. **Avoid Relying on Color** - Don't use color as the only means of conveying information

## Specific Components in LibreMetronome

### AccessibleBeatIndicator

This component provides a visual representation of beats for users who may have trouble perceiving the standard metronome visualization:

```jsx
<AccessibleBeatIndicator 
  isPlaying={!isPaused}
  currentBeat={currentBeat}
  totalBeats={beatsPerMeasure}
  accentedBeats={[1, 3]} // First and third beats are accented
/>
```

To extend this component:
- Add support for more complex beat patterns
- Enhance the visual representation
- Add haptic feedback for mobile devices

### ScreenReaderAnnouncer

This component creates a live region for screen reader announcements:

```jsx
<ScreenReaderAnnouncer 
  message={announcement}
  politeness="polite" // or "assertive" for urgent messages
/>
```

To extend this component:
- Add support for priority levels
- Implement a queue for multiple announcements
- Add timing options for announcements

## Testing Tools

### Manual Testing

- [Axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension for accessibility testing
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation tool
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Automated tool for improving web page quality

### Screen Readers

- [NVDA](https://www.nvaccess.org/) (Windows)
- [VoiceOver](https://www.apple.com/accessibility/mac/vision/) (Mac)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/) (Windows)
- [TalkBack](https://support.google.com/accessibility/android/answer/6283677) (Android)

### Keyboard Testing

Test all functionality using keyboard only:
- Tab: Navigate between elements
- Enter/Space: Activate buttons
- Arrow keys: Navigate within components
- Escape: Close overlays

## Additional Resources

- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Inclusive Components](https://inclusive-components.design/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [WebAIM Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

## Future Accessibility Roadmap

Planned enhancements for LibreMetronome:

1. **Improved Beat Visualization** - More options for visual beat indicators
2. **Enhanced Keyboard Shortcuts** - Customizable keyboard shortcuts
3. **Voice Control** - Voice commands for controlling the metronome
4. **Color Vision Deficiency Modes** - Specific modes for different types of color blindness
5. **Haptic Feedback** - Vibration patterns for mobile devices
6. **Focus Indicators** - Improved visual focus indicators
7. **Text-to-Speech** - Option to speak tempo changes and other information
8. **Gesture Controls** - Simple gesture controls for users with motor impairments

## Maintaining Accessibility

As the application evolves:

1. Include accessibility in code reviews
2. Run automated tests as part of CI/CD pipeline
3. Conduct regular manual testing with assistive technologies
4. Consider user feedback regarding accessibility
5. Stay updated with newer WCAG guidelines and best practices
6. Document all accessibility features and how to test them

Remember that accessibility is an ongoing commitment, not a one-time implementation. By integrating accessibility into the development process, LibreMetronome can continue to be an inclusive tool for all musicians.
