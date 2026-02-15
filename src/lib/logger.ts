const isDev = process.env.NODE_ENV === "development";

export const logger = {
  info: (tag: string, msg: string, meta?: unknown) => {
    if (isDev) console.log(`[${tag}]`, msg, meta !== undefined ? meta : "");
  },
  warn: (tag: string, msg: string, meta?: unknown) => {
    console.warn(`[${tag}]`, msg, meta !== undefined ? meta : "");
  },
  error: (tag: string, msg: string, meta?: unknown) => {
    console.error(`[${tag}]`, msg, meta !== undefined ? meta : "");
  },
};
