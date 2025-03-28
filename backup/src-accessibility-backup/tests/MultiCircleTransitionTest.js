// File: frontend/src/tests/MultiCircleTransitionTest.js

import React, { useEffect, useRef } from 'react';

/**
 * Test utility to verify MultiCircle transition behavior
 * This script monitors the MultiCircleMetronome component to ensure 
 * that circle 0 is always played completely before transitioning to the next circle.
 * 
 * Usage: Include this script in your project and it will automatically 
 * attach to the MultiCircleMetronome component when it's present in the DOM.
 */

class MultiCircleTransitionTest {
  constructor() {
    this.testActive = false;
    this.circleTransitions = [];
    this.measuresPerCircle = {};
    this.startTime = null;
    this.currentCircle = 0;
    this.previousCircle = null;
    this.measuresInCurrentCircle = 0;
    this.subdivision = 0;
    this.isPaused = true;
    this.circle0Completed = false;
    this.onCircleChangeListenerSet = false;
    
    // Thresholds
    this.minMeasuresInCircle0 = 1; // Circle 0 should play at least 1 complete measure
    
    this.setupListeners();
    console.log("[Test] MultiCircleTransitionTest initialized");
  }
  
  setupListeners() {
    // Listen for circle change events
    window.addEventListener('circle-changed', this.handleCircleChange.bind(this));
    
    // Listen for beat (subdivision) events
    document.addEventListener('metronome-beat', this.handleBeat.bind(this));
    
    // Listen for play/pause state changes
    document.addEventListener('metronome-state-change', this.handleStateChange.bind(this));
    
    // Add global access to the test utility
    window.multiCircleTest = this;
    
    // Setup periodic check for results
    setInterval(() => {
      if (this.testActive && !this.isPaused) {
        this.checkTransitionValidity();
      }
    }, 2000);
  }
  
  start() {
    console.log("[Test] Starting MultiCircleTransitionTest");
    this.testActive = true;
    this.startTime = Date.now();
    this.circleTransitions = [];
    this.measuresPerCircle = {};
    this.currentCircle = 0;
    this.previousCircle = null;
    this.measuresInCurrentCircle = 0;
    this.subdivision = 0;
    this.isPaused = false;
    this.circle0Completed = false;
    
    // Print test header
    console.log("%c=== MultiCircle Transition Test Started ===", 
      "background: #333; color: #fff; padding: 4px 8px; border-radius: 4px;");
  }
  
  stop() {
    console.log("[Test] Stopping MultiCircleTransitionTest");
    this.testActive = false;
    this.isPaused = true;
    
    // Print test summary
    this.printResults();
  }
  
  handleCircleChange(event) {
    if (!this.testActive) return;
    
    const detail = event.detail || {};
    const newCircleIndex = detail.circleIndex;
    
    // Only process if the circle has actually changed
    if (this.currentCircle !== newCircleIndex) {
      console.log(`[Test] Circle changed: ${this.currentCircle} -> ${newCircleIndex}`);
      
      // Record the transition
      this.circleTransitions.push({
        from: this.currentCircle,
        to: newCircleIndex,
        time: Date.now(),
        measuresPlayed: this.measuresInCurrentCircle
      });
      
      // Update measures count for the previous circle
      if (this.measuresPerCircle[this.currentCircle] === undefined) {
        this.measuresPerCircle[this.currentCircle] = 0;
      }
      this.measuresPerCircle[this.currentCircle] += this.measuresInCurrentCircle;
      
      // If we're transitioning from circle 0 to another circle
      if (this.currentCircle === 0 && newCircleIndex !== 0) {
        this.circle0Completed = true;
      }
      
      // Reset measures counter for the new circle
      this.previousCircle = this.currentCircle;
      this.currentCircle = newCircleIndex;
      this.measuresInCurrentCircle = 0;
      
      // Verify that circle 0 was played completely before going to other circles
      if (newCircleIndex !== 0 && !this.circle0Completed) {
        console.error("[Test] ERROR: Transitioned to another circle before circle 0 was completed");
      }
    }
  }
  
