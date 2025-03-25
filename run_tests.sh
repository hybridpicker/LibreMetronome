#!/bin/bash
cd frontend
echo "Running HelpButton test..."
npx jest src/tests/components/HelpButton.test.jsx
echo "Running useKeyboardShortcuts test..."
npx jest src/tests/useKeyboardShortcuts.test.js
echo "Running HelpSystemIntegration test..."
npx jest src/tests/components/HelpSystemIntegration.test.jsx
