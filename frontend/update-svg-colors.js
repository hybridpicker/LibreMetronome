/**
 * Script to update SVG color values from the old theme to the new theme
 * Run with: node update-svg-colors.js
 */

const fs = require('fs');
const path = require('path');

const SVG_DIR = path.join(__dirname, 'src', 'assets', 'svg');
const COLOR_MAPPINGS = {
  '#00ADB5': '#00A0A0',  // Old teal to new teal
  '#008F96': '#008585',  // Old dark teal to new dark teal
  '#F0B048': '#F8D38D',  // Old gold to new gold
  '#E09C38': '#EABF70',  // Old dark gold to new dark gold
  '#F8C668': '#FAE0AD',  // Old light gold to new light gold
  // Add any other color mappings as needed
};

// Find all SVG files
const findSvgFiles = (dir) => {
  const results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results.push(...findSvgFiles(filePath));
    } else if (path.extname(file) === '.svg') {
      results.push(filePath);
    }
  }
  
  return results;
};

// Process SVG files
const updateSvgColors = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  for (const [oldColor, newColor] of Object.entries(COLOR_MAPPINGS)) {
    if (content.includes(oldColor)) {
      content = content.replace(new RegExp(oldColor, 'g'), newColor);
      modified = true;
    }
  }
  
  if (modified) {
    // Create a backup of the original file
    fs.writeFileSync(`${filePath}.backup`, fs.readFileSync(filePath));
    
    // Write the updated content
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
  }
};

// Main execution
try {
  const svgFiles = findSvgFiles(SVG_DIR);
  console.log(`Found ${svgFiles.length} SVG files.`);

  svgFiles.forEach(updateSvgColors);
  console.log('SVG color update complete.');
} catch (err) {
  console.error('Error:', err.message);
}
