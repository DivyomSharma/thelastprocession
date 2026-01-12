# THE LAST PROCESSION
## Complete Game Design Document

---

# 📖 STORY & WORLD LORE

## The Origin of the Ritual

Three hundred years ago, the village of **Hollowmere** was founded atop an ancient burial mound. The settlers unknowingly disturbed **The Sleeper**—an old presence that predates memory, worshipped by a forgotten people who believed it would one day consume the sun.

When the Sleeper stirred, crops withered, animals fled, and villagers began walking into the marshes at night, never to return.

A traveling **cunning woman** taught the village a binding ritual: **The Procession of Quiet Flames**. Every year, on the longest night, the villagers must:

- Walk a sacred path through the village
- Light seven **shrine fires** in sequence
- Carry the **Vessel of Ashes** (remains of the first sacrifice) to the hilltop
- Complete the circuit before dawn

The ritual doesn't destroy the Sleeper—it merely **extends its slumber** for another year.

## The Betrayer's Curse

The Sleeper cannot act directly, but it can **call** to one soul each year. This person hears whispers promising power, freedom from death, or reunion with lost loved ones. They become **The Hollow**—outwardly unchanged, but inwardly devoted to waking the Sleeper.

The Hollow cannot simply refuse to participate. The ritual requires **all present villagers** to walk together. Instead, they must **sabotage from within**—subtly, carefully, while appearing to help.

## If the Ritual Succeeds

- Dawn breaks golden over the hills
- The Sleeper sinks deeper into slumber
- The village survives another year
- The Hollow is freed from the curse (their memory of betrayal fades)

## If the Ritual Fails

- The sun does not rise
- Black roots erupt from the ground
- All villagers are **pulled beneath the earth**
- The Sleeper **partially wakes**—the village becomes cursed land forever

---

# 🎮 CORE GAMEPLAY LOOP

## Phase 1: Gathering at Dusk (0:00–1:00)

| Event | Details |
|-------|---------|
| **Spawn** | All players spawn at the village square |
| **Role Assignment** | Server secretly assigns one player as The Hollow |
| **Briefing** | Elder NPC recites the ritual requirements |
| **Tool Distribution** | Players collect torches, bells, and the Vessel |

**Player Actions:**
- Examine shrine locations on the map
- Discuss strategy (who carries what)
- The Hollow receives a private overlay showing sabotage opportunities

---

## Phase 2: The First Shrines (1:00–4:00)

| Event | Details |
|-------|---------|
| **Shrine Lighting** | Players must light shrines 1–4 in sequence |
| **Path Walking** | Must stay on blessed paths (marked by stones) |
| **Vessel Carrying** | One player carries the Vessel—cannot use other tools |

