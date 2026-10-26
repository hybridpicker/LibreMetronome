import React from 'react';
import { render, screen, act, renderHook } from '@testing-library/react';
import { useVizCardSize } from '../../utils/layoutSize';

let sizes;
function Probe() {
  const [ref, size] = useVizCardSize();
  sizes.push(size);
  return (
    <div ref={ref} data-testid="card">
      {size.width}x{size.height}
    </div>
  );
}

describe('useVizCardSize', () => {
  let dims;
  let observers;
  const originalRO = global.ResizeObserver;

  beforeEach(() => {
    sizes = [];
    dims = { w: 300, h: 150 };
    observers = [];
    jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => dims.w);
    jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => dims.h);
    global.ResizeObserver = jest.fn(function ResizeObserverMock(cb) {
      this.cb = cb;
      this.observe = jest.fn();
      this.disconnect = jest.fn();
      observers.push(this);
    });
  });

  afterEach(() => {
    global.ResizeObserver = originalRO;
    jest.restoreAllMocks();
  });

  test('measures the element on mount and observes it', () => {
    render(<Probe />);

    expect(screen.getByTestId('card')).toHaveTextContent('300x150');
    expect(observers).toHaveLength(1);
    expect(observers[0].observe).toHaveBeenCalledWith(screen.getByTestId('card'));
  });

  test('re-measures when the ResizeObserver fires', () => {
    render(<Probe />);

    dims = { w: 640, h: 480 };
    act(() => observers[0].cb());

    expect(screen.getByTestId('card')).toHaveTextContent('640x480');
  });

  test('re-measures on window resize', () => {
    render(<Probe />);

    dims = { w: 100, h: 50 };
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByTestId('card')).toHaveTextContent('100x50');
  });

  test('keeps the same size object when the measured size is unchanged', () => {
    render(<Probe />);
    const initial = sizes[sizes.length - 1];

    act(() => observers[0].cb());
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    // the state object keeps its identity when width and height are unchanged
    expect(sizes[sizes.length - 1]).toBe(initial);
  });

  test('a change of only the height still updates', () => {
    render(<Probe />);

    dims = { w: 300, h: 151 };
    act(() => observers[0].cb());

    expect(screen.getByTestId('card')).toHaveTextContent('300x151');
  });

  test('works without ResizeObserver (window resize only)', () => {
    delete global.ResizeObserver;
    render(<Probe />);

    expect(screen.getByTestId('card')).toHaveTextContent('300x150');
    dims = { w: 10, h: 20 };
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(screen.getByTestId('card')).toHaveTextContent('10x20');
  });

  test('disconnects the observer and removes the resize listener on unmount', () => {
    const remove = jest.spyOn(window, 'removeEventListener');
    const { unmount } = render(<Probe />);

    unmount();

    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  test('unmounting without ResizeObserver does not throw', () => {
    delete global.ResizeObserver;
    const { unmount } = render(<Probe />);
    expect(() => unmount()).not.toThrow();
  });

  test('stays at zero and registers nothing while the ref is unattached', () => {
    const add = jest.spyOn(window, 'addEventListener');

    const { result } = renderHook(() => useVizCardSize());

    expect(result.current[1]).toEqual({ width: 0, height: 0 });
    expect(observers).toHaveLength(0);
    expect(add.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(0);
  });
});
