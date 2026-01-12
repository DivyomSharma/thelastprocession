/**
 * THE LAST PROCESSION - Lobby Manager
 * Handles room creation, joining, and ready system
 */

export class Lobby {
    constructor(network, ui) {
        this.network = network;
        this.ui = ui;

        // State
        this.roomId = null;
        this.players = new Map();
        this.isReady = false;
        this.playerName = '';

        // Cache DOM elements
        this.elements = {
            playerNameInput: document.getElementById('player-name'),
            roomCodeInput: document.getElementById('room-code'),
            joinBtn: document.getElementById('join-btn'),
            createBtn: document.getElementById('create-btn'),
            roomInfo: document.getElementById('room-info'),
            currentRoomCode: document.getElementById('current-room-code'),
            playerList: document.getElementById('player-list'),
            readyBtn: document.getElementById('ready-btn'),
            menuSection: document.querySelector('.menu-section')
        };

        this.setupEventListeners();
        this.setupNetworkHandlers();
    }

    /**
     * Set up button event listeners
     */
    setupEventListeners() {
        // Join room button
        if (this.elements.joinBtn) {
            this.elements.joinBtn.addEventListener('click', () => this.joinRoom());
        }

        // Create room button
        if (this.elements.createBtn) {
            this.elements.createBtn.addEventListener('click', () => this.createRoom());
        }

        // Ready button
        if (this.elements.readyBtn) {
            this.elements.readyBtn.addEventListener('click', () => this.toggleReady());
        }

        // Enter key in inputs
        [this.elements.playerNameInput, this.elements.roomCodeInput].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        if (this.elements.roomCodeInput.value) {
                            this.joinRoom();
                        } else {
                            this.createRoom();
                        }
                    }
                });
            }
        });
    }

    /**
     * Set up network event handlers
     */
    setupNetworkHandlers() {
        // Connection status
        this.network.on('_connected', () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
        });

        this.network.on('_disconnected', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });

        // Join result
        this.network.on('joinSuccess', (data) => {
            this.onJoinSuccess(data);
        });

        this.network.on('joinError', (data) => {
            this.onJoinError(data);
        });

        // Player updates
        this.network.on('playerJoined', (data) => {
            this.onPlayerJoined(data);
        });

        this.network.on('playerLeft', (data) => {
            this.onPlayerLeft(data);
        });

        this.network.on('playerReadyUpdate', (data) => {
            this.onPlayerReadyUpdate(data);
        });
    }

    /**
     * Validate player name
     */
    validatePlayerName() {
        const name = this.elements.playerNameInput?.value.trim();

        if (!name || name.length < 2) {
            alert('Please enter a name (at least 2 characters)');
            return null;
        }

        if (name.length > 16) {
            alert('Name must be 16 characters or less');
            return null;
        }

        return name;
    }

    /**
     * Create a new room
     */
    createRoom() {
        const name = this.validatePlayerName();
        if (!name) return;

        this.playerName = name;
        const roomId = this.network.createRoom(name);

        // Show loading state
        this.setButtonLoading(this.elements.createBtn, true);
    }

    /**
     * Join an existing room
     */
    joinRoom() {
        const name = this.validatePlayerName();
        if (!name) return;

        const roomCode = this.elements.roomCodeInput?.value.trim().toUpperCase();

        if (!roomCode || roomCode.length < 4) {
            alert('Please enter a valid room code');
            return;
        }

        this.playerName = name;
        this.network.joinRoom(roomCode, name);

        // Show loading state
        this.setButtonLoading(this.elements.joinBtn, true);
    }

    /**
     * Toggle ready status
     */
    toggleReady() {
        this.isReady = !this.isReady;
        this.network.setReady();

        if (this.elements.readyBtn) {
            this.elements.readyBtn.textContent = this.isReady ? 'Waiting...' : 'Ready';
            this.elements.readyBtn.classList.toggle('ready', this.isReady);
        }
    }

    /**
     * Handle successful room join
     */
    onJoinSuccess(data) {
        this.roomId = data.roomId;

        // Clear loading states
        this.setButtonLoading(this.elements.joinBtn, false);
        this.setButtonLoading(this.elements.createBtn, false);

        // Update room info display
        if (this.elements.currentRoomCode) {
            this.elements.currentRoomCode.textContent = data.roomId;
        }

        // Show room info, hide menu
        if (this.elements.menuSection) {
            this.elements.menuSection.classList.add('hidden');
        }
        if (this.elements.roomInfo) {
            this.elements.roomInfo.classList.remove('hidden');
        }

        // Populate initial player list
        this.players.clear();
        if (data.players) {
            data.players.forEach(player => {
                this.players.set(player.id, {
                    name: player.name,
                    ready: false
                });
            });
        }
        this.updatePlayerList();

        console.log(`Joined room: ${data.roomId}`);
    }

    /**
     * Handle join error
     */
    onJoinError(data) {
        this.setButtonLoading(this.elements.joinBtn, false);
        this.setButtonLoading(this.elements.createBtn, false);

        alert(data.error || 'Failed to join room');
    }

    /**
     * Handle player joined event
     */
    onPlayerJoined(data) {
        this.players.set(data.playerId, {
            name: data.playerName,
            ready: false
        });
        this.updatePlayerList();

        console.log(`${data.playerName} joined the room`);
    }

    /**
     * Handle player left event
     */
    onPlayerLeft(data) {
        const player = this.players.get(data.playerId);
        if (player) {
            console.log(`${player.name} left the room`);
        }
        this.players.delete(data.playerId);
        this.updatePlayerList();
    }

    /**
     * Handle player ready update
     */
    onPlayerReadyUpdate(data) {
        const player = this.players.get(data.playerId);
        if (player) {
            player.ready = data.ready;
            this.updatePlayerList();
        }
    }

    /**
     * Update the player list display
     */
    updatePlayerList() {
        if (!this.elements.playerList) return;

        this.elements.playerList.innerHTML = '';

        this.players.forEach((player, id) => {
            const item = document.createElement('div');
            item.className = `player-item ${player.ready ? 'ready' : ''}`;
            item.innerHTML = `
                <span class="player-name">${this.escapeHtml(player.name)}</span>
                <span class="player-status">${player.ready ? '✓ Ready' : 'Not Ready'}</span>
            `;
            this.elements.playerList.appendChild(item);
        });
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(connected) {
        if (this.elements.joinBtn) {
            this.elements.joinBtn.disabled = !connected;
        }
        if (this.elements.createBtn) {
            this.elements.createBtn.disabled = !connected;
        }
    }

    /**
     * Set button loading state
     */
    setButtonLoading(button, loading) {
        if (!button) return;

        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = 'Connecting...';
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || button.textContent;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get player name by ID
     */
    getPlayerName(playerId) {
        const player = this.players.get(playerId);
        return player ? player.name : null;
    }
}
