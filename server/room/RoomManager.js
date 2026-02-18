// ─── Room Manager ───────────────────────────────────────────
// Creates, retrieves, and destroys game rooms.

import { Room } from './Room.js';
import { generateId } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('RoomManager');

export class RoomManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map();
    }

    createRoom(hostId) {
        const roomId = generateId();
        const room = new Room(roomId, hostId, this.io);
        this.rooms.set(roomId, room);
        log.info(`Room created: ${roomId}`);
        return room;
    }

    getRoom(roomId) {
        return this.rooms.get(roomId) || null;
    }

    destroyRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            if (room.gameLoop) room.gameLoop.stop();
            this.rooms.delete(roomId);
            log.info(`Room destroyed: ${roomId}`);
        }
    }

    listRooms() {
        return Array.from(this.rooms.values());
    }

    findRoomBySocketId(socketId) {
        for (const [, room] of this.rooms) {
            const player = room.getPlayerBySocketId(socketId);
            if (player) return { room, player };
        }
        return null;
    }

    cleanup() {
        const now = Date.now();
        for (const [id, room] of this.rooms) {
            // Remove empty rooms older than 5 minutes
            if (Object.keys(room.players).length === 0 && now - room.createdAt > 300000) {
                this.destroyRoom(id);
            }
        }
    }
}
