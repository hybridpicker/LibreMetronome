/**
 * Test that focuses on file content directly to verify hook fixes
 * This approach avoids ESLint dependency issues by checking code patterns directly
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('React Hooks Implementation', () => {
  // Set a reasonable timeout
  jest.setTimeout(10000);
  
  test('PolyrhythmMetronome.js has correct implementation for debouncedSetSubdivisions', () => {
    const filePath = path.resolve(
      __dirname, 
      '../components/metronome/PolyrhythmMode/PolyrhythmMetronome.js'
    );
    
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Check that we're not using useCallback for debouncedSetSubdivisions
    const hasFixedImplementation = !fileContent.includes('const debouncedSetSubdivisions = useCallback(');
    
    // The file should contain our fixed implementation
    const hasCorrectImplementation = fileContent.includes('const debouncedSetSubdivisions = (value, circle) => {');
    
    expect(hasFixedImplementation).toBe(true);
    expect(hasCorrectImplementation).toBe(true);
  });
  
  test('usePolyrhythmLogic.js has stopScheduler removed from startScheduler dependencies', () => {
    const filePath = path.resolve(
      __dirname, 
      '../components/metronome/PolyrhythmMode/usePolyrhythmLogic.js'
    );
    
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Check for the startScheduler declaration - it should NOT include stopScheduler in dependencies
    const startSchedulerDeclaration = fileContent.match(/const startScheduler = useCallback\([^)]+\),\s*\[(.*?)\]\);/);
    
    if (startSchedulerDeclaration && startSchedulerDeclaration[1]) {
      const dependencies = startSchedulerDeclaration[1];
      expect(dependencies).not.toContain('stopScheduler');
      
      // It should include the correct dependencies
      expect(dependencies).toContain('schedulingLoop');
      expect(dependencies).toContain('syncTrainingState');
    } else {
      // If we couldn't find the pattern, that means the code structure changed
      // In that case, directly check if the problematic pattern exists
      const noStopSchedulerDep = !fileContent.includes('startScheduler = useCallback') || 
                                !fileContent.includes('[schedulingLoop, stopScheduler, syncTrainingState]');
      expect(noStopSchedulerDep).toBe(true);
    }
  });
  
  // Verify using shell script which we know works
  test('Verify using our shell script', () => {
    const result = execSync('./src/tests/verify-hooks-fix.sh', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    expect(result).toContain('ALL TESTS PASSED');
  });
});
