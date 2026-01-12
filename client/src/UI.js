/**
 * THE LAST PROCESSION - UI Manager
 * Handles all HUD elements and screen management
 */

export class UI {
    constructor() {
        this.game = null;
        this.lobby = null;

        // Cache DOM elements
        this.screens = {
            lobby: document.getElementById('lobby-screen'),
            hud: document.getElementById('hud'),
            voting: document.getElementById('voting-screen'),
            end: document.getElementById('end-screen')
        };

        // HUD elements
        this.elements = {
            faithFill: document.getElementById('faith-fill'),
            faithValue: document.getElementById('faith-value'),
            timer: document.getElementById('timer'),
            roleIndicator: document.getElementById('role-indicator'),
            shrineIcons: document.querySelectorAll('.shrine-icon'),
            interactionPrompt: document.getElementById('interaction-prompt'),
            promptText: document.getElementById('prompt-text'),
            vesselIndicator: document.getElementById('vessel-indicator'),
            hollowOverlay: document.getElementById('hollow-overlay'),
            instructions: document.getElementById('instructions')
        };

        // Voting elements
        this.votingElements = {
            voteOptions: document.getElementById('vote-options'),
            voteTimer: document.getElementById('vote-timer'),
            skipVoteBtn: document.getElementById('skip-vote-btn')
        };

        // End screen elements
        this.endElements = {
            title: document.getElementById('end-title'),
            subtitle: document.getElementById('end-subtitle'),
            roles: document.getElementById('end-roles'),
            playAgainBtn: document.getElementById('play-again-btn')
        };

        this.setupEventListeners();
    }

    /**
     * Set game reference
     */
    setGame(game) {
        this.game = game;
    }

    /**
     * Set lobby reference
     */
    setLobby(lobby) {
        this.lobby = lobby;
    }

