-- THE LAST PROCESSION - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    phase TEXT DEFAULT 'lobby' CHECK (phase IN ('lobby', 'playing', 'voting', 'ended')),
    faith INTEGER DEFAULT 100 CHECK (faith >= 0 AND faith <= 100),
    vessel_placed BOOLEAN DEFAULT FALSE,
    start_time TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER DEFAULT 600000, -- 10 minutes
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'villager' CHECK (role IN ('villager', 'hollow')),
    ready BOOLEAN DEFAULT FALSE,
    position JSONB DEFAULT '{"x": 0, "y": 1.6, "z": 0}'::jsonb,
    rotation JSONB DEFAULT '{"y": 0}'::jsonb,
    carrying TEXT,
    exiled BOOLEAN DEFAULT FALSE,
    connected BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shrines table
CREATE TABLE IF NOT EXISTS shrines (
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    shrine_id INTEGER CHECK (shrine_id >= 0 AND shrine_id <= 6),
    lit BOOLEAN DEFAULT FALSE,
    valid BOOLEAN DEFAULT FALSE,
    lit_by TEXT,
    PRIMARY KEY (room_id, shrine_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_room ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_shrines_room ON shrines(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_expires ON rooms(expires_at);

-- Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE shrines ENABLE ROW LEVEL SECURITY;

-- Rooms policies (public read, authenticated write)
CREATE POLICY "Rooms are viewable by everyone" 
ON rooms FOR SELECT 
USING (true);

CREATE POLICY "Rooms can be created by anyone" 
ON rooms FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Rooms can be updated by anyone" 
ON rooms FOR UPDATE 
USING (true);

-- Players policies
CREATE POLICY "Players are viewable by everyone" 
ON players FOR SELECT 
USING (true);

CREATE POLICY "Players can be created by anyone" 
ON players FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Players can be updated by anyone" 
ON players FOR UPDATE 
USING (true);

CREATE POLICY "Players can be deleted by anyone" 
ON players FOR DELETE 
USING (true);

-- Shrines policies
CREATE POLICY "Shrines are viewable by everyone" 
ON shrines FOR SELECT 
USING (true);

CREATE POLICY "Shrines can be created by anyone" 
ON shrines FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Shrines can be updated by anyone" 
ON shrines FOR UPDATE 
USING (true);

-- Function to initialize shrines for a room
CREATE OR REPLACE FUNCTION init_room_shrines(room_id_param TEXT)
RETURNS void AS $$
BEGIN
    INSERT INTO shrines (room_id, shrine_id, lit, valid, lit_by)
    VALUES 
        (room_id_param, 0, false, false, null),
        (room_id_param, 1, false, false, null),
        (room_id_param, 2, false, false, null),
        (room_id_param, 3, false, false, null),
        (room_id_param, 4, false, false, null),
        (room_id_param, 5, false, false, null),
        (room_id_param, 6, false, false, null)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to assign hollow role randomly
CREATE OR REPLACE FUNCTION assign_hollow(room_id_param TEXT)
RETURNS TEXT AS $$
DECLARE
    hollow_player_id TEXT;
BEGIN
    -- Select random player to be hollow
    SELECT id INTO hollow_player_id
    FROM players
    WHERE room_id = room_id_param AND NOT exiled
    ORDER BY RANDOM()
    LIMIT 1;
    
    -- Update that player's role
    UPDATE players
    SET role = 'hollow'
    WHERE id = hollow_player_id;
    
    RETURN hollow_player_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired rooms
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS void AS $$
BEGIN
    DELETE FROM rooms WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- View for public shrine state (hides 'valid' column)
CREATE OR REPLACE VIEW public_shrines AS
SELECT room_id, shrine_id, lit, lit_by
FROM shrines;

GRANT SELECT ON public_shrines TO anon, authenticated;

-- Realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE shrines;
