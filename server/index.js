// ─── THE LAST PROCESSION — Server Entry Point ───────────────
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import config from './config.js';
import { RoomManager } from './room/RoomManager.js';
import { setupMessageHandler } from './network/messageHandler.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Express App ───
const app = express();
const httpServer = createServer(app);

// In production, serve the built client
app.use(express.static(join(__dirname, '..', 'client', 'dist')));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// ─── Socket.io ───
const io = new Server(httpServer, {
    cors: {
        origin: config.CORS_ORIGIN,
        methods: ['GET', 'POST'],
    },
});

// ─── Initialize Systems ───
const roomManager = new RoomManager(io);
setupMessageHandler(io, roomManager);

// ─── Periodic cleanup ───
setInterval(() => {
    roomManager.cleanup();
}, 30000); // every 30 seconds

// ─── Start Server ───
httpServer.listen(config.PORT, () => {
    logger.info('Server', `🕯 THE LAST PROCESSION server running on port ${config.PORT}`);
    logger.info('Server', `   CORS origin: ${config.CORS_ORIGIN}`);
});
