// src/tests/ThemeSystem.test.js
const fs = require('fs');
const path = require('path');

// Importing testing utilities
const { createColorChecker } = require('./utils/colorChecker');
const { createStylesheetObserver } = require('./utils/styleObserver');

// Paths
const SRC_PATH = path.resolve(__dirname, '..');
const STYLES_PATH = path.join(SRC_PATH, 'styles');
const COLORS_PATH = path.join(STYLES_PATH, 'colors.css');
const ASSETS_SVG_PATH = path.join(SRC_PATH, 'assets/svg');

// Define the expected colors for our theme
const EXPECTED_THEME_COLORS = {
  primary: '#00A0A0',      // teal
  secondary: '#F8D38D',    // golden
};

/**
 * Read a file
 * @param {string} filePath - The path to read
 * @returns {string} - The file content
 */
const readFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err);
    return '';
  }
};

/**
 * Helper function to recursively get all files in a directory
 * @param {string} dirPath - Directory to scan
 * @param {Array} arrayOfFiles - Accumulated files
 * @returns {Array} - Array of file paths
 */
const getAllFiles = (dirPath, arrayOfFiles = []) => {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
};

/**
 * Get all SVG files in the assets directory
 * @returns {Array} - Array of SVG file paths
 */
const getAllSvgFiles = () => {
  const svgFiles = getAllFiles(ASSETS_SVG_PATH).filter(file => file.endsWith('.svg'));
  // Also check the logo directory
  const logoPath = path.join(SRC_PATH, 'assets/logo');
  if (fs.existsSync(logoPath)) {
    const logoFiles = getAllFiles(logoPath).filter(file => file.endsWith('.svg'));
    return [...svgFiles, ...logoFiles];
  }
  return svgFiles;
};

/**
 * Extract all color variables from colors.css
 * @returns {Object} - Object with variable names and values
 */
