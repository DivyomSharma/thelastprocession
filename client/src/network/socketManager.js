// ─── Socket Manager ─────────────────────────────────────────
// Singleton wrapper for client-side Socket.io.
// Handles connection, events, heartbeat, and reconnection.

import { io } from 'socket.io-client';
import * as MSG from '../../../shared/messageTypes.js';

class SocketManager {
    constructor() {
        this.socket = null;
        this.playerId = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    connect() {
        if (this.socket) return;

        this.socket = io({
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000,
        });

        this.socket.on('connect', () => {
            this.connected = true;
            this.reconnectAttempts = 0;
            console.log('[Socket] Connected:', this.socket.id);
        });

        this.socket.on('welcome', ({ playerId }) => {
            this.playerId = playerId;
            console.log('[Socket] Assigned ID:', playerId);
        });

        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            console.warn('[Socket] Disconnected:', reason);
        });

        this.socket.on('reconnect_attempt', (attempt) => {
            this.reconnectAttempts = attempt;
            console.log(`[Socket] Reconnect attempt ${attempt}/${this.maxReconnectAttempts}`);
        });

        this.socket.on('reconnect', () => {
            this.connected = true;
            this.reconnectAttempts = 0;
            console.log('[Socket] Reconnected');
        });

        this.socket.on('reconnect_failed', () => {
            console.error('[Socket] Reconnect failed after max attempts');
        });

        // ─── Heartbeat ───
        this.socket.on('ping', () => {
            this.socket.emit('pong');
        });
    }

    // ─── Emit helpers ───

    joinRoom(roomId, playerName) {
        this.socket.emit(MSG.C_JOIN_ROOM, { roomId, playerName });
    }

    sendReady() {
        this.socket.emit(MSG.C_READY);
    }

    sendMovement(dx, dy) {
        if (!this.connected) return;
        this.socket.emit(MSG.C_PLAYER_MOVE, { dx, dy });
    }

    sendInteract(data = {}) {
        this.socket.emit(MSG.C_INTERACT, data);
    }

    sendChat(message) {
        if (!message || !message.trim()) return;
        this.socket.emit('chatMessage', { message: message.trim().slice(0, 100) });
    }

    leaveRoom() {
        this.socket.emit(MSG.C_LEAVE_ROOM);
    }

    // ─── Listener management ───

    on(event, callback) {
        this.socket.on(event, callback);
    }

    off(event, callback) {
        if (callback) {
            this.socket.off(event, callback);
        } else {
            this.socket.removeAllListeners(event);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
            this.playerId = null;
        }
    }
}

const socketManager = new SocketManager();
export default socketManager;
