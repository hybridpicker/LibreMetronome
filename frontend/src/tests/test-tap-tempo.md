# Tap Tempo Testing Guide

This guide will help you manually test the tap tempo functionality across all metronome modes.

## Setup (Optional)

For visual feedback during testing, you can temporarily add the test monitor component:

1. Open `App.js`
2. Add import: `import ManualTapTempoTest from './tests/ManualTapTempoTest';`
3. Add the component at the top of your App render: `<ManualTapTempoTest />`

## Test Procedure

For each metronome mode (Circle, Analog, Grid, Multi-Circle):

1. Switch to the mode via the settings menu
2. Test keyboard 't' key:
   - Press 't' key 4-5 times at a steady rate
   - Verify tempo changes to match your tapping speed
   
3. Test tap tempo button:
   - Find and click the tap tempo button 4-5 times at a steady rate
   - Verify tempo changes to match your tapping speed

## Expected Results

Both the keyboard 't' key and the tap tempo button should:
- Be functional in all metronome modes
- Change the tempo based on your tapping pattern
- Work regardless of screen size (desktop or mobile view)

## Troubleshooting

If the tap button doesn't appear:
- Make sure you've rebuilt/restarted the app with the latest changes
- Try resizing the window to trigger responsive layout changes

If the tap tempo functionality doesn't change the tempo:
- Tap at least 4 times (the algorithm requires multiple taps)
- Try to tap at a consistent pace
- Check the browser console for any errors

## Testing on Mobile

For mobile testing:
1. Use the browser's device emulation mode or open the app on a mobile device
2. Verify the tap button is visible and properly positioned in each mode
3. Test by tapping the button several times at a consistent pace

Remember to remove the test monitor component before deploying to production.