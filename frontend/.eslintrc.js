module.exports = {
  root: true,
  extends: ['react-app', 'react-app/jest', 'plugin:security/recommended-legacy'],
  rules: {
    // Indexing with computed keys is pervasive and flagged without any taint information.
    'security/detect-object-injection': 'off',
    // Ratchet: the most complex function today (App.js desktop command effect) scores 22.
    // Lower this number whenever a hotspot is refactored; never raise it.
    complexity: ['error', 22]
  },
  overrides: [
    {
      // Tests read stylesheets and fixtures by computed path and build regexps from fixed CSS selectors.
      files: ['src/tests/**/*.{js,jsx}', 'src/**/*.test.{js,jsx}'],
      rules: {
        'security/detect-non-literal-fs-filename': 'off',
        'security/detect-non-literal-regexp': 'off'
      }
    },
    {
      // These suites assert on SVG/DOM structure and class names that have no accessible role.
      files: [
        'src/tests/metronome/BeatStaff.test.js',
        'src/tests/BeatIndicator.test.js',
        'src/tests/components/HelpButton.test.jsx',
        'src/tests/components/HelpSystemIntegration.test.jsx',
        'src/tests/components/InfoModal.test.jsx',
        'src/App.test.js'
      ],
      rules: {
        'testing-library/no-container': 'off',
        'testing-library/no-node-access': 'off'
      }
    }
  ]
};
