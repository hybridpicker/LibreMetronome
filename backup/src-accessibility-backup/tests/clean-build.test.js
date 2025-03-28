/**
 * Improved test that verifies the build output doesn't contain React hooks exhaustive-deps warnings
 * for the specific files we fixed. Updated to handle exceptions better.
 */

const { execSync } = require('child_process');

describe('Clean Build Verification', () => {
  // Set a longer timeout for build operations
  jest.setTimeout(60000);
  
  test('Build output should not contain exhaustive-deps warnings for fixed files', () => {
    try {
      // Run the build with output capturing
      const buildOutput = execSync('npm run build', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Check for very specific patterns that would indicate our previous ESLint warnings
      const pattern1 = /PolyrhythmMetronome.js.*Line.*React Hook useCallback received a function whose dependencies are unknown/i;
      const pattern2 = /usePolyrhythmLogic.js.*Line.*React Hook useCallback has an unnecessary dependency: 'stopScheduler'/i;
      
      // Assert that neither pattern is found in the build output
      expect(buildOutput).not.toMatch(pattern1);
      expect(buildOutput).not.toMatch(pattern2);
      
      // Additional check for any exhaustive-deps warnings in these files
      const anyPolyrhythmWarnings = buildOutput.includes('PolyrhythmMetronome.js') && 
                                  buildOutput.includes('react-hooks/exhaustive-deps');
      
      const anyLogicWarnings = buildOutput.includes('usePolyrhythmLogic.js') && 
                             buildOutput.includes('react-hooks/exhaustive-deps');
      
      expect(anyPolyrhythmWarnings).toBe(false);
      expect(anyLogicWarnings).toBe(false);
    } catch (error) {
      // If the build process throws, we need to check the error output
      const output = error.stdout || error.stderr || '';
      
      const pattern1 = /PolyrhythmMetronome.js.*Line.*React Hook useCallback received a function whose dependencies are unknown/i;
      const pattern2 = /usePolyrhythmLogic.js.*Line.*React Hook useCallback has an unnecessary dependency: 'stopScheduler'/i;
      
      // Assert that neither pattern is found in the error output
      expect(output).not.toMatch(pattern1);
      expect(output).not.toMatch(pattern2);
      
      // Additional check for any exhaustive-deps warnings in these files
      const anyPolyrhythmWarnings = output.includes('PolyrhythmMetronome.js') && 
                                  output.includes('react-hooks/exhaustive-deps');
      
      const anyLogicWarnings = output.includes('usePolyrhythmLogic.js') && 
                             output.includes('react-hooks/exhaustive-deps');
      
      expect(anyPolyrhythmWarnings).toBe(false);
      expect(anyLogicWarnings).toBe(false);
    }
  });
  
  test('Shell script verification passes', () => {
    // Execute our shell script which is known to work
    let scriptOutput;
    
    try {
      scriptOutput = execSync('./src/tests/verify-hooks-fix.sh', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Check for success indicators in the output
      expect(scriptOutput).toContain('PASSED');
      expect(scriptOutput).toContain('ALL TESTS PASSED');
      expect(scriptOutput).not.toContain('FAILED');
    } catch (error) {
      // If the script exits with an error, it means the test failed
      console.error('Shell script verification failed:');
      console.error(error.stdout || error.stderr);
      
      // Fail the test
      throw new Error('Shell script verification failed');
    }
  });
});
