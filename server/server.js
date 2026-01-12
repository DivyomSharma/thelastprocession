/**
 * THE LAST PROCESSION - Game Server
 * Express + Socket.io multiplayer server
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GameState } from './GameState.js';
import { RoleManager } from './RoleManager.js';
import { ShrineManager } from './ShrineManager.js';
import { VotingManager } from './VotingManager.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store active game rooms
const rooms = new Map();

// Constants
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 6;
const GAME_DURATION = 10 * 60 * 1000; // 10 minutes in ms

/**
 * Create a new game room
 */
function createRoom(roomId) {
    const room = {
        id: roomId,
        players: new Map(),
        gameState: null,
        roleManager: null,
        shrineManager: null,
        votingManager: null,
        phase: 'lobby', // lobby, playing, voting, ended
        timer: null,
        startTime: null
    };
    rooms.set(roomId, room);
    return room;
}

/**
 * Get or create a room
 */
function getOrCreateRoom(roomId) {
    if (!rooms.has(roomId)) {
        return createRoom(roomId);
    }
    return rooms.get(roomId);
}

/**
 * Start the game for a room
 */
function startGame(room) {
    if (room.players.size < MIN_PLAYERS) {
        return { success: false, error: `Need at least ${MIN_PLAYERS} players` };
    }

    if (room.players.size > MAX_PLAYERS) {
        return { success: false, error: `Maximum ${MAX_PLAYERS} players allowed` };
    }

    // Initialize game systems
    room.roleManager = new RoleManager([...room.players.keys()]);
    room.shrineManager = new ShrineManager();
    room.gameState = new GameState(room.players.size);
    room.votingManager = new VotingManager([...room.players.keys()]);
    room.phase = 'playing';
    room.startTime = Date.now();

    // Start game timer
    room.timer = setInterval(() => {
        const elapsed = Date.now() - room.startTime;
        const remaining = GAME_DURATION - elapsed;

        if (remaining <= 0) {
            endGame(room, 'timeout');
        } else {
            // Broadcast time update
            io.to(room.id).emit('timeUpdate', { remaining });
        }
    }, 1000);

    // Send role to each player privately
    room.players.forEach((player, playerId) => {
        const socket = io.sockets.sockets.get(playerId);
        if (socket) {
            socket.emit('gameStart', {
                role: room.roleManager.getRole(playerId),
                shrines: room.shrineManager.getPublicState(),
                players: getPublicPlayerList(room),
                duration: GAME_DURATION
            });
        }
    });

    return { success: true };
}

/**
 * End the game
 */
function endGame(room, reason) {
    if (room.timer) {
        clearInterval(room.timer);
        room.timer = null;
    }

    room.phase = 'ended';

    // Determine winner
    let winner = 'hollow'; // Default: hollow wins if ritual incomplete
    let endReason = reason;

    if (reason === 'ritual_complete') {
        winner = 'villagers';
    } else if (reason === 'hollow_exiled') {
        winner = 'villagers';
    } else if (reason === 'faith_depleted') {
        winner = 'hollow';
    } else if (reason === 'timeout') {
        // Check if ritual was completed
        if (room.shrineManager.isRitualComplete()) {
            winner = 'villagers';
            endReason = 'ritual_complete';
        }
    }

    // Reveal all roles
    const roles = {};
    room.players.forEach((player, playerId) => {
        roles[playerId] = room.roleManager.getRole(playerId);
    });

    io.to(room.id).emit('gameEnd', {
        winner,
        reason: endReason,
        roles,
        shrineStates: room.shrineManager.getTrueState()
    });
}

/**
 * Get public player list (no role info)
 */
function getPublicPlayerList(room) {
    const players = [];
    room.players.forEach((player, playerId) => {
        players.push({
            id: playerId,
            name: player.name,
            position: player.position,
            rotation: player.rotation
        });
    });
    return players;
}

/**
 * Handle player position update
 */
