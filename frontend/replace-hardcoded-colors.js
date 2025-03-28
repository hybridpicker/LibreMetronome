/**
 * Script to replace hardcoded colors with CSS variables in CSS, JS, and JSX files
 * Run with: node replace-hardcoded-colors.js
 * 
 * Note: This script requires the 'glob' package. Install with:
 * npm install glob
 */

const fs = require('fs');
const path = require('path');
// You'll need to install this package: npm install glob
const glob = require('glob');

const SOURCE_DIR = path.join(__dirname, 'src');
const COLOR_MAPPINGS = {
  '#00ADB5': 'var(--primary-blue)',
  '#008F96': 'var(--primary-blue-dark)',
  '#B3E0E0': 'var(--primary-blue-light)',
  '#E6F5F5': 'var(--primary-blue-ultra-light)',
  '#F0B048': 'var(--secondary-aqua)',
  '#E09C38': 'var(--secondary-aqua-dark)',
  '#F8C668': 'var(--secondary-aqua-light)',
  '#FFF8E6': 'var(--secondary-aqua-ultra-light)',
  // Add other colors as needed
};

// Exclude SVG files since we're handling them separately
const findFiles = () => {
  return new Promise((resolve, reject) => {
    glob(`${SOURCE_DIR}/**/*.@(css|js|jsx)`, { ignore: ['**/node_modules/**', '**/*.svg'] }, (err, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });
};

// Process each file
const processFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let newContent = content;
    
    for (const [hexColor, cssVar] of Object.entries(COLOR_MAPPINGS)) {
      if (content.includes(hexColor)) {
        // Don't replace colors in SVG imports or string literals that refer to file paths
        // This regex looks for the hex color not preceded or followed by quotes or word characters
        const regex = new RegExp(`(?<!("|'|\\w|/))${hexColor}(?!("|'|\\w))`, 'g');
        newContent = newContent.replace(regex, cssVar);
        modified = true;
      }
    }
    
    if (modified) {
      // Create a backup
      fs.writeFileSync(`${filePath}.backup`, content);
      
      // Write the modified content
      fs.writeFileSync(filePath, newContent);
      console.log(`Updated: ${filePath}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
  }
};

// Main execution
async function main() {
  try {
    const files = await findFiles();
    console.log(`Found ${files.length} CSS/JS/JSX files.`);
    
    for (const file of files) {
      processFile(file);
    }
    
    console.log('Hardcoded color replacement complete.');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
