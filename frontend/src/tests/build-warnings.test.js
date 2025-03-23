/**
 * Test that verifies the build doesn't produce any React hooks exhaustive-deps warnings
 */

const { execSync } = require('child_process');

describe('Build Warnings Check', () => {
  // Set a longer timeout for build operations
  jest.setTimeout(60000);
  
  test('Build should not produce exhaustive-deps warnings for polyrhythm components', () => {
    try {
      // Run the build and capture output
      const output = execSync('npm run build', { 
        encoding: 'utf8',
        cwd: process.cwd() // Run in the project root
      });
      
      // Check for exhaustive-deps warnings in PolyrhythmMetronome.js
      const metronomeWarnings = output.includes('PolyrhythmMetronome.js') && 
                              output.includes('react-hooks/exhaustive-deps');
      
      // Check for exhaustive-deps warnings in usePolyrhythmLogic.js
      const logicWarnings = output.includes('usePolyrhythmLogic.js') && 
                           output.includes('react-hooks/exhaustive-deps');
      
      // Log the full output if we found warnings
      if (metronomeWarnings || logicWarnings) {
        console.log('Found React hooks warnings in the build output:');
        console.log(output);
      }
      
      // Assert no warnings were found
      expect(metronomeWarnings).toBe(false);
      expect(logicWarnings).toBe(false);
    } catch (error) {
      // Even if the build has warnings, it might not exit with a non-zero code
      // So we need to check the output in the error object too
      if (error.stdout) {
        const output = error.stdout.toString();
        
        // Check for exhaustive-deps warnings in PolyrhythmMetronome.js
        const metronomeWarnings = output.includes('PolyrhythmMetronome.js') && 
                                output.includes('react-hooks/exhaustive-deps');
        
        // Check for exhaustive-deps warnings in usePolyrhythmLogic.js
        const logicWarnings = output.includes('usePolyrhythmLogic.js') && 
                            output.includes('react-hooks/exhaustive-deps');
        
        // Log the full output if we found warnings
        if (metronomeWarnings || logicWarnings) {
          console.log('Found React hooks warnings in the build output:');
          console.log(output);
        }
        
        // Assert no warnings were found
        expect(metronomeWarnings).toBe(false);
        expect(logicWarnings).toBe(false);
      } else {
        // If it's another error, fail the test
        throw error;
      }
    }
  });
});