    /**
     * Set up UI event listeners
     */
    setupEventListeners() {
        // Game interaction events
        window.addEventListener('player-interact', (e) => {
            if (this.game) {
                this.game.interact(e.detail?.held);
            }
        });

        window.addEventListener('player-transfer', () => {
            // Handle vessel transfer
        });

        window.addEventListener('show-player-list', () => {
            this.elements.instructions.classList.remove('hidden');
        });

        window.addEventListener('hide-player-list', () => {
            this.elements.instructions.classList.add('hidden');
        });

        // Skip vote button
        if (this.votingElements.skipVoteBtn) {
            this.votingElements.skipVoteBtn.addEventListener('click', () => {
                if (this.game && this.game.network) {
                    this.game.network.castVote(null);
                }
            });
        }

        // Play again button
        if (this.endElements.playAgainBtn) {
            this.endElements.playAgainBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }

    // ==================== Screen Management ====================

    /**
     * Show a specific screen
     */
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
                screen.classList.add('hidden');
            }
        });

        const screen = this.screens[screenName];
        if (screen) {
            screen.classList.remove('hidden');
            screen.classList.add('active');
        }
    }

    /**
     * Show lobby screen
     */
    showLobby() {
        this.showScreen('lobby');
    }

    /**
     * Show HUD (game screen)
     */
    showHUD() {
        this.showScreen('hud');
    }

    /**
     * Show voting screen
     */
    showVotingScreen(data) {
        this.showScreen('voting');
        this.populateVotingOptions(data.players);
        this.startVotingTimer(data.timeLimit);
    }

    /**
     * Hide voting screen and return to HUD
     */
    hideVotingScreen() {
        this.showScreen('hud');
    }

    /**
     * Show end screen
     */
    showEndScreen(data) {
        this.showScreen('end');

        const { winner, reason, roles } = data;

        // Set title based on winner
        if (winner === 'villagers') {
            this.endElements.title.textContent = 'DAWN BREAKS';
            this.endElements.title.classList.add('villagers-win');
            this.endElements.title.classList.remove('hollow-wins');
            this.endElements.subtitle.textContent = 'The ritual is complete. The Sleeper remains bound.';
        } else {
            this.endElements.title.textContent = 'THE SLEEPER WAKES';
            this.endElements.title.classList.add('hollow-wins');
            this.endElements.title.classList.remove('villagers-win');

            if (reason === 'faith_depleted') {
                this.endElements.subtitle.textContent = 'Faith has abandoned the village. Darkness consumes all.';
            } else if (reason === 'timeout') {
                this.endElements.subtitle.textContent = 'The ritual was not completed in time.';
            } else {
                this.endElements.subtitle.textContent = 'The Hollow has succeeded. The earth trembles.';
            }
        }

        // Populate roles
        this.populateEndRoles(roles);
    }

    /**
     * Populate end screen with player roles
     */
    populateEndRoles(roles) {
        this.endElements.roles.innerHTML = '';

        Object.entries(roles).forEach(([playerId, role]) => {
            const playerName = this.getPlayerName(playerId) || playerId.substring(0, 8);

            const item = document.createElement('div');
            item.className = `end-role-item ${role}`;
            item.innerHTML = `
                <span class="player-name">${playerName}</span>
                <span class="player-role">${role.toUpperCase()}</span>
            `;
            this.endElements.roles.appendChild(item);
        });
    }

    // ==================== HUD Updates ====================

    /**
     * Update faith meter
     */
    updateFaith(faith) {
        const percentage = Math.max(0, Math.min(100, faith));

        if (this.elements.faithFill) {
            this.elements.faithFill.style.width = `${percentage}%`;
        }

        if (this.elements.faithValue) {
            this.elements.faithValue.textContent = Math.round(percentage);
        }

        // Change color based on faith level
        if (this.elements.faithFill) {
            if (percentage < 20) {
                this.elements.faithFill.style.background =
                    'linear-gradient(90deg, #8b2020 0%, #ff3030 100%)';
            } else if (percentage < 40) {
                this.elements.faithFill.style.background =
                    'linear-gradient(90deg, #8b5020 0%, #ff6b35 100%)';
            } else {
                this.elements.faithFill.style.background =
                    'linear-gradient(90deg, #8b7019 0%, #c9a227 100%)';
            }
        }
    }

    /**
     * Update timer display
     */
    updateTimer(remainingMs) {
        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (this.elements.timer) {
            this.elements.timer.textContent = timeStr;

            // Warning state when time is low
            if (remainingMs < 60000) {
                this.elements.timer.classList.add('warning');
            } else {
                this.elements.timer.classList.remove('warning');
            }
        }
    }

    /**
     * Set player role display
     */
    setRole(role) {
        if (this.elements.roleIndicator) {
            this.elements.roleIndicator.textContent = role.toUpperCase();
            this.elements.roleIndicator.classList.toggle('hollow', role === 'hollow');
        }

        // Show hollow overlay for the hollow player
        if (this.elements.hollowOverlay) {
            this.elements.hollowOverlay.classList.toggle('hidden', role !== 'hollow');
        }
    }

    /**
     * Update shrine progress indicator
     */
    updateShrineProgress(shrineId, lit) {
        const icon = document.querySelector(`.shrine-icon[data-shrine="${shrineId}"]`);
        if (icon) {
            icon.textContent = lit ? '●' : '○';
            icon.classList.toggle('lit', lit);
        }
    }

    /**
     * Show interaction prompt
     */
    showInteractionPrompt(text) {
        if (this.elements.interactionPrompt && this.elements.promptText) {
            this.elements.promptText.textContent = text;
            this.elements.interactionPrompt.classList.remove('hidden');
        }
    }

    /**
     * Hide interaction prompt
     */
    hideInteractionPrompt() {
        if (this.elements.interactionPrompt) {
            this.elements.interactionPrompt.classList.add('hidden');
        }
    }

    /**
     * Show interaction progress (for shrine lighting)
     */
    showInteractionProgress(progress) {
        // Could add a progress bar here
        // For now, update prompt text
        if (progress > 0) {
            const percent = Math.round(progress * 100);
            this.showInteractionPrompt(`Lighting shrine... ${percent}%`);
        }
    }

    /**
     * Show/hide vessel indicator
     */
    showVesselIndicator(show) {
        if (this.elements.vesselIndicator) {
            this.elements.vesselIndicator.classList.toggle('hidden', !show);
        }
    }

    /**
     * Show exiled overlay
     */
    showExiledOverlay() {
        // Create and show an overlay for exiled players
        const overlay = document.createElement('div');
        overlay.className = 'exiled-overlay';
        overlay.innerHTML = `
            <div class="exiled-content">
                <h2>YOU HAVE BEEN EXILED</h2>
                <p>The village has cast you out. Watch as the ritual concludes.</p>
            </div>
        `;
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(10, 10, 12, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            color: #e8e4d9;
            text-align: center;
        `;
        document.body.appendChild(overlay);
    }

    // ==================== Voting UI ====================

    /**
     * Populate voting options with players
     */
    populateVotingOptions(players) {
        if (!this.votingElements.voteOptions) return;

        this.votingElements.voteOptions.innerHTML = '';
        const myId = this.game?.network?.getPlayerId();

        players.forEach(player => {
            if (player.id === myId) return; // Can't vote for yourself

            const option = document.createElement('div');
            option.className = 'vote-option';
            option.innerHTML = `
                <span class="player-name">${player.name}</span>
            `;
            option.addEventListener('click', () => {
                this.selectVoteOption(option, player.id);
            });
            this.votingElements.voteOptions.appendChild(option);
        });
    }

    /**
     * Select a vote option
     */
    selectVoteOption(element, playerId) {
        // Deselect others
        document.querySelectorAll('.vote-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Select this one
        element.classList.add('selected');

        // Send vote
        if (this.game && this.game.network) {
            this.game.network.castVote(playerId);
        }
    }

    /**
     * Start voting countdown timer
     */
    startVotingTimer(duration) {
        let remaining = duration;

        const updateTimer = () => {
            remaining -= 1000;
            if (this.votingElements.voteTimer) {
                this.votingElements.voteTimer.textContent = Math.ceil(remaining / 1000);
            }

            if (remaining > 0) {
                setTimeout(updateTimer, 1000);
            }
        };

        updateTimer();
    }

    /**
     * Show voting result
     */
    showVotingResult(data) {
        if (data.exiled) {
            const exiledName = this.getPlayerName(data.exiled) || 'Unknown';
            alert(`${exiledName} has been exiled!`);
        } else if (data.tie) {
            alert('The vote was tied. No one was exiled.');
        }
    }

    // ==================== Utilities ====================

    /**
     * Get player name from ID
     */
    getPlayerName(playerId) {
        // This would need to be tracked from player join events
        // For now, return truncated ID
        return playerId.substring(0, 8);
    }
}
