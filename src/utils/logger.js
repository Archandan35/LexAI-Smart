const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = import.meta.env.PROD ? 'warn' : 'debug';

function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
}

function formatArgs(args) {
  return args.map((a) => {
    if (a instanceof Error) return `${a.name}: ${a.message}`;
    try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch { return String(a); }
  }).join(' ');
}

export const logger = {
  debug(...args) {
    if (shouldLog('debug')) console.debug(`[LexAI] ${formatArgs(args)}`);
  },
  info(...args) {
    if (shouldLog('info')) console.info(`[LexAI] ${formatArgs(args)}`);
  },
  warn(...args) {
    if (shouldLog('warn')) console.warn(`[LexAI] ${formatArgs(args)}`);
  },
  error(...args) {
    if (shouldLog('error')) console.error(`[LexAI] ${formatArgs(args)}`);
  },
};

export default logger;
