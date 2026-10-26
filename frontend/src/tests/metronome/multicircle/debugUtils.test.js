import {
  isDebugMode, debugLog, logError, groupLogs, measurePerformance
} from '../../../components/metronome/MultiCircleMode/utils/debugUtils';

const PREFIX = '[MultiCircleLogic]';

describe('debugUtils', () => {
  let log;
  let error;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
    error = jest.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  describe('isDebugMode', () => {
    test('is off by default', () => {
      expect(isDebugMode()).toBe(false);
    });

    test('is on when localStorage.metronomeDebug is "true"', () => {
      localStorage.setItem('metronomeDebug', 'true');
      expect(isDebugMode()).toBe(true);
    });

    test('is off for any other localStorage value', () => {
      localStorage.setItem('metronomeDebug', '1');
      expect(isDebugMode()).toBe(false);
    });

    test('is on when the URL contains debug=true', () => {
      window.history.replaceState({}, '', '/?debug=true');
      expect(isDebugMode()).toBe(true);
    });

    test('falls back to off when localStorage throws', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
      expect(isDebugMode()).toBe(false);
    });
  });

  describe('debugLog', () => {
    test('is silent when debug mode is off', () => {
      debugLog('hidden', { a: 1 });
      expect(log).not.toHaveBeenCalled();
    });

    test('logs prefixed message only when no data is given', () => {
      localStorage.setItem('metronomeDebug', 'true');
      debugLog('hello');
      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith(`${PREFIX} hello`);
    });

    test('logs the data object as second argument', () => {
      localStorage.setItem('metronomeDebug', 'true');
      debugLog('hello', { a: 1 });
      expect(log).toHaveBeenCalledWith(`${PREFIX} hello`, { a: 1 });
    });
  });

  describe('logError', () => {
    test('always logs, even with debug off, without an error object', () => {
      logError('boom');
      expect(error).toHaveBeenCalledWith(`${PREFIX} boom`);
    });

    test('passes the error object along', () => {
      const err = new Error('x');
      logError('boom', err);
      expect(error).toHaveBeenCalledWith(`${PREFIX} boom`, err);
    });
  });

  describe('groupLogs', () => {
    test('does not run the callback when debug is off', () => {
      const fn = jest.fn();
      groupLogs('g', fn);
      expect(fn).not.toHaveBeenCalled();
    });

    test('wraps the callback in a console group with a HH:MM:SS.mmm timestamp', () => {
      localStorage.setItem('metronomeDebug', 'true');
      const group = jest.spyOn(console, 'group').mockImplementation(() => {});
      const groupEnd = jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
      const fn = jest.fn();
      groupLogs('phase', fn);
      expect(group).toHaveBeenCalledTimes(1);
      expect(group.mock.calls[0][0]).toMatch(/^\[MultiCircleLogic\] phase \[\d{2}:\d{2}:\d{2}\.\d{3}\]$/);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(groupEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('measurePerformance', () => {
    test('returns the function result without logging when debug is off', () => {
      expect(measurePerformance('op', () => 42)).toBe(42);
      expect(log).not.toHaveBeenCalled();
    });

    test('returns the result and logs the duration in ms when debug is on', () => {
      localStorage.setItem('metronomeDebug', 'true');
      const now = jest.spyOn(performance, 'now').mockReturnValueOnce(100).mockReturnValueOnce(112.5);
      expect(measurePerformance('op', () => 'done')).toBe('done');
      expect(now).toHaveBeenCalledTimes(2);
      expect(log).toHaveBeenCalledWith(`${PREFIX} Performance [op]: 12.50ms`);
    });
  });
});
