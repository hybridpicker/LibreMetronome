#!/bin/bash

# Verify that there are no more React hooks exhaustive-deps warnings in our fixed files
# This is a more direct approach using grep on build output

echo "Running verification test for React hooks warnings fix..."
echo "Building project and checking for warnings..."

# Run the build and save the output
BUILD_OUTPUT=$(npm run build 2>&1)

# Check for the specific warning patterns
WARNING1_PATTERN="PolyrhythmMetronome.js.*Line.*React Hook useCallback received a function whose dependencies are unknown"
WARNING2_PATTERN="usePolyrhythmLogic.js.*Line.*React Hook useCallback has an unnecessary dependency: 'stopScheduler'"

# Use grep to search for the patterns
if echo "$BUILD_OUTPUT" | grep -E "$WARNING1_PATTERN" > /dev/null; then
  echo "❌ FAILED: Still found warning about unknown dependencies in PolyrhythmMetronome.js"
  echo "$BUILD_OUTPUT" | grep -E "$WARNING1_PATTERN" | head -1
  EXIT_CODE=1
else
  echo "✅ PASSED: No warnings about unknown dependencies in PolyrhythmMetronome.js"
fi

if echo "$BUILD_OUTPUT" | grep -E "$WARNING2_PATTERN" > /dev/null; then
  echo "❌ FAILED: Still found warning about unnecessary dependency in usePolyrhythmLogic.js"
  echo "$BUILD_OUTPUT" | grep -E "$WARNING2_PATTERN" | head -1
  EXIT_CODE=1
else
  echo "✅ PASSED: No warnings about unnecessary dependency in usePolyrhythmLogic.js"
fi

# General check for any exhaustive-deps warnings in these files
if echo "$BUILD_OUTPUT" | grep -E "PolyrhythmMetronome.js.*react-hooks/exhaustive-deps" > /dev/null; then
  echo "❌ FAILED: Found other exhaustive-deps warnings in PolyrhythmMetronome.js"
  EXIT_CODE=1
else
  echo "✅ PASSED: No other exhaustive-deps warnings in PolyrhythmMetronome.js"
fi

if echo "$BUILD_OUTPUT" | grep -E "usePolyrhythmLogic.js.*react-hooks/exhaustive-deps" > /dev/null; then
  echo "❌ FAILED: Found other exhaustive-deps warnings in usePolyrhythmLogic.js"
  EXIT_CODE=1
else
  echo "✅ PASSED: No other exhaustive-deps warnings in usePolyrhythmLogic.js"
fi

if [ "$EXIT_CODE" != "1" ]; then
  echo "🎉 ALL TESTS PASSED: React hooks warnings have been successfully fixed!"
  exit 0
else
  echo "❌ SOME TESTS FAILED: React hooks warnings are still present."
  exit 1
fi
