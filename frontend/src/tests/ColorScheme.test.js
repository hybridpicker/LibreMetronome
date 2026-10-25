// Use require syntax instead of import to avoid potential issues
const fs = require('fs');
const path = require('path');

// Destructure for convenience
const { readFileSync, readdirSync, statSync } = fs;
const { join, resolve } = path;

// Path settings
const SRC_PATH = resolve(__dirname, '..');
const STYLES_PATH = join(SRC_PATH, 'styles');
const COLORS_PATH = join(STYLES_PATH, 'colors.css');

// Helper to read a file
const readFile = (path) => readFileSync(path, 'utf8');

/**
 * Gets all CSS files in a directory (recursive)
 */
const getAllCssFiles = (dir, filesArray = []) => {
  const files = readdirSync(dir);

  files.forEach(file => {
    const filePath = join(dir, file);
    const isDirectory = statSync(filePath).isDirectory();

    if (isDirectory) {
      getAllCssFiles(filePath, filesArray);
    } else if (file.endsWith('.css')) {
      filesArray.push(filePath);
    }
  });

  return filesArray;
};

/**
 * Extracts all color variables and their values from colors.css
 */
const extractColorScheme = () => {
  const colorsCss = readFile(COLORS_PATH);
  const colorVars = {};
  const colorHexValues = new Set();

  // Extract CSS variables
  const variableRegex = /--([a-zA-Z0-9-]+):\s*(#[a-fA-F0-9]{3,6})/g;
  let match;

  while ((match = variableRegex.exec(colorsCss)) !== null) {
    const name = match[1];
    const hexValue = match[2].toLowerCase();
    colorVars[`--${name}`] = hexValue;
    colorHexValues.add(hexValue);
  }

  return { colorVars, colorHexValues: Array.from(colorHexValues) };
};

/**
 * Finds hardcoded colors in CSS files
 */
const findHardcodedColors = (fileContent, filePath, colorHexValues) => {
  const violations = [];
  
  // Skip colors.css file itself
  if (filePath === COLORS_PATH) {
    return violations;
  }

  // Find hex colors not using CSS variables
  const hexRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/g;
  let match;
  
  while ((match = hexRegex.exec(fileContent)) !== null) {
    const hexValue = match[0].toLowerCase();
    const contextStart = Math.max(0, match.index - 20);
    const contextEnd = Math.min(fileContent.length, match.index + 20);
    const context = fileContent.substring(contextStart, contextEnd);
    
    // Skip if it's part of a CSS variable declaration
    if (!context.includes('var(--') && !context.includes('--') && colorHexValues.includes(hexValue)) {
      // It's a color that matches our scheme but is hardcoded
      violations.push({
        value: hexValue,
        context,
        lineNumber: getLineNumber(fileContent, match.index)
      });
    }
  }
  
  return violations;
};

/**
 * Get line number for a position in a string
 */
const getLineNumber = (content, position) => {
  const lines = content.slice(0, position).split('\n');
  return lines.length;
};

describe('Color Scheme Tests', () => {
  let colorScheme;
  let cssFiles;
  
  beforeAll(() => {
    colorScheme = extractColorScheme();
    cssFiles = getAllCssFiles(SRC_PATH)
      // colors.css and accessibility-modes.css define the tokens, so they hold the raw values.
      .filter(file => file !== COLORS_PATH && !file.endsWith('accessibility-modes.css'));
  });
  
  test('Colors are defined in colors.css', () => {
    expect(Object.keys(colorScheme.colorVars).length).toBeGreaterThan(0);
    expect(colorScheme.colorHexValues.length).toBeGreaterThan(0);
  });
  
  test('CSS files should use color variables instead of hardcoded colors', () => {
    const allViolations = [];
    
    cssFiles.forEach(file => {
      const content = readFile(file);
      const violations = findHardcodedColors(content, file, colorScheme.colorHexValues);
      
      if (violations.length > 0) {
        allViolations.push({
          file,
          violations
        });
      }
    });
    
    const report = allViolations.map(item => {
      const relativePath = item.file.replace(SRC_PATH, '');
      const violationList = item.violations.map(v =>
        `  - Line ${v.lineNumber}: ${v.value} in context: "${v.context.trim()}"`
      ).join('\n');

      return `File: ${relativePath}\n${violationList}`;
    }).join('\n\n');

    // An empty report means no stylesheet hard-codes a colour outside the token files.
    expect(report).toBe('');
  });
});
