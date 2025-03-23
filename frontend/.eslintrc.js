module.exports = {
  extends: ["react-app", "react-app/jest"],
  overrides: [
    {
      files: ["**/PolyrhythmMode/usePolyrhythmLogic.js"],
      rules: {
        "react-hooks/exhaustive-deps": "off"
      }
    }
  ]
};
