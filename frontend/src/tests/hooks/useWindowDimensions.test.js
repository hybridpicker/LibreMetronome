import { renderHook, act } from '@testing-library/react';
import useWindowDimensions from '../../hooks/useWindowDimensions';

describe('useWindowDimensions', () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;

  const resizeTo = (width, height) => {
    window.innerWidth = width;
    window.innerHeight = height;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
  };

  afterEach(() => {
    window.innerWidth = originalWidth;
    window.innerHeight = originalHeight;
    jest.restoreAllMocks();
  });

  test('starts with the current window size', () => {
    window.innerWidth = 812;
    window.innerHeight = 375;

    const { result } = renderHook(() => useWindowDimensions());

    expect(result.current).toEqual({ width: 812, height: 375 });
  });

  test('updates on every resize event', () => {
    const { result } = renderHook(() => useWindowDimensions());

    resizeTo(400, 900);
    expect(result.current).toEqual({ width: 400, height: 900 });

    resizeTo(1280, 720);
    expect(result.current).toEqual({ width: 1280, height: 720 });
  });

  test('removes the resize listener on unmount', () => {
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    const { result, unmount } = renderHook(() => useWindowDimensions());
    const handler = add.mock.calls.find(([type]) => type === 'resize')[1];

    unmount();

    expect(remove).toHaveBeenCalledWith('resize', handler);
    const before = result.current;
    window.innerWidth = 111;
    window.dispatchEvent(new Event('resize'));
    expect(result.current).toBe(before);
  });
});