function handlePositionUpdate(room, playerId, position, rotation) {
    const player = room.players.get(playerId);
    if (player) {
        // Basic position validation (anti-cheat)
        const maxSpeed = 15; // units per second
        const now = Date.now();
        const dt = (now - (player.lastUpdate || now)) / 1000;

        if (player.position && dt > 0) {
            const dx = position.x - player.position.x;
            const dz = position.z - player.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            const speed = distance / dt;

            if (speed > maxSpeed * 1.5) {
                // Suspicious movement, could log or kick
                console.warn(`Player ${playerId} moving too fast: ${speed.toFixed(1)} u/s`);
            }
        }

        player.position = position;
        player.rotation = rotation;
        player.lastUpdate = now;

        // Check if player is on blessed path
        const onPath = room.gameState.isOnBlessedPath(position);
        if (!onPath && room.phase === 'playing') {
            room.gameState.drainFaith(2 * dt); // Drain faith when off path
        }

        // Broadcast position to others in room
        io.to(room.id).emit('playerMoved', {
            playerId,
            position,
            rotation
        });
    }
}

/**
 * Handle shrine interaction
 */
function handleShrineInteraction(room, playerId, shrineId) {
    if (room.phase !== 'playing') return;

    const role = room.roleManager.getRole(playerId);
    const result = room.shrineManager.lightShrine(shrineId, playerId, role);

    if (result.success) {
        // Broadcast that shrine appears lit (same animation for all)
        io.to(room.id).emit('shrineLit', {
            shrineId,
            playerId
        });

        // Give faith for lighting (even if corrupted - players don't know)
        if (role === 'villager') {
            room.gameState.addFaith(10);
        }
        // Hollow lighting doesn't add faith but appears the same

        // Broadcast faith update
        io.to(room.id).emit('faithUpdate', {
            faith: room.gameState.faith
        });

        // Check win condition
        if (room.shrineManager.isRitualComplete()) {
            endGame(room, 'ritual_complete');
        }
    }

    return result;
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    let currentRoom = null;

    // Join room
    socket.on('joinRoom', ({ roomId, playerName }) => {
        const room = getOrCreateRoom(roomId);

        if (room.phase !== 'lobby') {
            socket.emit('joinError', { error: 'Game already in progress' });
            return;
        }

        if (room.players.size >= MAX_PLAYERS) {
            socket.emit('joinError', { error: 'Room is full' });
            return;
        }

        // Add player to room
        room.players.set(socket.id, {
            name: playerName,
            position: { x: 0, y: 1.6, z: 0 },
            rotation: { y: 0 },
            ready: false,
            carrying: null
        });

        socket.join(roomId);
        currentRoom = room;

        // Notify everyone
        io.to(roomId).emit('playerJoined', {
            playerId: socket.id,
            playerName,
            players: getPublicPlayerList(room)
        });

        socket.emit('joinSuccess', {
            roomId,
            playerId: socket.id,
            players: getPublicPlayerList(room)
        });

        console.log(`${playerName} joined room ${roomId}`);
    });

    // Player ready
    socket.on('playerReady', () => {
        if (!currentRoom) return;

        const player = currentRoom.players.get(socket.id);
        if (player) {
            player.ready = true;
            io.to(currentRoom.id).emit('playerReadyUpdate', {
                playerId: socket.id,
                ready: true
            });

            // Check if all players are ready
            let allReady = true;
            currentRoom.players.forEach(p => {
                if (!p.ready) allReady = false;
            });

            if (allReady && currentRoom.players.size >= MIN_PLAYERS) {
                const result = startGame(currentRoom);
                if (!result.success) {
                    io.to(currentRoom.id).emit('gameError', { error: result.error });
                }
            }
        }
    });

    // Position update
    socket.on('position', ({ position, rotation }) => {
        if (currentRoom && currentRoom.phase === 'playing') {
            handlePositionUpdate(currentRoom, socket.id, position, rotation);
        }
    });

    // Shrine interaction
    socket.on('lightShrine', ({ shrineId }) => {
        if (currentRoom) {
            handleShrineInteraction(currentRoom, socket.id, shrineId);
        }
    });

    // Vessel pickup
    socket.on('pickupVessel', () => {
        if (!currentRoom || currentRoom.phase !== 'playing') return;

        const player = currentRoom.players.get(socket.id);
        const vesselHolder = [...currentRoom.players.entries()]
            .find(([id, p]) => p.carrying === 'vessel');

        if (!vesselHolder && player) {
            player.carrying = 'vessel';
            io.to(currentRoom.id).emit('vesselPickedUp', {
                playerId: socket.id
            });
        }
    });

    // Vessel transfer
    socket.on('transferVessel', ({ targetPlayerId }) => {
        if (!currentRoom || currentRoom.phase !== 'playing') return;

        const player = currentRoom.players.get(socket.id);
        const target = currentRoom.players.get(targetPlayerId);

        if (player && player.carrying === 'vessel' && target && !target.carrying) {
            player.carrying = null;
            target.carrying = 'vessel';
            io.to(currentRoom.id).emit('vesselTransferred', {
                fromPlayerId: socket.id,
                toPlayerId: targetPlayerId
            });
        }
    });

    // Place vessel at altar
    socket.on('placeVessel', () => {
        if (!currentRoom || currentRoom.phase !== 'playing') return;

        const player = currentRoom.players.get(socket.id);
        if (player && player.carrying === 'vessel') {
            // Check if player is near altar (shrine 7)
            const altarPos = currentRoom.shrineManager.getAltarPosition();
            const dx = player.position.x - altarPos.x;
            const dz = player.position.z - altarPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < 3) {
                player.carrying = null;
                currentRoom.gameState.vesselPlaced = true;
                io.to(currentRoom.id).emit('vesselPlaced', {
                    playerId: socket.id
                });

                // Check if ritual is complete
                if (currentRoom.shrineManager.isRitualComplete() &&
                    currentRoom.gameState.vesselPlaced) {
                    endGame(currentRoom, 'ritual_complete');
                }
            }
        }
    });

    // Start voting phase
    socket.on('callVote', () => {
        if (!currentRoom || currentRoom.phase !== 'playing') return;

        currentRoom.phase = 'voting';
        currentRoom.votingManager.startVoting();

        io.to(currentRoom.id).emit('votingStarted', {
            players: getPublicPlayerList(currentRoom),
            timeLimit: 30000 // 30 seconds to vote
        });

        // Set voting timer
        setTimeout(() => {
            if (currentRoom.phase === 'voting') {
                resolveVoting(currentRoom);
            }
        }, 30000);
    });

    // Cast vote
    socket.on('castVote', ({ targetPlayerId }) => {
        if (!currentRoom || currentRoom.phase !== 'voting') return;

        currentRoom.votingManager.castVote(socket.id, targetPlayerId);

        io.to(currentRoom.id).emit('voteCast', {
            voterId: socket.id,
            // Don't reveal who they voted for yet
            votesRemaining: currentRoom.votingManager.getRemainingVotes()
        });

        // Check if all votes are in
        if (currentRoom.votingManager.allVotesIn()) {
            resolveVoting(currentRoom);
        }
    });

    // Disconnect handling
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);

        if (currentRoom) {
            const player = currentRoom.players.get(socket.id);
            currentRoom.players.delete(socket.id);

            // If they had the vessel, drop it
            if (player && player.carrying === 'vessel') {
                io.to(currentRoom.id).emit('vesselDropped', {
                    position: player.position
                });
            }

            io.to(currentRoom.id).emit('playerLeft', {
                playerId: socket.id,
                players: getPublicPlayerList(currentRoom)
            });

            // End game if not enough players
            if (currentRoom.phase === 'playing' && currentRoom.players.size < 2) {
                endGame(currentRoom, 'not_enough_players');
            }

            // Clean up empty rooms
            if (currentRoom.players.size === 0) {
                if (currentRoom.timer) {
                    clearInterval(currentRoom.timer);
                }
                rooms.delete(currentRoom.id);
            }
        }
    });
});

