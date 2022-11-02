/* eslint-disable no-console */
export default {
  error: (...args) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(...args);
    }
  },
  info: (...args) => {
    if (process.env.NODE_ENV !== 'test') {
      console.info(...args);
    }
  },
  perf: (...args) => {
    if (process.env.NODE_ENV !== 'test') {
      console.info(...args);
    }
  },
};
