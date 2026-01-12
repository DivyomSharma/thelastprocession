# THE LAST PROCESSION

A co-op folk horror browser game built with Three.js and Supabase Realtime.

![Folk Horror](https://img.shields.io/badge/Genre-Folk%20Horror-8b2020)
![Players](https://img.shields.io/badge/Players-3--6-c9a227)
![Platform](https://img.shields.io/badge/Platform-Browser-4040a0)

## 🕯️ About

Players are villagers taking part in an ancient night procession ritual that must be completed before dawn to keep an old presence beneath the land asleep. But one among you has heard the call of the buried thing. They walk with the group. They look the same. But they want the procession to fail.

## 🎮 Gameplay

- **Complete the ritual before dawn** by lighting 7 shrines and placing the sacred vessel at the hilltop altar
- **One player is secretly The Hollow** - a traitor working to sabotage the ritual
- **Faith is your lifeline** - straying from paths or failed accusations drain the shared faith pool
- **If faith reaches zero or time runs out**, The Hollow wins

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ 
- A Supabase project (free tier works)

### Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd krunker-amongus

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Get your project URL and anon key from Settings > API
4. Add them to `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Run Locally

```bash
npm run dev
# Open http://localhost:5173
```

## 🚀 Deployment (Vercel)

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables when prompted or in dashboard:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
```

### Option 2: GitHub Integration

1. Push your code to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com/new)
3. Add environment variables in project settings
4. Deploy

## 🎯 Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look around |
| E (hold) | Light shrine / Pick up vessel |
| F | Transfer vessel to nearby player |
| Tab | View controls |
| Shift | Sprint (when not carrying vessel) |
| Esc | Release mouse |

## 📁 Project Structure

```
/the-last-procession
├── /client
│   ├── /src
│   │   ├── main.js           # Entry point
│   │   ├── Game.js           # Main game class
│   │   ├── Player.js         # First-person controls
│   │   ├── RemotePlayer.js   # Other players
│   │   ├── Shrine.js         # Interactive shrines
│   │   ├── Vessel.js         # Sacred vessel
│   │   ├── Map.js            # Hollowmere Village
│   │   ├── Environment.js    # Atmosphere & lighting
│   │   ├── Network.js        # Supabase Realtime client
│   │   ├── SupabaseClient.js # Supabase initialization
│   │   ├── UI.js             # HUD management
│   │   └── Lobby.js          # Room system
│   ├── /styles
│   │   └── main.css          # Game styling
│   └── index.html            # Entry HTML
├── /supabase
│   └── schema.sql            # Database schema
├── package.json
├── vite.config.js
├── vercel.json
└── README.md
```

## 🎭 Roles

### Villager
- Light shrines to complete the ritual
- Carry the vessel to the altar
- Stay on blessed paths
- Vote to exile suspected Hollows

### The Hollow
- Secretly sabotage the ritual
- Light shrines that appear lit but don't count
- Encourage players to stray from paths
- Avoid suspicion

## ⚔️ Win Conditions

| Team | Win Condition |
|------|---------------|
| Villagers | All 7 shrines correctly lit + vessel placed before dawn |
| Villagers | Successfully exile The Hollow |
| Hollow | Time runs out with incomplete ritual |
| Hollow | Faith reaches zero |
| Hollow | Innocent villagers exiled (advantages Hollow) |

## 🛠️ Tech Stack

- **Frontend**: Three.js, Vite
- **Backend**: Supabase (Realtime, PostgreSQL)
- **Hosting**: Vercel
- **Styling**: Vanilla CSS

## 📜 License

MIT License - feel free to modify and distribute.

---

*"The ritual must be completed. The Sleeper must not wake."*
