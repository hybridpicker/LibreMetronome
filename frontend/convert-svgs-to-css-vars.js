/**
 * Script to convert SVG files to use CSS variables instead of hardcoded colors
 * Run with: node convert-svgs-to-css-vars.js
 */

const fs = require('fs');
const path = require('path');

const SVG_DIR = path.join(__dirname, 'src', 'assets', 'svg');
const COLOR_MAPPINGS = {
  '#00A0A0': 'var(--beat-first, #00A0A0)',   // First beat
  '#F8D38D': 'var(--beat-accent, #F8D38D)',  // Accented beat
  '#EABF70': 'var(--beat-accent, #F8D38D)',  // Dark accent
  '#FAE0AD': 'var(--beat-normal, #FAE0AD)',  // Normal beat
  '#fcfcfc': 'var(--text-light, #fcfcfc)',   // White stroke
  '#ffffff': 'var(--text-light, #ffffff)',   // White fill
  '#FAE0AD': 'var(--beat-inner, #FAE0AD)',   // Inner beat
  '#F8D38D': 'var(--beat-outer, #F8D38D)',   // Outer beat
  // Add any other color mappings as needed
};

// Specific SVG types and their appropriate color variables
const SVG_TYPE_MAPPINGS = {
  'firstBeat': 'var(--beat-first, #00A0A0)',
  'normalBeat': 'var(--beat-normal, #FAE0AD)',
  'accentedBeat': 'var(--beat-accent, #F8D38D)',
  'play': 'var(--primary-teal, #00A0A0)',
  'pause': 'var(--primary-teal, #00A0A0)',
  'training-button': 'var(--primary-teal, #00A0A0)',
  'tap-button': 'var(--primary-teal, #00A0A0)',
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

// Convert SVGs to use CSS variables
const convertSvgToCssVars = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, '.svg');
    let modified = false;
    let newContent = content;
    
    // Try to determine the appropriate variable based on the filename
    let specialMapping = false;
    for (const [svgType, cssVar] of Object.entries(SVG_TYPE_MAPPINGS)) {
      if (fileName.includes(svgType)) {
        // This is a special SVG type that needs specific variables
        specialMapping = true;
        
        // Replace fill color with the appropriate CSS variable
        // Look for fill: #XXXXXX
        const fillRegex = /fill:\s*(#[0-9A-Fa-f]{3,6})/g;
        newContent = newContent.replace(fillRegex, (match, hexColor) => {
          modified = true;
          return `fill: ${cssVar}`;
        });
        
        break;
      }
    }
    
    // If no special mapping or after special mapping, apply regular color mappings
    for (const [hexColor, cssVar] of Object.entries(COLOR_MAPPINGS)) {
      if (newContent.includes(hexColor)) {
        newContent = newContent.replace(new RegExp(hexColor, 'g'), cssVar);
        modified = true;
      }
    }
    
    if (modified) {
      // Create a backup
      fs.writeFileSync(`${filePath}.backup`, content);
      
      // Output to a new file with .cssvar extension to review changes first
      const outputPath = `${filePath}.cssvar`;
      fs.writeFileSync(outputPath, newContent);
      console.log(`Converted: ${filePath} -> ${outputPath}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
  }
};

// Main execution
try {
  const svgFiles = findSvgFiles(SVG_DIR);
  console.log(`Found ${svgFiles.length} SVG files.`);

  svgFiles.forEach(convertSvgToCssVars);
  console.log('SVG conversion to CSS variables complete. Review .cssvar files before replacing originals.');
} catch (err) {
  console.error('Error:', err.message);
}
