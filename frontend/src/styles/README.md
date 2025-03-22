# LibreMetronome Color System

This document provides guidelines for using the LibreMetronome color system to ensure a consistent visual identity across the application.

## Overview

The LibreMetronome color palette is defined in `colors.css` as CSS variables that can be accessed throughout the application. The palette includes:

- Primary colors (teal variants)
- Secondary colors (gold variants)
- Neutral colors (backgrounds and borders)
- Text colors
- Beat state colors
- Semantic colors (success, warning, error, info)

## Using the Colors

Always use the CSS variables instead of hardcoded color values. This ensures:

1. Consistency across the application
2. Easier theme changes or adjustments
3. Simpler implementation of dark mode in the future

### How to Use CSS Variables

```css
/* Instead of this */
.my-element {
  background-color: #00A0A0;
  color: #ffffff;
}

/* Use this */
.my-element {
  background-color: var(--primary-teal);
  color: var(--text-light);
}
```

## Available Color Variables

### Primary Colors
- `--primary-teal`: #00A0A0 - Main brand color used for interactive elements, buttons, and links
- `--primary-teal-dark`: #008080 - Darker variant for hover states
- `--primary-teal-light`: #B3E0E0 - Lighter variant for backgrounds, borders
- `--primary-teal-ultra-light`: #E6F5F5 - Very light teal for subtle backgrounds

### Secondary Colors
- `--secondary-gold`: #f8d38d - Secondary brand color for accents and highlights
- `--secondary-gold-dark`: #f5c26d - Darker gold for first beats and important elements
- `--secondary-gold-light`: #fae3ad - Lighter gold for normal beats and subtle highlights
- `--secondary-gold-ultra-light`: #FFF8E6 - Very light gold for subtle backgrounds

### Neutral Colors
- `--neutral-bg`: #f5f5f5 - Main background color
- `--neutral-bg-alt`: #f9f9f9 - Alternative background for cards and modals
- `--neutral-border`: #e0e0e0 - Border color
- `--neutral-border-light`: #eeeeee - Lighter border color

### Text Colors
- `--text-primary`: #333333 - Main text color
- `--text-secondary`: #666666 - Secondary text color
- `--text-tertiary`: #999999 - Tertiary text color for less important text
- `--text-light`: #ffffff - Light text color for dark backgrounds

### Beat State Colors
- `--beat-muted`: #e8e8e8 - Muted beat color
- `--beat-normal`: var(--secondary-gold-light) - Normal beat color
- `--beat-accent`: var(--secondary-gold) - Accented beat color
- `--beat-first`: var(--primary-teal) - First beat color
- `--beat-inner`: #fce9c6 - Inner beat color for polyrhythm
- `--beat-outer`: #f6cc7c - Outer beat color for polyrhythm

### Semantic Colors
- `--success`: #3FB6A8 - Success color - aligned with teal palette
- `--warning`: #F9CE7A - Warning color - aligned with gold palette
- `--error`: #E67B73 - Error color
- `--info`: #73B5E6 - Info color

### Additional Variables
- `--overlay-bg`: rgba(0, 0, 0, 0.7) - Dark overlay background
- `--modal-shadow`: 0 4px 20px rgba(0, 0, 0, 0.2) - Shadow for modals
- `--training-tip-bg`: var(--secondary-gold-ultra-light) - Background for training tips
- `--training-overview-bg`: var(--primary-teal-ultra-light) - Background for training overview

## Usage Guidelines

### Primary Actions
Use `--primary-teal` for primary actions like main buttons, active states, and primary links.

```css
.primary-button {
  background-color: var(--primary-teal);
  color: var(--text-light);
}

.primary-button:hover {
  background-color: var(--primary-teal-dark);
}
```

### Secondary Actions
Use `--secondary-gold` for secondary actions, highlights, and accents.

```css
.secondary-button {
  background-color: var(--secondary-gold);
  color: var(--text-primary);
}

.secondary-button:hover {
  background-color: var(--secondary-gold-dark);
}
```

### Beat Visualization
For beat visualization, use the appropriate beat state colors:

```css
.beat {
  background-color: var(--beat-normal);
}

.beat-first {
  background-color: var(--beat-first);
}

.beat-accent {
  background-color: var(--beat-accent);
}

.beat-muted {
  background-color: var(--beat-muted);
}
```

### Polyrhythm Visualization
For polyrhythm features, use:

```css
.inner-beat {
  background-color: var(--beat-inner);
}

.outer-beat {
  background-color: var(--beat-outer);
}
```

### Feedback States
For feedback and status messages:

```css
.success-message {
  background-color: var(--success);
  color: var(--text-light);
}

.warning-message {
  background-color: var(--warning);
  color: var(--text-primary);
}

.error-message {
  background-color: var(--error);
  color: var(--text-light);
}

.info-message {
  background-color: var(--info);
  color: var(--text-light);
}
```

## Maintaining the Color System

When adding new colors or modifying existing ones:

1. Always update the `colors.css` file first
2. Document new colors in this README
3. Use semantic naming for new variables
4. Ensure sufficient contrast for accessibility
5. Run the `standardize-colors.sh` script if you need to find and replace hardcoded colors

## Dark Mode (Future Implementation)

The color system is designed to be easily adapted for dark mode in the future. Dark mode variables are commented out in `colors.css` and can be activated when needed.
