// ─── Room ───────────────────────────────────────────────────
// Manages a single game room — lobby → play → end.

import { MatchState } from '../game/MatchState.js';
import { GameLoop } from '../game/GameLoop.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('Room');

export class Room {
    constructor(id, hostId, io) {
        this.id = id;
        this.hostId = hostId;
        this.io = io;
        this.players = {};
        this.gameStarted = false;
        this.gameLoop = null;
        this.matchState = null;
        this.createdAt = Date.now();
    }

    addPlayer(playerId, socketId, displayName) {
        this.players[playerId] = {
            id: playerId,
            socketId,
            displayName,
            x: 400 + Math.random() * 100,
            y: 400 + Math.random() * 100,
            isReady: false,
            isAlive: true,
            // Hidden state — never sent to clients
            attunement: 0,
            possessionStage: 0,
        };

        log.info(`Player ${displayName} (${playerId}) joined room ${this.id}`);
    }

    removePlayer(playerId) {
        delete this.players[playerId];
        log.info(`Player ${playerId} removed from room ${this.id}`);
    }

    getPlayerBySocketId(socketId) {
        return Object.values(this.players).find(p => p.socketId === socketId);
    }

    getPublicPlayers() {
        const result = {};
        for (const [id, player] of Object.entries(this.players)) {
            result[id] = this.getPublicPlayer(id);
        }
        return result;
    }

    getPublicPlayer(playerId) {
        const p = this.players[playerId];
        if (!p) return null;
        return {
            id: p.id,
            displayName: p.displayName,
            x: p.x,
            y: p.y,
            isReady: p.isReady,
            isAlive: p.isAlive,
        };
    }

    startGame() {
        this.gameStarted = true;
        this.matchState = new MatchState();

        // Reset player positions to spawn points
        const spawns = [
            { x: 400, y: 400 }, { x: 460, y: 400 },
            { x: 430, y: 360 }, { x: 430, y: 440 },
            { x: 370, y: 430 }, { x: 490, y: 370 },
        ];

        const playerIds = Object.keys(this.players);
        playerIds.forEach((id, i) => {
            const spawn = spawns[i % spawns.length];
            this.players[id].x = spawn.x;
            this.players[id].y = spawn.y;
            this.players[id].isReady = false;
        });

        this.gameLoop = new GameLoop(this, this.io);
        this.gameLoop.start();

        log.info(`Game started in room ${this.id} with ${playerIds.length} players`);
    }

    endGame(result) {
        this.gameStarted = false;
        if (this.gameLoop) {
            this.gameLoop.stop();
            this.gameLoop = null;
        }
        log.info(`Game ended in room ${this.id}: ${result}`);
    }
}
