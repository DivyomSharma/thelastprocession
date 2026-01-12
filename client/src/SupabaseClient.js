/**
 * THE LAST PROCESSION - Supabase Client
 * Initializes Supabase connection for realtime multiplayer
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase configuration!');
    console.error('Please create a .env.local file with:');
    console.error('VITE_SUPABASE_URL=your-project-url');
    console.error('VITE_SUPABASE_ANON_KEY=your-anon-key');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    realtime: {
        params: {
            eventsPerSecond: 20 // Higher rate for game updates
        }
    }
});

// Generate a unique player ID
export function generatePlayerId() {
    return 'player_' + Math.random().toString(36).substring(2, 15);
}

// Generate a room code
export function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
