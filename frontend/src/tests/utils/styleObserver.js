/**
 * Utility for observing runtime stylesheets and checking for color scheme compliance
 */

/**
 * Creates a stylesheet observer to check for color violations
 * @param {Array} allowedColors - Array of allowed hex colors
 * @returns {Object} - Observer methods
 */
function createStylesheetObserver(allowedColors = []) {
  const violations = [];
  let observer = null;

  const processStylesheet = (stylesheet) => {
    try {
      // Get all CSS rules from the stylesheet
      const rules = Array.from(stylesheet.cssRules || []);
      
      // Process each rule
      rules.forEach(rule => {
        if (rule.style) {
          // Check for color properties
          const colorProps = [
            'color', 
            'background-color', 
            'border-color',
            'border-top-color',
            'border-right-color',
            'border-bottom-color',
            'border-left-color',
            'outline-color',
            'box-shadow'
          ];
          
          colorProps.forEach(prop => {
            const value = rule.style.getPropertyValue(prop);
            
            // Check if it's a hex color
            if (value && value.startsWith('#')) {
              const hexColor = value.toLowerCase();
              
              // Verify it's using a variable or is an allowed color
              if (!value.includes('var(--') && !allowedColors.includes(hexColor)) {
                violations.push({
                  selector: rule.selectorText,
                  property: prop,
                  value: hexColor
                });
              }
            }
          });
        }
      });
    } catch (e) {
      console.error('Error processing stylesheet:', e);
    }
  };

  /**
   * Start observing stylesheets for changes
   */
  const observe = () => {
    if (typeof document === 'undefined') return;
    
    // Process existing stylesheets
    Array.from(document.styleSheets).forEach(processStylesheet);
    
    // Set up observer for new stylesheets
    observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        Array.from(mutation.addedNodes).forEach(node => {
          if (node.tagName === 'STYLE' || 
             (node.tagName === 'LINK' && node.rel === 'stylesheet')) {
            // Wait for stylesheet to load
            setTimeout(() => {
              try {
                if (node.sheet) {
                  processStylesheet(node.sheet);
                }
              } catch (e) {
                console.error('Error observing new stylesheet:', e);
              }
            }, 100);
          }
        });
      });
    });
    
    observer.observe(document.head, { 
      childList: true, 
      subtree: true 
    });
  };

  /**
   * Stop observing stylesheets
   */
  const disconnect = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  /**
   * Get all violations found
   */
  const getStyleViolations = () => {
    return [...violations];
  };

  return {
    observe,
    disconnect,
    getStyleViolations
  };
}

module.exports = {
  createStylesheetObserver
};