const extractColorVariables = () => {
  const colorsContent = readFile(COLORS_PATH);
  const variables = {};
  
  const regex = /--([a-zA-Z0-9-]+):\s*(#[A-Fa-f0-9]{3,8}|var\([^)]+\)|rgba?\([^)]+\));/g;
  let match;
  
  while ((match = regex.exec(colorsContent))) {
    variables[`--${match[1]}`] = match[2];
  }
  
  return variables;
};

/**
 * Check if variable values correctly reference our theme colors
 * @param {Object} variables - The CSS variables
 * @returns {Object} - Assessment results
 */
const assessThemeVariables = (variables) => {
  const result = {
    hasPrimaryTeal: false,
    hasSecondaryGold: false,
    primaryValue: null,
    secondaryValue: null,
    derivedFromPrimary: [],
    derivedFromSecondary: [],
    errors: []
  };

  // Check for primary teal color
  if (variables['--primary-teal']) {
    result.primaryValue = variables['--primary-teal'];
    result.hasPrimaryTeal = variables['--primary-teal'].toLowerCase() === EXPECTED_THEME_COLORS.primary.toLowerCase();
    
    if (!result.hasPrimaryTeal) {
      result.errors.push(`Primary teal color is ${variables['--primary-teal']} but should be ${EXPECTED_THEME_COLORS.primary}`);
    }
  } else {
    result.errors.push('Missing --primary-teal variable');
  }

  // Check for secondary gold color
  if (variables['--secondary-gold']) {
    result.secondaryValue = variables['--secondary-gold'];
    result.hasSecondaryGold = variables['--secondary-gold'].toLowerCase() === EXPECTED_THEME_COLORS.secondary.toLowerCase();
    
    if (!result.hasSecondaryGold) {
      result.errors.push(`Secondary gold color is ${variables['--secondary-gold']} but should be ${EXPECTED_THEME_COLORS.secondary}`);
    }
  } else {
    result.errors.push('Missing --secondary-gold variable');
  }

  // Find all variables derived from primary teal
  Object.entries(variables).forEach(([name, value]) => {
    if (value.includes('--primary-teal') || (result.primaryValue && value === result.primaryValue)) {
      result.derivedFromPrimary.push(name);
    }
    
    if (value.includes('--secondary-gold') || (result.secondaryValue && value === result.secondaryValue)) {
      result.derivedFromSecondary.push(name);
    }
  });

  return result;
};

/**
 * Check SVG files for CSS variable usage
 * @returns {Object} - Assessment results
 */
const assessSvgFiles = () => {
  // Get a sample of SVG files for quick testing
  const svgFiles = getAllSvgFiles().slice(0, 10);
  const result = {
    totalSvgFiles: svgFiles.length,
    filesUsingCssVars: 0,
    filesWithHardcodedPrimaryColor: 0,
    filesWithHardcodedSecondaryColor: 0,
    svgsWithIssues: []
  };
  
  if (svgFiles.length === 0) {
    result.error = 'No SVG files found';
    return result;
  }
  
  svgFiles.forEach(file => {
    try {
      const content = readFile(file);
      const fileName = path.basename(file);
      const fileIssues = [];
      
      // Check if SVG uses CSS variables
      const usesVars = content.includes('var(--');
      if (usesVars) {
        result.filesUsingCssVars++;
      } else {
        fileIssues.push('Does not use CSS variables');
      }
      
      // Check for hardcoded primary color
      if (content.includes(EXPECTED_THEME_COLORS.primary) && !content.includes('var(--primary-teal') && !content.includes('var(--beat-first')) {
        result.filesWithHardcodedPrimaryColor++;
        fileIssues.push('Uses hardcoded primary teal color');
      }
      
      // Check for hardcoded secondary color
      if (content.includes(EXPECTED_THEME_COLORS.secondary) && !content.includes('var(--secondary-gold') && !content.includes('var(--beat-accent')) {
        result.filesWithHardcodedSecondaryColor++;
        fileIssues.push('Uses hardcoded secondary gold color');
      }
      
      if (fileIssues.length > 0) {
        result.svgsWithIssues.push({
          file: fileName,
          issues: fileIssues
        });
      }
    } catch (err) {
      console.error(`Error analyzing SVG ${file}:`, err.message);
    }
  });
  
  return result;
};

/**
 * Check JS/JSX files for inline styles with hardcoded colors
 * @returns {Object} - Assessment results
 */
const assessJsFiles = () => {
  // Simplified version for quicker testing - just check a few important files
  const jsFiles = [
    path.join(SRC_PATH, 'App.js'),
    path.join(SRC_PATH, 'components/metronome/EditableSlider.js'),
    path.join(SRC_PATH, 'components/Menu/mainMenu.js')
  ].filter(file => fs.existsSync(file));
  
  const result = {
    totalJsFiles: jsFiles.length,
    filesWithInlineStyles: 0,
    filesWithHardcodedColors: 0,
    hardcodedColorInstances: 0,
    filesWithIssues: []
  };
  
  // Simplified approach to make the test run faster
  jsFiles.forEach(file => {
    try {
      const content = readFile(file);
      const fileName = path.relative(SRC_PATH, file);
      
      // Basic check for inline styles
      if (content.includes('style=') || content.includes('style: {')) {
        result.filesWithInlineStyles++;
        
        // Simple check for our theme colors
        const hasPrimaryTeal = content.includes('#00A0A0');
        const hasSecondaryGold = content.includes('#F8D38D');
        
        if (hasPrimaryTeal || hasSecondaryGold) {
          result.filesWithHardcodedColors++;
          result.hardcodedColorInstances += (hasPrimaryTeal ? 1 : 0) + (hasSecondaryGold ? 1 : 0);
          result.filesWithIssues.push({
            file: fileName,
            instances: [
              ...(hasPrimaryTeal ? [{ type: 'hex', value: '#00A0A0' }] : []),
              ...(hasSecondaryGold ? [{ type: 'hex', value: '#F8D38D' }] : [])
            ]
          });
        }
      }
    } catch (err) {
      console.error(`Error analyzing file ${file}:`, err.message);
    }
  });
  
  return result;
};

describe('Theme System Tests', () => {
  let colorVariables;
  let themeAssessment;
  let svgAssessment;
  let jsAssessment;
  
  beforeAll(() => {
    colorVariables = extractColorVariables();
    themeAssessment = assessThemeVariables(colorVariables);
    svgAssessment = assessSvgFiles();
    jsAssessment = assessJsFiles();
  });
  
  // Theme colors tests
  describe('Theme Color Variables', () => {
    test('Primary teal color is correctly defined', () => {
      expect(themeAssessment.hasPrimaryTeal).toBe(true);
    });
    
    test('Secondary gold color is correctly defined', () => {
      expect(themeAssessment.hasSecondaryGold).toBe(true);
    });
    
    test('Beat colors are derived from theme colors', () => {
      expect(colorVariables['--beat-first']).toBeDefined();
      expect(colorVariables['--beat-accent']).toBeDefined();
      expect(colorVariables['--beat-normal']).toBeDefined();
      
      // Beat first should be derived from primary teal
      expect(themeAssessment.derivedFromPrimary.includes('--beat-first')).toBe(true);
      
      // Beat accent should be derived from secondary gold
      expect(themeAssessment.derivedFromSecondary.includes('--beat-accent')).toBe(true);
    });
    
    test('Semantic colors are using theme variables', () => {
      expect(colorVariables['--success']).toBeDefined();
      expect(colorVariables['--warning']).toBeDefined();
      
      // Success should be derived from primary teal
      expect(themeAssessment.derivedFromPrimary.includes('--success') || 
             colorVariables['--success'] === EXPECTED_THEME_COLORS.primary).toBe(true);
      
      // Warning should be derived from secondary gold
      expect(themeAssessment.derivedFromSecondary.includes('--warning') || 
             colorVariables['--warning'] === EXPECTED_THEME_COLORS.secondary).toBe(true);
    });
  });
  
  // SVG tests
  describe('SVG Theme Compliance', () => {
    test('SVG files exist and were analyzed', () => {
      expect(svgAssessment.totalSvgFiles).toBeGreaterThan(0);
    });
    
    test('Most SVG files use CSS variables for colors', () => {
      const percentage = (svgAssessment.filesUsingCssVars / svgAssessment.totalSvgFiles) * 100;
      
      console.log(`${percentage.toFixed(1)}% of SVG files use CSS variables (${svgAssessment.filesUsingCssVars}/${svgAssessment.totalSvgFiles})`);
      
      // Expect at least 80% of SVGs to use CSS variables
      expect(percentage).toBeGreaterThanOrEqual(80);
    });
    
    test('SVG files do not use hardcoded theme colors', () => {
      if (svgAssessment.filesWithHardcodedPrimaryColor > 0 || svgAssessment.filesWithHardcodedSecondaryColor > 0) {
        console.warn('SVGs with hardcoded theme colors:', JSON.stringify(svgAssessment.svgsWithIssues, null, 2));
      }
      
      expect(svgAssessment.filesWithHardcodedPrimaryColor).toBe(0);
      expect(svgAssessment.filesWithHardcodedSecondaryColor).toBe(0);
    });
  });
  
  // JS/JSX tests
  describe('JS Files Theme Compliance', () => {
    test('JS files were analyzed', () => {
      expect(jsAssessment.totalJsFiles).toBeGreaterThan(0);
    });
    
    test('Minimal use of inline styles with hardcoded colors', () => {
      const percentage = (jsAssessment.filesWithHardcodedColors / jsAssessment.filesWithInlineStyles) * 100;
      
      console.log(`Found ${jsAssessment.hardcodedColorInstances} hardcoded colors in ${jsAssessment.filesWithHardcodedColors} files`);
      
      if (jsAssessment.filesWithIssues.length > 0) {
        console.warn('Files with hardcoded colors:', JSON.stringify(jsAssessment.filesWithIssues.slice(0, 5), null, 2));
        
        if (jsAssessment.filesWithIssues.length > 5) {
          console.warn(`...and ${jsAssessment.filesWithIssues.length - 5} more files`);
        }
      }
      
      // This test might pass with warnings - adjust threshold as needed
      expect(jsAssessment.filesWithHardcodedColors).toBeLessThanOrEqual(jsAssessment.filesWithInlineStyles * 0.2);
    });
  });
  
  // Theme system overall assessment
  describe('Theme System Overall Assessment', () => {
    test('Theme system is properly implemented with CSS variables', () => {
      // Calculate an overall "theme system score"
      const themeVarsCorrect = themeAssessment.hasPrimaryTeal && themeAssessment.hasSecondaryGold;
      const svgScore = svgAssessment.filesUsingCssVars / svgAssessment.totalSvgFiles;
      const jsScore = 1 - (jsAssessment.filesWithHardcodedColors / jsAssessment.totalJsFiles);
      
      const overallScore = (themeVarsCorrect ? 1 : 0) * 0.4 + svgScore * 0.4 + jsScore * 0.2;
      const percentage = overallScore * 100;
      
      console.log(`Theme system overall score: ${percentage.toFixed(1)}%`);
      console.log(`- Theme variables: ${themeVarsCorrect ? '✓' : '✗'}`);
      console.log(`- SVG compliance: ${(svgScore * 100).toFixed(1)}%`);
      console.log(`- JS compliance: ${(jsScore * 100).toFixed(1)}%`);
      
      // 80% or higher is a good theme system
      expect(overallScore).toBeGreaterThanOrEqual(0.8);
    });
  });
});
