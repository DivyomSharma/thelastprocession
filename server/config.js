// ─── Server Configuration ───────────────────────────────────
export default {
    PORT: process.env.PORT || 3000,
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
