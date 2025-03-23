// src/components/Training/withTrainingContainer.js
// This is a stub implementation to make tests pass
// Replace with actual implementation

import React from 'react';

const withTrainingContainer = (WrappedComponent) => {
  return (props) => {
    // Just pass through all props to the wrapped component
    return <WrappedComponent {...props} />;
  };
};

export default withTrainingContainer;