**Tension Mechanics:**
- Straying from paths drains **Faith** (shared resource)
- Shrines require 2+ players to light (prevents solo completion)
- The Hollow can **mislight** shrines (appears identical, but doesn't count)

---

## Phase 3: The Deep Woods (4:00–7:00)

| Event | Details |
|-------|---------|
| **Fog Thickens** | Visibility drops to 15 meters |
| **Shrine 5–6** | Located in isolated clearings |
| **Sanity Drain** | Being alone drains individual sanity |

**Rising Mistrust:**
- Players may see **false shadows** (client-side hallucinations)
- Audio cues become unreliable (hearing footsteps that aren't there)
- The Hollow can **extinguish torches** when unobserved

---

## Phase 4: The Hilltop (7:00–9:00)

| Event | Details |
|-------|---------|
| **Final Shrine** | Shrine 7 on the hilltop requires all surviving players |
| **Vessel Offering** | Must be placed at the altar before dawn |
| **Accusation Phase** | Players can vote to **exile** one person |

**Final Tension:**
- If Faith is low, the sky turns red (warning)
- Exiled players cannot participate in final lighting
- Wrong exile = one less villager = harder to complete

---

## Phase 5: Dawn or Darkness (9:00–10:00)

| Outcome | Condition |
|---------|-----------|
| **Villagers Win** | All 7 shrines properly lit + Vessel placed |
| **Hollow Wins** | Timer expires with incomplete ritual |
| **Hollow Wins** | Faith reaches zero |

---

# 🎭 HIDDEN ROLE SYSTEM

## Normal Villagers

### Responsibilities
- Light shrines **correctly** (hold interaction for 3 seconds)
- Stay on blessed paths
- Carry and protect the Vessel
- Maintain group cohesion
- Watch for suspicious behavior

### Win Condition
Complete the ritual before dawn.

### Abilities
- **Torch**: Illuminates surroundings, can be shared
- **Bell**: Rings to signal location (audible to all)
- **Blessed Salt**: Can purify one "corrupted" shrine (limited use)

---

## The Hollow (Betrayer)

### Secret Win Condition
Prevent ritual completion by:
- Running down the timer
- Draining Faith to zero
- Getting innocent villagers exiled

### Sabotage Mechanics

| Action | Effect | Detection Risk |
|--------|--------|----------------|
| **Mislight Shrine** | Appears lit, but doesn't count | Low (identical animation) |
| **Extinguish Torch** | Plunges area into darkness | Medium (requires being alone) |
| **False Bell Ring** | Creates confusion about positions | Low |
| **Path Deviation** | Secretly walks off-path to drain Faith | Medium |
| **Vessel Delay** | Walks slowly while carrying Vessel | Very Low |

### Restrictions
- **Cannot attack players directly**
- **Cannot refuse to light shrines** (would be obvious)
- **Cannot drop the Vessel** (if carrying)
- **Must appear cooperative**

### Deception Tools
- All animations are **identical** for Hollow and Villagers
- Hollow sees a private UI showing faith drain progress
- Hollow can "pretend" to see hallucinations to cast suspicion

---

# 🕯️ RITUAL MECHANICS

## Shrine Lighting

```
┌─────────────────────────────────────────────────┐
│  SHRINE INTERACTION                             │
├─────────────────────────────────────────────────┤
│  1. Approach shrine (within 2m)                 │
│  2. Hold 'E' for 3 seconds                      │
│  3. Animation: Player raises torch to brazier   │
│  4. Fire ignites (visual + audio)               │
│  5. Server validates:                           │
│     - Villager? → Shrine marked COMPLETE        │
│     - Hollow? → Shrine marked CORRUPTED         │
│       (appears identical to clients)            │
└─────────────────────────────────────────────────┘
```

**Both roles see the same fire animation.** Only the server knows the true state.

---

## The Vessel

| Rule | Description |
|------|-------------|
| **One Carrier** | Only one player holds it at a time |
| **Cannot Use Tools** | Carrier's hands are occupied |
| **Transfer** | Press 'F' near another player to pass |
| **Drop on Death** | If carrier is exiled, Vessel drops |

The Hollow **cannot destroy** the Vessel—only delay it.

---

## Blessed Paths

- Marked by **standing stones** and **bone markers**
- Walking on paths: No penalty
- Walking off paths: **-2 Faith per second** (shared pool)
- The Hollow benefits from encouraging shortcuts

---

## Silence Zones

Certain areas (the Grove, the Hollow Tree) require **silence**.

- Players cannot use voice chat in these zones (muted)
- Using bells or making noise: **-5 Faith**
- Creates natural isolation moments

---

# 🧠 SANITY / FAITH SYSTEM

## Faith (Shared Resource)

| Value | Effect |
|-------|--------|
| **100–70** | Normal gameplay |
| **69–40** | Fog thickens, ambient sounds distort |
| **39–20** | Random shrine fires flicker |
| **19–1** | Villagers see false shadows |
| **0** | Ritual fails—Hollow wins |

### Faith Drains
- Straying from paths
- Being alone for too long
- Failed accusations (voting innocent)
- Noise in silence zones

### Faith Restoration
- Lighting shrines correctly: **+10 Faith**
- Completing path sections together: **+5 Faith**
- Successfully exiling the Hollow: **+20 Faith**

---

## Individual Sanity

Each player has a **personal sanity meter** (0–100).

| Value | Effect (Client-Side Only) |
|-------|---------------------------|
| **100–60** | Normal |
| **59–30** | Occasional audio glitches |
| **29–10** | Visual distortions (shadows move wrong) |
| **9–0** | Full hallucinations (false players, fake shrine states) |

### Sanity Drains
- Being alone
- Seeing disturbing events (shrine corruption revealed)
- Low Faith (affects all players)

### Sanity Restoration
- Staying near other players
- Lighting shrines
- Using calming items (Herbs)

---

## Hallucination Examples

| Type | Description |
|------|-------------|
| **False Footsteps** | Audio of walking when no one is there |
| **Shadow Movement** | Peripheral darkness that shifts |
| **Doppelgänger** | Brief glimpse of a "fourth player" when only three are visible |
| **Shrine Mirage** | Seeing a shrine as lit when it's actually dark |
| **Whisper** | Faint voice saying player names |

**All hallucinations are client-side.** Other players don't see them.

---

# 🗺️ MAP DESIGNS

## Map 1: Hollowmere Village

```
    ┌─────────────────────────────────────┐
    │           SHRINE 7                  │
    │          (Hilltop)                  │
    │              ▲                      │
    │         ┌────┴────┐                 │
    │    S6 ◄─┤  WOODS  ├─► S5            │
    │         └────┬────┘                 │
    │              │                      │
    │    ┌─────────┴─────────┐            │
    │    │   VILLAGE SQUARE  │            │
    │    │      (Spawn)      │            │
    │    └───┬─────┬─────┬───┘            │
    │        │     │     │                │
    │       S1    S2    S3                │
    │   (Church)(Well)(Mill)              │
    │              │                      │
    │             S4                      │
    │        (Graveyard)                  │
    └─────────────────────────────────────┘
```

**Features:**
- **Small village**: 6 buildings, tight sightlines
- **Central square**: Natural gathering point
- **Graveyard**: Silence zone
- **Woods**: Reduced visibility, multiple paths
- **Hilltop**: Open, exposed, requires group

---

## Map 2: The Marsh Path

```
    ┌─────────────────────────────────────┐
    │   START ═══S1═══S2═══S3═══╗         │
    │                           ║         │
    │   ╔═══════════════════════╝         │
    │   ║         MARSH                   │
    │   ╚═══S4═══╦═══════╦═══S5═══╗       │
    │            ║ ISLAND ║       ║       │
    │            ╚═══S6═══╝       ║       │
    │                             ║       │
    │            ╔════════════════╝       │
    │            ║                        │
    │           S7 (Stone Circle)         │
    └─────────────────────────────────────┘
```

**Features:**
- **Linear path**: Forces single-file walking
- **Marsh**: Off-path = severe Faith drain
- **Island**: Isolation point, requires boat
- **Fog**: Maximum density, reduced visibility
- **Stone Circle**: Open finale area

---

## Map 3: The Barrow Hills

```
    ┌─────────────────────────────────────┐
    │                                     │
    │          S7 (Peak)                  │
    │             /\                      │
    │            /  \                     │
    │        S5 /    \ S6                 │
    │          / CAVE \                   │
    │         /   S4   \                  │
    │        /    ▼     \                 │
    │    S2 /─────┼─────\ S3              │
    │      /      │      \                │
    │     /       │       \               │
    │   S1        │      START            │
    │   (Tomb)────┴───(Village)           │
    │                                     │
    └─────────────────────────────────────┘
```

**Features:**
- **Vertical design**: Climbing mechanics
- **Cave**: Complete darkness, requires torches
- **Tomb (S1)**: Silence zone, tight corridors
- **Peak**: 360° visibility, exposed
- **Multiple routes**: Encourages splitting up

---

# 🛠️ PLAYER TOOLS

## Primary Items

| Item | Use | Interaction |
|------|-----|-------------|
| **Torch** | Illumination, shrine lighting | Hold to light shrines; can be extinguished |
| **Bell** | Audio signaling | Ring to call others; reveals your position |
| **Vessel** | Ritual completion | Must reach final shrine; occupies hands |
| **Blessed Salt** | Purify corrupted shrine | One-time use; reveals if shrine was sabotaged |

## Secondary Items (Found in World)

| Item | Use | Spawn Location |
|------|-----|----------------|
| **Herbs** | Restore 20 Sanity | Church, random buildings |
| **Rope** | Cross gaps faster | Mill, barns |
| **Oil Flask** | Refill torch (extends burn time) | Village buildings |
| **Bone Charm** | Immunity to one hallucination | Graveyard, tomb |

## Tool Philosophy
- **No weapons**—horror comes from helplessness
- **All tools support cooperation**
- **The Hollow uses the same tools**—no special items that reveal role

---

# 🎬 ENDINGS & REPLAYABILITY

## Ending 1: Dawn Breaks (Villager Victory)

**Trigger:** All 7 shrines lit correctly + Vessel placed before timer ends

**Cutscene (10 seconds):**
- Sun rises over hills
- Shrine fires burn golden
- Villagers collapse with relief
- Fade to white

**Post-Game:**
- Stats shown: Time remaining, Faith level, accusations made
- The Hollow is revealed (if not caught)

---

## Ending 2: The Sleeper Wakes (Hollow Victory - Timer)

**Trigger:** Timer expires with incomplete ritual

**Cutscene (15 seconds):**
- Sky turns blood red
- Ground cracks
- Black roots erupt, pulling villagers down
- Final shot: Camera sinks into earth

---

## Ending 3: Faith Depleted (Hollow Victory - Faith)

**Trigger:** Faith reaches 0

**Cutscene (15 seconds):**
- Shrine fires extinguish one by one
- Villagers hear whispers, clutch their heads
- They begin walking toward the marsh, uncontrollable
- Fade to black

---

## Ending 4: Justice Served (Villager Victory - Exile)

**Trigger:** The Hollow is correctly exiled

**Cutscene (10 seconds):**
- Exiled player dissolves into shadow
- Remaining villagers complete the ritual
- Optional: Easier final phase (fewer players needed)

---

## Ending 5: Innocent Blood (Hollow Advantage)

**Trigger:** An innocent villager is exiled

**Effect:**
- **-15 Faith** penalty
- Hollow remains hidden
- Game continues with fewer players

---

## Replayability Mechanics

| Element | Variation |
|---------|-----------|
| **Hollow Selection** | Random each match |
| **Shrine Order** | Sequence varies (3 possible patterns) |
| **Item Spawns** | Randomized locations |
| **Weather** | Clear/Fog/Rain (affects visibility) |
| **Starting Faith** | 100/80/60 (difficulty levels) |
| **Map Rotation** | Random or voted |

---

# 🌐 MULTIPLAYER ARCHITECTURE

## Server Authority

The server handles all **authoritative** game logic:

```
┌─────────────────────────────────────────────────┐
│                 SERVER (Node.js)                │
├─────────────────────────────────────────────────┤
│  • Role assignment (Hollow selection)           │
│  • Shrine validation (real vs corrupted)        │
│  • Faith tracking                               │
│  • Timer management                             │
│  • Accusation voting                            │
│  • Win condition checks                         │
│  • Position validation (anti-cheat)             │
│  • Authoritative game state                     │
└─────────────────────────────────────────────────┘
```

## Client Responsibility

```
┌─────────────────────────────────────────────────┐
│               CLIENT (Three.js)                 │
├─────────────────────────────────────────────────┤
│  • Rendering (3D scene)                         │
│  • Input handling                               │
│  • Local animations                             │
│  • Hallucination effects (client-only)          │
│  • Audio playback                               │
│  • UI display                                   │
│  • Prediction for smooth movement               │
└─────────────────────────────────────────────────┘
```

## Role Protection

**Critical:** The Hollow's identity must never leak to clients.

```javascript
// SERVER: Role assignment
const roles = assignRoles(players); // { playerId: 'villager'|'hollow' }

// SERVER: What each client receives
function getStateForPlayer(playerId) {
    return {
        yourRole: roles[playerId], // Only YOUR role
        otherPlayers: players.map(p => ({
            id: p.id,
            position: p.position,
            animation: p.animation,
            // NO role information for others
        })),
        shrines: shrines.map(s => ({
            id: s.id,
            appearsLit: s.appearsLit, // Visual state only
            // NOT: s.actuallyValid
        }))
    };
}
```

**Shrine states are only validated at game end** to prevent packet sniffing.

## Anti-Cheat Measures

| Threat | Mitigation |
|--------|------------|
| **Packet Sniffing** | Never send Hollow identity to other clients |
| **Speed Hacking** | Server validates movement speed |
| **Teleporting** | Server validates position deltas |
| **Shrine Manipulation** | Server authoritative on shrine states |
| **False Accusations** | Server manages voting, not clients |

## Network Flow Example

```
┌────────┐                          ┌────────┐
│ CLIENT │                          │ SERVER │
└───┬────┘                          └───┬────┘
    │                                   │
    │  "I want to light Shrine 3"       │
    │ ──────────────────────────────►   │
    │                                   │
    │   (Server checks: Is player       │
    │    close enough? Is shrine        │
    │    available? What is role?)      │
    │                                   │
    │  "Shrine 3 lighting animation"    │
    │ ◄──────────────────────────────   │
    │                                   │
    │   (All clients see same           │
    │    animation. Server records      │
    │    true state privately.)         │
    │                                   │
```

---

# ✅ MVP FEATURE LIST

## 🔴 MUST HAVE (First Playable Build)

### Core Systems
- [ ] First-person camera and movement (WASD + mouse)
- [ ] Multiplayer lobby (3–6 players)
- [ ] WebSocket connection (Socket.io)
- [ ] Basic player synchronization
- [ ] Role assignment system (1 Hollow, rest Villagers)
- [ ] 10-minute match timer

### Ritual Mechanics
- [ ] 7 shrines with interaction zones
- [ ] Shrine lighting animation (3-second hold)
- [ ] Vessel pickup/carry/transfer
- [ ] Faith meter (shared, visible to all)
- [ ] Basic path system (on/off detection)

### Map
- [ ] One complete map (Hollowmere Village recommended)
- [ ] Spawn point
- [ ] Shrine placements
- [ ] Basic navigation paths

### UI
- [ ] Faith display
- [ ] Timer display
- [ ] Role reveal (private)
- [ ] Basic accusation voting (final phase)
- [ ] Win/loss screen

### Hollow Mechanics
- [ ] Corrupt shrine action (same animation, different result)
- [ ] Private Hollow overlay (sabotage hints)

### Multiplayer
- [ ] Lobby system (create/join rooms)
- [ ] Player name display
- [ ] Basic chat (optional in MVP)

---

## 🟡 NICE TO HAVE (Post-MVP)

### Visual Polish
- [ ] Fog effects (dynamic density)
- [ ] Torch lighting (dynamic shadows)
- [ ] Weather variations (rain, mist)
- [ ] Improved character animations
- [ ] Shrine fire particle effects

### Audio
- [ ] Ambient soundtrack
- [ ] Footstep sounds (surface-based)
- [ ] Shrine activation sounds
- [ ] Low-Faith audio distortion
- [ ] Bell ring audio

### Sanity System
- [ ] Individual sanity meters
- [ ] Visual hallucinations (client-side)
- [ ] Audio hallucinations
- [ ] False shadow effects

### Additional Maps
- [ ] Map 2: Marsh Path
- [ ] Map 3: Barrow Hills
- [ ] Map selection/voting

### Tools
- [ ] Secondary items (Herbs, Salt, Oil)
- [ ] Item pickup from world
- [ ] Limited inventory system

### Quality of Life
- [ ] Player indicator icons
- [ ] Minimap (optional)
- [ ] Voice chat integration
- [ ] Tutorial level
- [ ] Spectator mode (for exiled/dead)

### Replayability
- [ ] Random shrine sequences
- [ ] Difficulty settings
- [ ] Match statistics tracking
- [ ] Player progression (cosmetics only)

---

## 🔵 AVOID FOR NOW

| Feature | Reason |
|---------|--------|
| **Combat system** | Against design philosophy |
| **Complex physics** | Scope creep |
| **Procedural maps** | Requires extensive testing |
| **AI teammates** | Multiplayer focus |
| **Account system** | Use session-based play |
| **Mobile support** | Focus on desktop first |
| **Cross-map chat** | Breaks horror isolation |
| **Multiple Hollows** | Balance complexity |
| **Custom characters** | Visual clarity matters |
| **Public matchmaking** | Start with private lobbies |

---

# 🎨 ART DIRECTION NOTES

## Visual Style: Low-Poly Folk Horror

- **Palette**: Muted greens, browns, deep blacks, orange firelight
- **No bright colors**—everything is dusk-lit
- **Simple geometry**: Krunker-style flat shading
- **Atmospheric**: Heavy fog, limited draw distance

## Character Design

- **All players look identical**: Robed villagers with hoods
- **No distinguishing features**: Forces observation of behavior
- **Name tags**: Small, only visible when close

## Environment

- **Ground**: Muddy paths, grass tufts, stone markers
- **Trees**: Bare, twisted silhouettes
- **Buildings**: Simple cottages, one church
- **Shrines**: Stone braziers with iron bowls

---

# 📐 TECHNICAL SPECIFICATIONS

## Recommended Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Three.js (WebGL) |
| **Backend** | Node.js + Express |
| **Networking** | Socket.io (WebSockets) |
| **Hosting** | Heroku / Vercel / Railway |
| **Assets** | Blender (low-poly models) |
| **Audio** | Howler.js |

## Performance Targets

| Metric | Target |
|--------|--------|
| **FPS** | 60 on mid-range hardware |
| **Players** | 3–6 per session |
| **Latency** | <100ms (playable up to 200ms) |
| **Load Time** | <10 seconds |
| **Map Size** | ~100m x 100m (small arena) |

## File Structure (Suggested)

```
/the-last-procession
├── /client
│   ├── /src
│   │   ├── main.js          # Entry point
│   │   ├── game.js          # Game loop
│   │   ├── player.js        # Player controller
│   │   ├── shrine.js        # Shrine interactions
│   │   ├── network.js       # Socket.io client
│   │   ├── ui.js            # HUD elements
│   │   └── effects.js       # Hallucinations
│   ├── /models              # 3D models (.glb)
│   ├── /textures            # Texture images
│   └── /audio               # Sound files
├── /server
│   ├── server.js            # Express + Socket.io
│   ├── game-state.js        # Authoritative state
│   ├── roles.js             # Role assignment
│   ├── shrines.js           # Shrine validation
│   └── voting.js            # Accusation system
├── package.json
└── README.md
```

---

# 🔄 DEVELOPMENT PHASES

## Phase 1: Prototype (2–3 weeks)
- Basic multiplayer connection
- Player movement synchronization
- One empty map
- Timer system

## Phase 2: Core Mechanics (3–4 weeks)
- Shrine interactions
- Role assignment
- Faith system
- Vessel carrying
- Win/loss conditions

## Phase 3: Polish (2–3 weeks)
- Map art and details
- Lighting effects
- Audio implementation
- UI improvements
- Bug fixing

## Phase 4: Playtesting (Ongoing)
- Internal testing
- Balance adjustments
- Hollow ability tuning
- Faith drain rates

---

# 📚 REFERENCE INSPIRATIONS

| Game | Relevant Element |
|------|------------------|
| **Among Us** | Hidden role, sabotage, voting |
| **Phasmophobia** | Co-op horror, investigation |
| **Krunker** | Low-poly browser FPS, scope |
| **Lethal Company** | Group survival, escalating tension |
| **Town of Salem** | Social deduction, role secrecy |
| **Blair Witch** | Folk horror atmosphere |
| **Midsommar (film)** | Ritual horror, community dread |

---

# ⚠️ DESIGN PRINCIPLES

1. **Tension through uncertainty, not jump scares**
2. **Every player action should have a reason to be observed**
3. **The Hollow should feel powerful but paranoid**
4. **Villagers should feel vulnerable but capable**
5. **Trust is the real currency—not health or ammo**
6. **The ritual must feel meaningful, not like busywork**
7. **Short matches = quick replays = more learning**
8. **Keep it simple enough for students to build**

---

*Document Version: 1.0*  
*Game Title: THE LAST PROCESSION*  
*Genre: Co-op Folk Horror (Hidden Role)*  
*Platform: Browser (Three.js)*
