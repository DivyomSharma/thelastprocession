// ─── Message Handler ────────────────────────────────────────
// Server-side socket.io event routing.
// Handles join, ready, move, interact, chat, heartbeat, disconnect.

import * as MSG from '../../shared/messageTypes.js';
import { createLogger } from '../utils/logger.js';
import { generateId } from '../utils/helpers.js';

const log = createLogger('Network');

export function setupMessageHandler(io, roomManager) {

    // ─── Room list endpoint ───
    function getRoomList() {
        const rooms = roomManager.listRooms();
        return rooms
            .filter(r => !r.gameStarted && Object.keys(r.players).length < 6)
            .map(r => ({
                roomId: r.id,
                playerCount: Object.keys(r.players).length,
                hostName: r.players[r.hostId]?.displayName || 'Unknown',
            }));
    }

    io.on('connection', (socket) => {
        const playerId = generateId();
        let currentRoomId = null;

        socket.emit('welcome', { playerId });
        log.info(`Player connected: ${playerId} (socket: ${socket.id})`);

        // ─── Heartbeat ───
        let lastPong = Date.now();
        const heartbeatInterval = setInterval(() => {
            if (Date.now() - lastPong > 15000) {
                log.warn(`Player ${playerId} heartbeat timeout`);
                handleDisconnect('heartbeat_timeout');
                socket.disconnect(true);
            }
        }, 5000);

        socket.on('pong', () => {
            lastPong = Date.now();
        });

        // Ping clients every 5 seconds
        const pingInterval = setInterval(() => {
            socket.emit('ping');
        }, 5000);

        // ─── Room list ───
        socket.on('requestRoomList', () => {
            socket.emit('roomList', getRoomList());
        });

        // ─── Join room ───
        socket.on(MSG.C_JOIN_ROOM, ({ roomId, playerName }) => {
            log.info(`Join request: ${playerId}, room: ${roomId || 'new'}, name: ${playerName}`);

            let room;

            if (roomId) {
                room = roomManager.getRoom(roomId);
                if (!room) {
                    socket.emit(MSG.S_ERROR, { message: 'Room not found' });
                    return;
                }
                if (room.gameStarted) {
                    socket.emit(MSG.S_ERROR, { message: 'Game already in progress' });
                    return;
                }
                if (Object.keys(room.players).length >= 6) {
                    socket.emit(MSG.S_ERROR, { message: 'Room is full' });
                    return;
                }
            } else {
                room = roomManager.createRoom(playerId);
                log.info(`Room created: ${room.id} by ${playerId}`);
            }

            // Join the Socket.io room
            socket.join(room.id);
            currentRoomId = room.id;

            const displayName = (playerName || 'Villager').slice(0, 12);
            room.addPlayer(playerId, socket.id, displayName);

            // Send full state to joining player
            socket.emit(MSG.S_ROOM_STATE, {
                roomId: room.id,
                hostId: room.hostId,
                players: room.getPublicPlayers(),
            });

            // Notify others
            socket.to(room.id).emit(MSG.S_PLAYER_JOINED, {
                player: room.getPublicPlayer(playerId),
            });
        });

        // ─── Ready ───
        socket.on(MSG.C_READY, () => {
            if (!currentRoomId) return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room || room.gameStarted) return;

            const player = room.players[playerId];
            if (!player) return;

            // Toggle ready
            player.isReady = !player.isReady;

            // If anyone unreadies during countdown, cancel it
            if (!player.isReady && room.isCountingDown) {
                room.cancelCountdown();
            }

            // Broadcast updated state
            io.in(room.id).emit(MSG.S_ROOM_STATE, {
                roomId: room.id,
                hostId: room.hostId,
                players: room.getPublicPlayers(),
            });

            // Check if all ready (need at least 1 player)
            const playerList = Object.values(room.players);
            const allReady = playerList.length >= 1 && playerList.every(p => p.isReady);

            if (allReady && !room.isCountingDown && !room.gameStarted) {
                // Start 3 second countdown on server
                room.startCountdown(() => {
                    // Double check everyone is still ready/present
                    const stillReady = Object.values(room.players).every(p => p.isReady) && Object.values(room.players).length > 0;
                    if (stillReady) {
                        log.info(`Countdown finished in room ${room.id}, starting game`);
                        room.startGame();

                        io.in(room.id).emit(MSG.S_GAME_START, {
                            matchState: room.matchState.toPublic(),
                            players: room.getPublicPlayers(),
                        });
                    } else {
                        room.cancelCountdown();
                    }
                });

                // Notify clients to show countdown
                io.in(room.id).emit('countdownStart', { duration: 3 });
            }
        });

        // ─── Movement ───
        socket.on(MSG.C_PLAYER_MOVE, (input) => {
            if (!currentRoomId) return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room || !room.gameLoop) return;

            room.gameLoop.queueInput(playerId, input);
        });

        const interactRateLimit = new Map();

        // ─── Interact ───
        socket.on(MSG.C_INTERACT, (data) => {
            if (!currentRoomId) return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room || !room.gameStarted) return;

            // Rate limit (prevent macro spam)
            const now = Date.now();
            const lastInteract = interactRateLimit.get(playerId) || 0;
            if (now - lastInteract < 200) return;
            interactRateLimit.set(playerId, now);

            // Shrine / bell / relic interaction
            const player = room.players[playerId];
            if (!player) return;

            const match = room.matchState;

            // Check proximity to shrines
            for (const shrine of match.shrines) {
                const dx = player.x - shrine.x;
                const dy = player.y - shrine.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 48) {
                    if (!shrine.activated) {
                        shrine.activated = true;
                        shrine.activatedBy = playerId;
                        match.progress = Math.min(100, match.progress + 15);

                        io.in(room.id).emit('shrineActivated', {
                            shrineId: shrine.id,
                            playerId,
                            progress: match.progress,
                        });

                        log.info(`Shrine ${shrine.id} activated by ${playerId}, progress: ${match.progress}`);

                        // Win check
                        if (match.progress >= 100) {
                            room.endGame('villagers_win');
                            io.in(room.id).emit(MSG.S_GAME_OVER, {
                                result: 'villagers_win',
                                message: 'The ritual is complete! The village is saved!',
                            });
                        }
                    }
                    break;
                }
            }
        });

        // ─── Chat ───
        socket.on('chatMessage', ({ message }) => {
            if (!currentRoomId || !message) return;
            const room = roomManager.getRoom(currentRoomId);
            if (!room) return;

            const player = room.players[playerId];
            if (!player) return;

            const sanitized = message.trim().slice(0, 100);
            if (!sanitized) return;

            // Broadcast chat to room with position for proximity filtering on client
            io.in(room.id).emit('chatMessage', {
                playerId,
                playerName: player.displayName,
                message: sanitized,
                x: player.x,
                y: player.y,
            });
        });

        // ─── Leave / Disconnect ───
        socket.on(MSG.C_LEAVE_ROOM, () => {
            handleDisconnect('leave');
        });

        socket.on('disconnect', (reason) => {
            handleDisconnect(reason);
        });

        function handleDisconnect(reason) {
            clearInterval(heartbeatInterval);
            clearInterval(pingInterval);

            log.info(`Player ${playerId} disconnected: ${reason}`);

            if (!currentRoomId) return;

            const room = roomManager.getRoom(currentRoomId);
            if (!room) return;

            socket.leave(room.id);
            room.removePlayer(playerId);

            // Broadcast leave
            io.in(room.id).emit(MSG.S_PLAYER_LEFT, { playerId });

            // Cleanup empty room
            if (Object.keys(room.players).length === 0) {
                roomManager.destroyRoom(room.id);
                log.info(`Room ${room.id} destroyed (empty)`);
            } else {
                // If host left, transfer host
                if (room.hostId === playerId) {
                    const nextHostId = Object.keys(room.players)[0];
                    room.hostId = nextHostId;
                    io.in(room.id).emit(MSG.S_ROOM_STATE, {
                        roomId: room.id,
                        hostId: room.hostId,
                        players: room.getPublicPlayers(),
                    });
                    log.info(`Host transferred to ${nextHostId} in room ${room.id}`);
                }
            }

            currentRoomId = null;
        }
    });
}
