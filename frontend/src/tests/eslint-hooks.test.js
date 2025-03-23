/**
 * Fixed version of ESLint test that avoids dependency issues with plugins
 * This test focuses on the exhaustive-deps rule that was causing issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('ESLint Hook Rules Compliance', () => {
  // This can take some time for large codebases
  jest.setTimeout(30000);
  
  /**
   * Helper function that directly creates and runs an eslint command
   * instead of using the ESLint API which has dependency issues
   */
  function checkFileForHooksWarnings(filePath) {
    // Create a temporary eslint config file
    const tempConfigPath = path.resolve(__dirname, 'temp-eslint-config.json');
    
    // Write a minimal config that only checks for the react-hooks/exhaustive-deps rule
    fs.writeFileSync(tempConfigPath, JSON.stringify({
      "plugins": ["react-hooks"],
      "rules": {
        "react-hooks/exhaustive-deps": "warn",
        "react-hooks/rules-of-hooks": "error"
      },
      "parserOptions": {
        "ecmaVersion": 2020,
        "sourceType": "module",
        "ecmaFeatures": {
          "jsx": true
        }
      }
    }));

    try {
      // Run eslint directly via CLI to avoid Node API incompatibilities
      const result = execSync(
        `npx eslint --no-eslintrc -c ${tempConfigPath} --parser-options=ecmaVersion:2020 --parser-options=sourceType:module --parser-options=ecmaFeatures:'{jsx:true}' "${filePath}"`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      // If there are no errors, return true
      return true;
    } catch (error) {
      // ESLint CLI will throw if there are any warnings/errors
      // Check if the specific exhaustive-deps warning appears in the output
      const hasExhaustiveDepsWarnings = error.stderr?.includes('exhaustive-deps') || 
                                        error.stdout?.includes('exhaustive-deps');
      
      if (hasExhaustiveDepsWarnings) {
        console.log('Found react-hooks/exhaustive-deps warnings:');
        console.log(error.stdout || error.stderr || 'Unknown error');
      }
      
      return !hasExhaustiveDepsWarnings;
    } finally {
      // Clean up temporary config file
      try {
        fs.unlinkSync(tempConfigPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
  
  // Use build output as the source of truth for ESLint warnings
  test('No react-hooks/exhaustive-deps warnings in build output', () => {
    // Run the build and capture output
    const buildOutput = execSync('npm run build', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // Check for the specific warning patterns we fixed
    const pattern1 = /PolyrhythmMetronome.js.*Line.*React Hook useCallback received a function whose dependencies are unknown/i;
    const pattern2 = /usePolyrhythmLogic.js.*Line.*React Hook useCallback has an unnecessary dependency: 'stopScheduler'/i;
    
    expect(buildOutput).not.toMatch(pattern1);
    expect(buildOutput).not.toMatch(pattern2);
    
    // Additional check for any exhaustive-deps warnings in these files
    const anyPolyrhythmWarnings = buildOutput.includes('PolyrhythmMetronome.js') && 
                                  buildOutput.includes('react-hooks/exhaustive-deps');
    
    const anyLogicWarnings = buildOutput.includes('usePolyrhythmLogic.js') && 
                             buildOutput.includes('react-hooks/exhaustive-deps');
    
    expect(anyPolyrhythmWarnings).toBe(false);
    expect(anyLogicWarnings).toBe(false);
  });
});
