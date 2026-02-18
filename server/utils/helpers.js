import { v4 as uuidv4 } from 'uuid';

export function generateId() {
    return uuidv4().slice(0, 8);
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function distanceBetween(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}