/**
 * Resolve voting and exile a player
 */
function resolveVoting(room) {
    const result = room.votingManager.resolveVotes();

    io.to(room.id).emit('votingResult', {
        votes: result.votes,
        exiled: result.exiled,
        tie: result.tie
    });

    if (result.exiled) {
        const exiledRole = room.roleManager.getRole(result.exiled);

        // Remove exiled player from game
        const exiledSocket = io.sockets.sockets.get(result.exiled);
        if (exiledSocket) {
            exiledSocket.emit('youWereExiled');
        }
        room.players.delete(result.exiled);

        if (exiledRole === 'hollow') {
            // Villagers correctly found the Hollow
            endGame(room, 'hollow_exiled');
        } else {
            // Innocent exiled - faith penalty
            room.gameState.drainFaith(15);
            io.to(room.id).emit('faithUpdate', {
                faith: room.gameState.faith
            });

            if (room.gameState.faith <= 0) {
                endGame(room, 'faith_depleted');
            } else {
                room.phase = 'playing';
                io.to(room.id).emit('votingEnded');
            }
        }
    } else {
        // No one exiled (tie or skip)
        room.phase = 'playing';
        io.to(room.id).emit('votingEnded');
    }
}

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`🕯️  THE LAST PROCESSION server running on port ${PORT}`);
});