  handleBeat(event) {
    if (!this.testActive || this.isPaused) return;
    
    const detail = event.detail || {};
    const { subdivision, circleIndex } = detail;
    
    // If this is the first beat of a measure
    if (subdivision === 0) {
      // Increment measures counter
      this.measuresInCurrentCircle++;
      
      console.log(`[Test] Beat detected: Circle ${circleIndex}, Measure ${this.measuresInCurrentCircle}`);
      
      // If we complete our first measure in circle 0
      if (circleIndex === 0 && this.measuresInCurrentCircle >= this.minMeasuresInCircle0) {
        this.circle0Completed = true;
      }
    }
    
    this.subdivision = subdivision;
  }
  
  handleStateChange(event) {
    const detail = event.detail || {};
    this.isPaused = detail.isPaused;
    
    if (this.isPaused) {
      console.log("[Test] Metronome paused");
    } else {
      console.log("[Test] Metronome playing");
      
      // Reset circle completion state on play
      if (!this.onCircleChangeListenerSet) {
        // Get the play button element
        const playButton = document.querySelector(".play-pause-button");
        if (playButton) {
          playButton.addEventListener('click', () => {
            // Check if we're starting playback
            if (document.querySelector(".play-pause-icon").src.includes("pause")) {
              console.log("[Test] Play button clicked, resetting circle completion state");
              this.circle0Completed = false;
              this.currentCircle = 0;
              this.measuresInCurrentCircle = 0;
            }
          });
          this.onCircleChangeListenerSet = true;
        }
      }
    }
  }
  
  checkTransitionValidity() {
    if (!this.testActive) return;
    
    // Check for invalid transitions
    const invalidTransitions = this.circleTransitions.filter(transition => {
      // If we transitioned away from circle 0 without completing at least one measure
      return transition.from === 0 && 
             transition.to !== 0 && 
             transition.measuresPlayed < this.minMeasuresInCircle0;
    });
    
    if (invalidTransitions.length > 0) {
      console.error(`[Test] Found ${invalidTransitions.length} invalid transitions!`);
      console.error(invalidTransitions);
    }
  }
  
  printResults() {
    console.log("%c=== MultiCircle Transition Test Results ===", 
      "background: #333; color: #fff; padding: 4px 8px; border-radius: 4px;");
    
    // Print summary of transitions
    console.log(`Total transitions: ${this.circleTransitions.length}`);
    
    // Print measures played in each circle
    console.log("Measures played per circle:");
    Object.keys(this.measuresPerCircle).forEach(circle => {
      console.log(`  Circle ${circle}: ${this.measuresPerCircle[circle]} measures`);
    });
    
    // Print test status
    const invalidTransitions = this.circleTransitions.filter(transition => {
      return transition.from === 0 && 
             transition.to !== 0 && 
             transition.measuresPlayed < this.minMeasuresInCircle0;
    });
    
    if (invalidTransitions.length > 0) {
      console.error(`%c✘ TEST FAILED: Found ${invalidTransitions.length} invalid transitions!`, 
        "color: red; font-weight: bold;");
      console.error(invalidTransitions);
    } else {
      console.log(`%c✓ TEST PASSED: All transitions were valid`, 
        "color: green; font-weight: bold;");
    }
    
    console.log("Test duration: " + ((Date.now() - this.startTime) / 1000).toFixed(2) + " seconds");
  }
}

/**
 * React component that initializes the test when mounted
 */
export function MultiCircleTransitionTester() {
  const testerRef = useRef(null);
  
  useEffect(() => {
    // Initialize the test utility
    testerRef.current = new MultiCircleTransitionTest();
    
    // Create a custom event for beats
    window.dispatchMetronomeBeat = (subdivision, circleIndex) => {
      document.dispatchEvent(new CustomEvent('metronome-beat', {
        detail: { subdivision, circleIndex }
      }));
    };
    
    // Create a custom event for state changes
    window.dispatchMetronomeStateChange = (isPaused) => {
      document.dispatchEvent(new CustomEvent('metronome-state-change', {
        detail: { isPaused }
      }));
    };
    
    // Add global start/stop methods
    window.startMultiCircleTest = () => {
      if (testerRef.current) {
        testerRef.current.start();
      }
    };
    
    window.stopMultiCircleTest = () => {
      if (testerRef.current) {
        testerRef.current.stop();
      }
    };
    
    return () => {
      // Clean up
      delete window.dispatchMetronomeBeat;
      delete window.dispatchMetronomeStateChange;
      delete window.startMultiCircleTest;
      delete window.stopMultiCircleTest;
      delete window.multiCircleTest;
    };
  }, []);
  
  // This component doesn't render anything visible
  return null;
}

export default MultiCircleTransitionTester;