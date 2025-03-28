// src/tests/BasicThemeTest.test.js
const fs = require('fs');
const path = require('path');

// Path settings
const COLORS_PATH = path.resolve(__dirname, '../styles/colors.css');

// Define the expected colors for our theme
const EXPECTED_THEME_COLORS = {
  primary: '#00A0A0',      // teal
  secondary: '#F8D38D',    // golden
};

/**
 * Extracts all color variables from colors.css
 * @returns {Object} - Object with variable names and values
 */
const extractColorVariables = () => {
  const colorsContent = fs.readFileSync(COLORS_PATH, 'utf8');
  const variables = {};
  
  const regex = /--([a-zA-Z0-9-]+):\s*(#[A-Fa-f0-9]{3,8}|var\([^)]+\)|rgba?\([^)]+\));/g;
  let match;
  
  while ((match = regex.exec(colorsContent))) {
    variables[`--${match[1]}`] = match[2];
  }
  
  return variables;
};

describe('Basic Theme Test', () => {
  let colorVariables;
  
  beforeAll(() => {
    colorVariables = extractColorVariables();
  });
  
  test('Primary teal color is correctly defined', () => {
    expect(colorVariables['--primary-teal'].toLowerCase()).toBe(EXPECTED_THEME_COLORS.primary.toLowerCase());
  });
  
  test('Secondary gold color is correctly defined', () => {
    expect(colorVariables['--secondary-gold'].toLowerCase()).toBe(EXPECTED_THEME_COLORS.secondary.toLowerCase());
  });
});
