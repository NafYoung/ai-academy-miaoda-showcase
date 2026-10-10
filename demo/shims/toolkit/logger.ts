/* eslint-disable no-console */
export const logger = {
  debug: (...args: unknown[]) => console.debug('[athena-demo]', ...args),
  info: (...args: unknown[]) => console.info('[athena-demo]', ...args),
  warn: (...args: unknown[]) => console.warn('[athena-demo]', ...args),
  error: (...args: unknown[]) => console.error('[athena-demo]', ...args),
};
