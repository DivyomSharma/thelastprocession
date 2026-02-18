// ─── Shared Constants ───────────────────────────────────────
// Used by BOTH client and server. Keep in sync.

export const TILE_SIZE = 32;
export const MAP_WIDTH = 50;   // tiles
export const MAP_HEIGHT = 50;  // tiles

export const PLAYER_SPEED = 120;  // pixels per second
export const SERVER_TICK_RATE = 15; // Hz
export const TICK_INTERVAL = 1000 / SERVER_TICK_RATE;

export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2; // for testing, raise to 4 for production

export const LIGHT_RADIUS = 5;        // in tiles
export const TORCH_LIGHT_RADIUS = 4;  // in tiles
export const SHRINE_GLOW_RADIUS = 3;  // in tiles

export const ATTUNEMENT = {
    MAX: 100,
    STAGE_1: 25,  // Touched
    STAGE_2: 50,  // Called
    STAGE_3: 75,  // Vessel

    // Triggers
    WRONG_SHRINE_ORDER: 15,
    WALK_PATH_ALONE: 10,
    RING_BELL_ALONE: 10,
    DARKNESS_PER_TICK: 5,
    PROXIMITY_DECAY: -2,
    CORRECT_RITUAL: -5,
};

export const MATCH_DURATION = 480; // 8 minutes in seconds

export const DIRECTIONS = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right',
};
