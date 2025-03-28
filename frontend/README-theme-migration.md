# LibreMetronome Theme Migration Guide

This document provides step-by-step instructions to migrate LibreMetronome from the old teal/gold theme to the new blue/aqua/bronze theme.

## Migration Steps

### 1. Backup Your Current Theme

Before making any changes, create a backup of the current CSS files and SVGs:

```bash
# Create a backup of the colors.css file
cp src/styles/colors.css src/styles/colors.css.backup

# Create a backup directory for SVG files
mkdir -p src/assets/svg-backup
cp -r src/assets/svg/* src/assets/svg-backup/
```

### 2. Update the colors.css File

Replace your current `colors.css` file with the new one:

```bash
cp colors.css.new src/styles/colors.css
```

The new color scheme includes:
- Primary colors (deep blue palette)
- Secondary colors (aqua/teal accent palette)
- Beat state colors (bronze/ochre scheme)
- Semantic colors for feedback and messaging
- Legacy variables that map old names to new colors (for backward compatibility)

### 3. Update SVG Files

There are three approaches to updating SVG files, from simplest to most maintainable:

#### Option 1: Batch Replace Color Values (Quick Method)

Run the provided script to automatically replace old color values with new ones in SVG files:

```bash
node update-svg-colors.js
```

This script creates backups of modified files and replaces the hex colors according to defined mappings.

#### Option 2: Convert SVGs to Use CSS Variables (Recommended)

For better maintainability and easier future theme changes, convert SVGs to use CSS variables:

```bash
node convert-svgs-to-css-vars.js
```

This creates `.cssvar` versions of your SVG files that you can review. Once satisfied, you can replace the originals:

```bash
# After reviewing .cssvar files, replace originals (be cautious)
find src/assets/svg -name "*.svg.cssvar" -exec bash -c 'cp "{}" "${0%.cssvar}"' {} \;
```

#### Option 3: Manual Conversion (For Key SVGs)

For critical UI elements, you may want to manually update SVGs to ensure perfect results. Example updates:

- **firstBeat.svg**: Change `fill: #00ADB5;` to `fill: var(--beat-first, #2A4A66);`
- **accentedBeat.svg**: Change `fill: #F0B048;` to `fill: var(--beat-accent, #C8A064);`
- **normalBeat.svg**: Change `fill: #F8C668;` to `fill: var(--beat-normal, #E4D0B0);`

### 4. Find and Replace Hardcoded Colors in Code

Run the script to replace hardcoded color values in CSS, JS, and JSX files:

```bash
# First, install the glob package if you don't have it
npm install glob

# Then run the replacement script
node replace-hardcoded-colors.js
```

This script:
- Searches through your codebase for hardcoded hex colors
- Replaces them with appropriate CSS variables
- Creates backups of modified files

### 5. Verify and Test the New Theme

#### Visual Testing

Add the provided `ColorPaletteComparison` component to verify color values:

```jsx
// In your App.js or another component temporarily:
import ColorPaletteComparison from './components/ColorPaletteComparison';

// Then in your render method:
<ColorPaletteComparison />
```

This component shows both old and new color variables side by side.

#### Theme Toggle for A/B Testing

During development, you can use the ThemeToggle component to switch between old and new themes:

```jsx
// In your App.js or another component temporarily:
import ThemeToggle from './components/ThemeToggle';

// Then in your render method:
<ThemeToggle />
```

This adds a floating toggle button that lets you switch between themes in real-time.

#### Systematic Verification Checklist

Go through each view/mode of the app to ensure proper theme implementation:

- [ ] Main metronome interface
- [ ] Settings/configuration panels
- [ ] Beat visualization elements
- [ ] Training mode screens
- [ ] Modals and overlays
- [ ] Mode selection interfaces
- [ ] SVG icons and controls

### 6. Cleanup (After Successful Migration)

Once you're confident the new theme works correctly:

1. Remove temporary components (`ColorPaletteComparison`, `ThemeToggle`)
2. Consider removing legacy variable mappings from `colors.css` in a future update
3. Delete backup files or move them to an archive location

## Best Practices for Future Development

1. **Always use CSS variables** - Never hardcode hex color values
2. **Use semantic variable names** - Choose variables based on purpose, not color
3. **SVG theming** - Continue using CSS variables in SVGs for future-proof theming
4. **Color documentation** - Keep a storybook or sample page showing all theme colors

## Troubleshooting

If you encounter issues:

- Check the browser console for CSS errors
- Restore individual files from backups if needed:
  ```bash
  cp src/styles/colors.css.backup src/styles/colors.css
  ```
- Look for remaining hardcoded color values using:
  ```bash
  grep -r --include="*.css" --include="*.js" --include="*.svg" "#[0-9A-Fa-f]\{3,6\}" src
  ```

## Future Theme Updates

For future theme updates:
1. Only modify the color definitions in `colors.css`
2. If using CSS variables in SVGs, they will automatically inherit new colors
3. Use the same verification process to ensure completeness
