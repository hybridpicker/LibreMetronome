import React from 'react';

// Loaded while NODE_ENV is still "test": the production build of this module has no jsxDEV.
const devJsxRuntime = jest.requireActual('react/jsx-dev-runtime');

describe('index.js bootstrap', () => {
  const savedEnv = process.env.NODE_ENV;
  const saved = {};
  let render;
  let createRoot;
  let initMobile;
  let initDesktop;
  let originalError;

  const CONSOLE_METHODS = ['log', 'debug', 'info', 'warn', 'error'];

  const boot = (env) => {
    process.env.NODE_ENV = env;
    jest.resetModules();
    render = jest.fn();
    createRoot = jest.fn(() => ({ render }));
    initMobile = jest.fn();
    initDesktop = jest.fn();
    jest.doMock('react-dom/client', () => ({ __esModule: true, default: { createRoot } }));
    jest.doMock('../../App', () => ({ __esModule: true, default: function MockApp() { return null; } }));
    jest.doMock('../../mobile', () => ({ initializeMobileRuntime: initMobile }));
    jest.doMock('../../desktop', () => ({ initializeDesktopRuntime: initDesktop }));
    jest.doMock('react/jsx-dev-runtime', () => devJsxRuntime);
    require('../../index');
  };

  beforeEach(() => {
    CONSOLE_METHODS.forEach((m) => {
      saved[m] = console[m];
    });
    originalError = jest.fn();
    console.error = originalError; // captured by index.js as the "original" error logger
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    CONSOLE_METHODS.forEach((m) => {
      console[m] = saved[m];
    });
    process.env.NODE_ENV = savedEnv;
    document.body.innerHTML = '';
    jest.dontMock('react-dom/client');
    jest.dontMock('../../App');
    jest.dontMock('../../mobile');
    jest.dontMock('../../desktop');
    jest.dontMock('react/jsx-dev-runtime');
  });

  test('initialises the platform runtimes and renders <App/> in StrictMode into #root', () => {
    boot('development');

    expect(initMobile).toHaveBeenCalledTimes(1);
    expect(initDesktop).toHaveBeenCalledTimes(1);
    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(render).toHaveBeenCalledTimes(1);
    const element = render.mock.calls[0][0];
    expect(element.type).toBe(React.StrictMode);
    expect(element.props.children.type.name).toBe('MockApp');
  });

  test('platform runtimes are initialised before rendering', () => {
    const order = [];
    jest.resetModules();
    const mobile = jest.fn(() => order.push('mobile'));
    const desktop = jest.fn(() => order.push('desktop'));
    const rootRender = jest.fn(() => order.push('render'));
    jest.doMock('react-dom/client', () => ({
      __esModule: true,
      default: { createRoot: () => ({ render: rootRender }) },
    }));
    jest.doMock('../../App', () => ({ __esModule: true, default: () => null }));
    jest.doMock('../../mobile', () => ({ initializeMobileRuntime: mobile }));
    jest.doMock('../../desktop', () => ({ initializeDesktopRuntime: desktop }));
    require('../../index');
    expect(order).toEqual(['mobile', 'desktop', 'render']);
  });

  describe('development', () => {
    beforeEach(() => {
      CONSOLE_METHODS.filter((m) => m !== 'error').forEach((m) => {
        console[m] = jest.fn();
      });
    });

    test('keeps console.log / debug / info / warn working', () => {
      const spies = CONSOLE_METHODS.filter((m) => m !== 'error').map((m) => [m, console[m]]);
      boot('development');

      spies.forEach(([m, spy]) => {
        console[m]('hello');
        expect(spy).toHaveBeenCalledWith('hello');
      });
    });

    test('suppresses only the react-helmet UNSAFE_componentWillMount warning', () => {
      boot('development');

      console.error('Warning: UNSAFE_componentWillMount in SideEffect(NullComponent)');
      expect(originalError).not.toHaveBeenCalled();

      console.error('Warning: UNSAFE_componentWillMount in SomethingElse');
      console.error('Warning: SideEffect(NullComponent) other problem');
      console.error('unrelated');
      console.error(new Error('not a string'));
      console.error();

      expect(originalError).toHaveBeenCalledTimes(5);
      expect(originalError).toHaveBeenCalledWith('unrelated');
    });
  });

  describe.each(['production', 'test'])('NODE_ENV=%s', (env) => {
    test('replaces every console method with a silent no-op', () => {
      const spies = {};
      CONSOLE_METHODS.filter((m) => m !== 'error').forEach((m) => {
        spies[m] = jest.fn();
        console[m] = spies[m];
      });
      boot(env);

      CONSOLE_METHODS.forEach((m) => {
        expect(console[m]('should vanish')).toBeUndefined();
      });
      Object.values(spies).forEach((spy) => expect(spy).not.toHaveBeenCalled());
      expect(originalError).not.toHaveBeenCalled();
    });

    test('still renders the app', () => {
      boot(env);
      expect(render).toHaveBeenCalledTimes(1);
    });
  });
});
