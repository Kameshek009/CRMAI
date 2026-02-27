const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === "development" ? "info" : "warn");

const LEVELS = { info: 0, warn: 1, error: 2 } as const;
const currentLevel = LEVELS[logLevel as keyof typeof LEVELS] ?? LEVELS.warn;

export const logger = {
  info: (tag: string, msg: string, meta?: unknown) => {
    if (currentLevel <= LEVELS.info) console.log(`[${tag}]`, msg, meta !== undefined ? meta : "");
  },
  warn: (tag: string, msg: string, meta?: unknown) => {
    if (currentLevel <= LEVELS.warn) console.warn(`[${tag}]`, msg, meta !== undefined ? meta : "");
  },
  error: (tag: string, msg: string, meta?: unknown) => {
    console.error(`[${tag}]`, msg, meta !== undefined ? meta : "");
  },
};
