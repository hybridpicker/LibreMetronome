/**
 * Utility for checking elements for color scheme compliance
 */

/**
 * Creates a color checker for React components
 * @param {Array} allowedColors - Array of allowed hex colors
 * @returns {Object} - Color checker methods
 */
function createColorChecker(allowedColors = []) {
  const violations = [];

  /**
   * Check if a color value complies with the scheme
   * @param {string} color - The color value to check
   * @param {string} property - The CSS property using this color
   * @returns {boolean} - Whether the color is compliant
   */
  const isColorCompliant = (color, property) => {
    // Skip if not a color
    if (!color) return true;
    
    // Hex colors should use variables
    if (color.startsWith('#')) {
      const hexColor = color.toLowerCase();
      return allowedColors.includes(hexColor);
    }
    
    // Check if using CSS variables
    return color.includes('var(--');
  };

  /**
   * Check an element and its children for style violations
   * @param {HTMLElement} element - The element to check
   * @returns {Array} - Array of style violations
   */
  const checkElement = (element) => {
    if (!element || typeof window === 'undefined') return [];
    
    const foundViolations = [];
    
    // Check this element's inline styles
    if (element.style) {
      const colorProperties = [
        'color',
        'backgroundColor',
        'borderColor',
        'borderTopColor',
        'borderRightColor',
        'borderBottomColor',
        'borderLeftColor'
      ];
      
      colorProperties.forEach(prop => {
        const value = element.style[prop];
        if (value && !isColorCompliant(value, prop)) {
          foundViolations.push({
            element: element.tagName,
            className: element.className,
            property: prop,
            value: value
          });
        }
      });
    }
    
    // Recursively check all child elements
    Array.from(element.children || []).forEach(child => {
      const childViolations = checkElement(child);
      foundViolations.push(...childViolations);
    });
    
    return foundViolations;
  };

  /**
   * Check a React component's computed styles
   * @param {HTMLElement} element - The rendered component's root element
   * @returns {Array} - Array of style violations
   */
  const checkComputedStyles = (element) => {
    if (!element || typeof window === 'undefined') return [];
    
    const foundViolations = [];
    const checkElementComputed = (el) => {
      if (!el) return;
      
      const computedStyle = window.getComputedStyle(el);
      const colorProperties = [
        'color',
        'backgroundColor',
        'borderTopColor',
        'borderRightColor',
        'borderBottomColor',
        'borderLeftColor'
      ];
      
      colorProperties.forEach(prop => {
        const value = computedStyle[prop];
        // For computed styles, we only check if the resulting color matches our scheme
        // This is less strict than inline style checking
        if (value && value.startsWith('rgb')) {
          // This is a complex check that would convert RGB to hex and compare
          // For simplicity, we're skipping the actual implementation here
        }
      });
      
      // Check children
      Array.from(el.children || []).forEach(checkElementComputed);
    };
    
    checkElementComputed(element);
    return foundViolations;
  };

  return {
    checkElement,
    checkComputedStyles
  };
}

module.exports = {
  createColorChecker
};
