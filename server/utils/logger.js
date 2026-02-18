// ─── Structured Logger ──────────────────────────────────────
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
let currentLevel = LEVELS.info;

function timestamp() {
    return new Date().toISOString().slice(11, 23);
}

export function setLogLevel(level) {
    if (LEVELS[level] !== undefined) currentLevel = LEVELS[level];
}

export function log(level, tag, message, data = null) {
    if (LEVELS[level] === undefined || LEVELS[level] > currentLevel) return;
    const prefix = `[${timestamp()}] [${level.toUpperCase()}] [${tag}]`;
    if (data) {
        console.log(`${prefix} ${message}`, data);
    } else {
        console.log(`${prefix} ${message}`);
    }
}

/** Creates a tagged logger instance */
export function createLogger(tag) {
    return {
        error: (msg, data) => log('error', tag, msg, data),
        warn: (msg, data) => log('warn', tag, msg, data),
        info: (msg, data) => log('info', tag, msg, data),
        debug: (msg, data) => log('debug', tag, msg, data),
    };
}

// Legacy export (backwards compat)
export const logger = {
    error: (tag, msg, data) => log('error', tag, msg, data),
    warn: (tag, msg, data) => log('warn', tag, msg, data),
    info: (tag, msg, data) => log('info', tag, msg, data),
    debug: (tag, msg, data) => log('debug', tag, msg, data),
};
