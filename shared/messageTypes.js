// ─── Socket Message Types ───────────────────────────────────
// Single source of truth for all client ↔ server messages.

// Client → Server (requests)
export const C_JOIN_ROOM = 'c:joinRoom';
export const C_LEAVE_ROOM = 'c:leaveRoom';
export const C_PLAYER_MOVE = 'c:playerMove';
export const C_INTERACT = 'c:interact';
export const C_CHAT = 'c:chat';
export const C_READY = 'c:ready';

// Server → Client (outcomes)
export const S_ROOM_STATE = 's:roomState';
export const S_PLAYER_JOINED = 's:playerJoined';
export const S_PLAYER_LEFT = 's:playerLeft';
export const S_GAME_START = 's:gameStart';
export const S_STATE_UPDATE = 's:stateUpdate';
export const S_INTERACT_RESULT = 's:interactResult';
export const S_RITUAL_PROGRESS = 's:ritualProgress';
export const S_POSSESSION_FX = 's:possessionFx';
export const S_GAME_OVER = 's:gameOver';
export const S_HALLUCINATION = 's:hallucination';
export const S_ERROR = 's:error';
