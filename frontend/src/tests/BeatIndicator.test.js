import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock renderBeatIndicators function from TrainingActiveContainer
const renderBeatIndicators = (count, total) => {
  const indicators = [];
  for (let i = 0; i < total; i++) {
    indicators.push(
      <span 
        key={i} 
        className={`beat-indicator ${i < count ? 'active' : ''}`}
        aria-label={`Beat ${i+1} ${i < count ? 'completed' : 'upcoming'}`}
      />
    );
  }
  return <div className="beat-indicators">{indicators}</div>;
};

describe('Beat Indicators', () => {
  test('renders correct number of total indicators', () => {
    const { container } = render(renderBeatIndicators(2, 4));
    const indicators = container.querySelectorAll('.beat-indicator');
    expect(indicators.length).toBe(4);
  });

  test('marks correct number of indicators as active', () => {
    const { container } = render(renderBeatIndicators(3, 5));
    const activeIndicators = container.querySelectorAll('.beat-indicator.active');
    expect(activeIndicators.length).toBe(3);
  });

  test('renders zero active indicators when count is 0', () => {
    const { container } = render(renderBeatIndicators(0, 4));
    const activeIndicators = container.querySelectorAll('.beat-indicator.active');
    expect(activeIndicators.length).toBe(0);
  });

  test('renders all indicators active when count equals total', () => {
    const { container } = render(renderBeatIndicators(5, 5));
    const indicators = container.querySelectorAll('.beat-indicator');
    const activeIndicators = container.querySelectorAll('.beat-indicator.active');
    expect(indicators.length).toBe(5);
    expect(activeIndicators.length).toBe(5);
  });

  test('has correct aria-label for each indicator', () => {
    const { container } = render(renderBeatIndicators(2, 4));
    const indicators = container.querySelectorAll('.beat-indicator');
    
    indicators.forEach((indicator, index) => {
      const expectedLabel = index < 2 
        ? `Beat ${index+1} completed` 
        : `Beat ${index+1} upcoming`;
      
      expect(indicator).toHaveAttribute('aria-label', expectedLabel);
    });
  });
});
