// File: frontend/src/tests/runMultiCircleTest.js

/**
 * Manual Test Runner for MultiCircleMode
 * 
 * This script allows you to manually trigger tests for the MultiCircleMode component
 * to verify that circle 0 is always played completely before transitioning to the next circle.
 * 
 * Usage:
 * 1. Import and render the MultiCircleTransitionTester component in your App
 * 2. Open the app in a browser and go to the MultiCircleMode page
 * 3. Open the browser console
 * 4. Run this script by copying and pasting it into the console
 * 5. Follow the printed instructions to manually test the component
 */

(function() {
    console.clear();
    
    console.log("%c=== MultiCircleMode Transition Test Runner ===", 
      "background: #333; color: #fff; padding: 6px 10px; border-radius: 4px; font-weight: bold;");
    
    // Check if the tester is already initialized
    if (!window.multiCircleTest) {
      console.error("Error: MultiCircleTransitionTester not found. Make sure it's properly initialized.");
      console.log("Hint: Import and render the <MultiCircleTransitionTester /> component in your app.");
      return;
    }
    
    // Instrument the MultiCircleMetronome component if it's present
    const findAndInstrumentMetronome = () => {
      // Check if we're on the MultiCircleMode page
      const metronomeContainers = document.querySelectorAll(".circles-container");
      if (metronomeContainers.length === 0) {
        console.error("Error: MultiCircleMetronome component not found in the DOM.");
        console.log("Hint: Navigate to the Multi Circle Mode page first.");
        return false;
      }
      
      // Find the play/pause button
      const playButton = document.querySelector(".play-pause-button");
      if (!playButton) {
        console.error("Error: Play/pause button not found.");
        return false;
      }
      
      // Check if we need to patch the component
      if (!window.patchedMultiCircleMetronome) {
        console.log("Patching MultiCircleMetronome component for testing...");
        
        // Track play/pause state
        playButton.addEventListener('click', () => {
          const isPaused = document.querySelector(".play-pause-icon").src.includes("play");
          window.dispatchMetronomeStateChange(isPaused);
        });
        
        // Create a MutationObserver to detect when circles are added/removed
        const circlesObserver = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              console.log("[Test] Detected changes in circles-container");
            }
          });
        });
        
        // Start observing the circles container
        metronomeContainers.forEach(container => {
          circlesObserver.observe(container, { childList: true, subtree: true });
        });
        
        // Add a beat tracker to each circle
        const instrumentCircles = () => {
          const circles = document.querySelectorAll(".circles-container > div");
          circles.forEach((circle, index) => {
            if (!circle.hasAttribute('data-instrumented')) {
              circle.setAttribute('data-instrumented', 'true');
              circle.setAttribute('data-circle-index', index);
              
              // Add class to highlight when the circle is playing
              if (circle.classList.contains('metronome-circle-playing')) {
                window.dispatchMetronomeBeat(0, index);
              }
            }
          });
        };
        
        // Run it once immediately and then periodically
        instrumentCircles();
        setInterval(instrumentCircles, 500);
        
        // Also look for specific circle transition events
        window.addEventListener('circle-changed', (event) => {
          if (event.detail && typeof event.detail.circleIndex === 'number') {
            const circleIndex = event.detail.circleIndex;
            // Dispatch a beat event for the first beat of the new circle
            window.dispatchMetronomeBeat(0, circleIndex);
          }
        });
        
        window.patchedMultiCircleMetronome = true;
        console.log("MultiCircleMetronome component patched successfully!");
      }
      
      return true;
    };
    
    // Start the test if everything is ready
    if (findAndInstrumentMetronome()) {
      // Start the test
      window.startMultiCircleTest();
      console.log("Test started! Please use the app normally and the test will run in the background.");
      
      console.log("%cTest Instructions:", "font-weight: bold;");
      console.log("1. Press the play button to start the metronome");
      console.log("2. Let it play for at least 30 seconds to observe multiple transitions");
      console.log("3. Try adding and removing circles to test different configurations");
      console.log("4. When done, call window.stopMultiCircleTest() to see the results");
      
      console.log("%cAvailable Commands:", "color: blue; font-weight: bold;");
      console.log("window.startMultiCircleTest() - Start/restart the test");
      console.log("window.stopMultiCircleTest() - Stop the test and print results");
      console.log("window.multiCircleTest.printResults() - Print current results without stopping");
    } else {
      console.log("%cSetup Failed", "color: red; font-weight: bold;");
      console.log("Please make sure you're on the Multi Circle Mode page and try again.");
    }
  })();