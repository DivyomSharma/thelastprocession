/**
 * THE LAST PROCESSION - Network Client (Supabase Realtime)
 * Handles multiplayer communication via Supabase Broadcast & Presence
 */

import { supabase, generatePlayerId, generateRoomCode } from './SupabaseClient.js';

export class Network {
    constructor() {
        this.playerId = generatePlayerId();
        this.roomId = null;
        this.playerName = '';
        this.channel = null;
        this.connected = false;
        this.role = 'villager';

        this.eventHandlers = new Map();

        // Check connection
        this.checkConnection();
    }

    /**
     * Check Supabase connection
     */
    async checkConnection() {
        try {
            const { data, error } = await supabase.from('rooms').select('id').limit(1);
            if (error && error.code !== 'PGRST116') {
                console.error('Supabase connection error:', error);
                this.emit('_error', error);
            } else {
                console.log('🔗 Connected to Supabase');
                this.connected = true;
                this.emit('_connected');
            }
        } catch (err) {
            console.error('Failed to connect to Supabase:', err);
            this.emit('_error', err);
        }
    }

    /**
     * Register an event handler
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    /**
     * Remove an event handler
     */
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Emit to internal handlers
     */
    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => handler(data));
        }
    }

    // ==================== Room Management ====================

    /**
     * Create a new room
     */
    async createRoom(playerName) {
        this.playerName = playerName;
        const roomId = generateRoomCode();

        try {
            // Create room in database
            const { error: roomError } = await supabase
                .from('rooms')
                .insert({ id: roomId });

            if (roomError) throw roomError;

            // Initialize shrines
            const shrines = [];
            for (let i = 0; i < 7; i++) {
                shrines.push({ room_id: roomId, shrine_id: i });
            }
            await supabase.from('shrines').insert(shrines);

            // Join the room we just created
            await this.joinRoom(roomId, playerName);

            return roomId;
        } catch (err) {
            console.error('Failed to create room:', err);
            this.emit('joinError', { error: 'Failed to create room' });
            return null;
        }
    }

    /**
     * Join an existing room
     */
    async joinRoom(roomId, playerName) {
        this.playerName = playerName;
        this.roomId = roomId;

        try {
            // Check if room exists
            const { data: room, error: roomError } = await supabase
                .from('rooms')
                .select('*')
                .eq('id', roomId)
                .single();

            if (roomError || !room) {
                this.emit('joinError', { error: 'Room not found' });
                return;
            }

            if (room.phase !== 'lobby') {
                this.emit('joinError', { error: 'Game already in progress' });
                return;
            }

            // Check player count
            const { data: players } = await supabase
                .from('players')
                .select('id')
                .eq('room_id', roomId);

            if (players && players.length >= 6) {
                this.emit('joinError', { error: 'Room is full' });
                return;
            }

            // Add player to database
            const { error: playerError } = await supabase
                .from('players')
                .insert({
                    id: this.playerId,
                    room_id: roomId,
                    name: playerName,
                    role: 'villager',
                    ready: false
                });

            if (playerError) throw playerError;

            // Subscribe to room channel
            await this.subscribeToRoom(roomId);

            // Get current players
            const { data: currentPlayers } = await supabase
                .from('players')
                .select('*')
                .eq('room_id', roomId);

            this.emit('joinSuccess', {
                roomId,
                playerId: this.playerId,
                players: currentPlayers || []
            });

            // Broadcast join to others
            this.broadcast('playerJoined', {
                playerId: this.playerId,
                playerName: playerName
            });

        } catch (err) {
            console.error('Failed to join room:', err);
            this.emit('joinError', { error: 'Failed to join room' });
        }
    }

    /**
     * Subscribe to room channel for realtime updates
     */
    async subscribeToRoom(roomId) {
        // Create channel for this room
        this.channel = supabase.channel(`room:${roomId}`, {
            config: {
                broadcast: { self: false },
                presence: { key: this.playerId }
            }
        });

        // Handle broadcast messages
        this.channel.on('broadcast', { event: '*' }, (payload) => {
            this.handleBroadcast(payload);
        });

        // Handle presence updates
        this.channel.on('presence', { event: 'sync' }, () => {
            const state = this.channel.presenceState();
            this.handlePresenceSync(state);
        });

        this.channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('Player joined:', key);
        });

        this.channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            console.log('Player left:', key);
            this.emit('playerLeft', { playerId: key });
        });

        // Subscribe to database changes
        this.channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
            (payload) => this.handleRoomChange(payload)
        );

        this.channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
            (payload) => this.handlePlayerChange(payload)
        );

        this.channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'shrines', filter: `room_id=eq.${roomId}` },
            (payload) => this.handleShrineChange(payload)
        );

        // Subscribe
        await this.channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                // Track presence
                await this.channel.track({
                    name: this.playerName,
                    online_at: new Date().toISOString()
                });
            }
        });
    }

    /**
     * Handle broadcast messages
     */
    handleBroadcast(payload) {
        const { event, payload: data } = payload;
        console.log('Broadcast received:', event, data);

        switch (event) {
            case 'playerJoined':
                this.refreshPlayerList();
                break;
            case 'playerMoved':
                this.emit('playerMoved', data);
                break;
            case 'shrineLit':
                this.emit('shrineLit', data);
                break;
            case 'vesselPickedUp':
                this.emit('vesselPickedUp', data);
                break;
            case 'vesselTransferred':
                this.emit('vesselTransferred', data);
                break;
            case 'vesselPlaced':
                this.emit('vesselPlaced', data);
                break;
            case 'votingStarted':
                this.emit('votingStarted', data);
                break;
            case 'voteCast':
                this.emit('voteCast', data);
                break;
            case 'votingResult':
                this.emit('votingResult', data);
                break;
            case 'gameStart':
                this.emit('gameStart', data);
                break;
            case 'gameEnd':
                this.emit('gameEnd', data);
                break;
            default:
                this.emit(event, data);
        }
    }

    /**
     * Handle presence sync
     */
    handlePresenceSync(state) {
        // Update online players
        const onlinePlayers = Object.keys(state);
        console.log('Online players:', onlinePlayers);
    }

    /**
     * Handle room database changes
     */
    handleRoomChange(payload) {
        if (payload.eventType === 'UPDATE') {
            const room = payload.new;
            this.emit('faithUpdate', { faith: room.faith });

            if (room.phase === 'ended') {
                this.emit('gameEnd', { reason: 'room_update' });
            }
        }
    }

    /**
     * Handle player database changes
     */
    handlePlayerChange(payload) {
        if (payload.eventType === 'INSERT') {
            this.refreshPlayerList();
        } else if (payload.eventType === 'UPDATE') {
            const player = payload.new;
            if (player.ready !== payload.old?.ready) {
                this.emit('playerReadyUpdate', {
                    playerId: player.id,
                    ready: player.ready
                });
            }
        } else if (payload.eventType === 'DELETE') {
            this.emit('playerLeft', { playerId: payload.old.id });
        }
    }

    /**
     * Handle shrine database changes
     */
    handleShrineChange(payload) {
        if (payload.eventType === 'UPDATE') {
            const shrine = payload.new;
            if (shrine.lit && !payload.old?.lit) {
                this.emit('shrineLit', {
                    shrineId: shrine.shrine_id,
                    playerId: shrine.lit_by
                });
            }
        }
    }

    /**
     * Refresh player list from database
     */
    async refreshPlayerList() {
        const { data: players } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', this.roomId);

        this.emit('playerJoined', {
            playerId: null,
            players: players || []
        });
    }

    /**
     * Broadcast message to room
     */
    broadcast(event, data) {
        if (this.channel) {
            this.channel.send({
                type: 'broadcast',
                event,
                payload: { ...data, senderId: this.playerId }
            });
        }
    }

    // ==================== Game Actions ====================

    /**
     * Set player as ready
     */
    async setReady() {
        await supabase
            .from('players')
            .update({ ready: true })
            .eq('id', this.playerId);

        // Check if all players are ready
        await this.checkAllReady();
    }

    /**
     * Check if all players are ready and start game
     */
    async checkAllReady() {
        const { data: players } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', this.roomId);

        if (!players || players.length < 3) return;

        const allReady = players.every(p => p.ready);

        if (allReady) {
            await this.startGame(players);
        }
    }

    /**
     * Start the game
     */
    async startGame(players) {
        // Randomly select hollow
        const hollowIndex = Math.floor(Math.random() * players.length);
        const hollowId = players[hollowIndex].id;



        // Update hollow player's role in database
        await supabase
            .from('players')
            .update({ role: 'hollow' })
            .eq('id', hollowId);

        // Update room phase
        await supabase
            .from('rooms')
            .update({
                phase: 'playing',
                start_time: new Date().toISOString()
            })
            .eq('id', this.roomId);

        // Get shrines
        const { data: shrines } = await supabase
            .from('shrines')
            .select('shrine_id, lit')
            .eq('room_id', this.roomId);

        // Determine this player's role
        this.role = hollowId === this.playerId ? 'hollow' : 'villager';

        // Broadcast game start to all (each player gets their own role)
        // We send the hollow ID encrypted/hashed, but each client checks locally
        this.broadcast('gameStart', {
            hollowId: hollowId, // In production, this would be sent privately
            shrines: shrines?.map(s => ({
                id: s.shrine_id,
                name: ['Church', 'Well', 'Mill', 'Graveyard', 'Forest Left', 'Forest Right', 'Hilltop Altar'][s.shrine_id],
                position: [
                    { x: -20, y: 0, z: 0 },
                    { x: 0, y: 0, z: 20 },
                    { x: 20, y: 0, z: 0 },
                    { x: 0, y: 0, z: -20 },
                    { x: -30, y: 0, z: 30 },
                    { x: 30, y: 0, z: 30 },
                    { x: 0, y: 5, z: 50 }
                ][s.shrine_id],
                lit: s.lit
            })) || [],
            players: players.map(p => ({
                id: p.id,
                name: p.name,
                position: p.position
            })),
            duration: 600000
        });

        // Also emit locally for the initiating player
        this.emit('gameStart', {
            role: this.role,
            shrines: shrines?.map(s => ({
                id: s.shrine_id,
                name: ['Church', 'Well', 'Mill', 'Graveyard', 'Forest Left', 'Forest Right', 'Hilltop Altar'][s.shrine_id],
                position: [
                    { x: -20, y: 0, z: 0 },
                    { x: 0, y: 0, z: 20 },
                    { x: 20, y: 0, z: 0 },
                    { x: 0, y: 0, z: -20 },
                    { x: -30, y: 0, z: 30 },
                    { x: 30, y: 0, z: 30 },
                    { x: 0, y: 5, z: 50 }
                ][s.shrine_id],
                lit: s.lit
            })) || [],
            players: players.map(p => ({
                id: p.id,
                name: p.name,
                position: p.position
            })),
            duration: 600000
        });
    }

    /**
     * Send position update
     */
    sendPosition(position, rotation) {
        this.broadcast('playerMoved', {
            playerId: this.playerId,
            position,
            rotation
        });

        // Also update in database periodically (throttled)
        this.throttledPositionUpdate(position, rotation);
    }

    // Throttle database updates
    _positionUpdateTimeout = null;
    throttledPositionUpdate(position, rotation) {
        if (this._positionUpdateTimeout) return;

        this._positionUpdateTimeout = setTimeout(async () => {
            await supabase
                .from('players')
                .update({ position, rotation, last_seen: new Date().toISOString() })
                .eq('id', this.playerId);
            this._positionUpdateTimeout = null;
        }, 1000); // Update DB once per second
    }

    /**
     * Light a shrine
     */
    async lightShrine(shrineId) {
        // Determine if this is a valid light (villager) or corrupted (hollow)
        const valid = this.role === 'villager';

        await supabase
            .from('shrines')
            .update({
                lit: true,
                valid: valid,
                lit_by: this.playerId
            })
            .eq('room_id', this.roomId)
            .eq('shrine_id', shrineId);

        this.broadcast('shrineLit', {
            shrineId,
            playerId: this.playerId
        });

        // Add faith if villager
        if (valid) {
            const { data: room } = await supabase
                .from('rooms')
                .select('faith')
                .eq('id', this.roomId)
                .single();

            if (room) {
                await supabase
                    .from('rooms')
                    .update({ faith: Math.min(100, room.faith + 10) })
                    .eq('id', this.roomId);
            }
        }

        // Check win condition
        await this.checkRitualComplete();
    }

    /**
     * Check if ritual is complete
     */
    async checkRitualComplete() {
        const { data: shrines } = await supabase
            .from('shrines')
            .select('valid')
            .eq('room_id', this.roomId);

        const allValid = shrines?.every(s => s.valid);

        if (allValid) {
            await this.endGame('ritual_complete', 'villagers');
        }
    }

    /**
     * Pick up vessel
     */
    async pickupVessel() {
        await supabase
            .from('players')
            .update({ carrying: 'vessel' })
            .eq('id', this.playerId);

        this.broadcast('vesselPickedUp', {
            playerId: this.playerId
        });
    }

    /**
     * Transfer vessel
     */
    async transferVessel(targetPlayerId) {
        await supabase
            .from('players')
            .update({ carrying: null })
            .eq('id', this.playerId);

        await supabase
            .from('players')
            .update({ carrying: 'vessel' })
            .eq('id', targetPlayerId);

        this.broadcast('vesselTransferred', {
            fromPlayerId: this.playerId,
            toPlayerId: targetPlayerId
        });
    }

    /**
     * Place vessel at altar
     */
    async placeVessel() {
        await supabase
            .from('players')
            .update({ carrying: null })
            .eq('id', this.playerId);

        await supabase
            .from('rooms')
            .update({ vessel_placed: true })
            .eq('id', this.roomId);

        this.broadcast('vesselPlaced', {
            playerId: this.playerId
        });

        // Check win condition
        await this.checkRitualComplete();
    }

    /**
     * Call a vote
     */
    async callVote() {
        await supabase
            .from('rooms')
            .update({ phase: 'voting' })
            .eq('id', this.roomId);

        const { data: players } = await supabase
            .from('players')
            .select('id, name')
            .eq('room_id', this.roomId)
            .eq('exiled', false);

        this.broadcast('votingStarted', {
            players: players || [],
            timeLimit: 30000
        });
    }

    /**
     * Cast a vote
     */
    castVote(targetPlayerId) {
        this.broadcast('voteCast', {
            voterId: this.playerId,
            targetId: targetPlayerId
        });
    }

    /**
     * End the game
     */
    async endGame(reason, winner) {
        await supabase
            .from('rooms')
            .update({ phase: 'ended' })
            .eq('id', this.roomId);

        // Get all player roles for reveal
        const { data: players } = await supabase
            .from('players')
            .select('id, name, role')
            .eq('room_id', this.roomId);

        const roles = {};
        players?.forEach(p => {
            roles[p.id] = p.role;
        });

        this.broadcast('gameEnd', {
            winner,
            reason,
            roles
        });

        this.emit('gameEnd', {
            winner,
            reason,
            roles
        });
    }

    /**
     * Leave room and clean up
     */
    async leave() {
        if (this.channel) {
            await this.channel.untrack();
            await supabase.removeChannel(this.channel);
        }

        await supabase
            .from('players')
            .delete()
            .eq('id', this.playerId);
    }

    /**
     * Get player ID
     */
    getPlayerId() {
        return this.playerId;
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.connected;
    }
}
