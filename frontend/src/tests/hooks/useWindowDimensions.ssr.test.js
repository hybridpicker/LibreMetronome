/**
 * @jest-environment node
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import useWindowDimensions from '../../hooks/useWindowDimensions';

function Probe() {
  const { width, height } = useWindowDimensions();
  return <span>{`${width}x${height}`}</span>;
}

describe('useWindowDimensions without a window (server rendering)', () => {
  test('there really is no window in this environment', () => {
    expect(typeof window).toBe('undefined');
  });

  test('falls back to 1024x768', () => {
    expect(renderToString(<Probe />)).toBe('<span>1024x768</span>');
  });
});
