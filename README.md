# 🌍 Open World Toolkit

A professional-grade **browser-based world editor** for indie game developers. Design maps, place locations, build NPCs and quests, generate procedural terrain, and export to multiple formats — all in a beautiful dark UI with no backend required.

**[🚀 Live Demo](https://open-world-tool.vercel.app)** · Built with React 19 + TypeScript + Vite + Tailwind CSS

---

![Open World Toolkit Screenshot](https://via.placeholder.com/1200x600/020617/3b82f6?text=Open+World+Toolkit)

---

## ✨ Features

### 🗺️ Maps & Terrain

- Create and manage multiple maps with custom dimensions
- **Procedural terrain generation** using FBM (Fractal Brownian Motion) noise
- 8 biome types: deep ocean, ocean, beach, plains, forest, highland, mountain, snow
- Full terrain controls: seed, scale, octaves, lacunarity, gain, domain warp
- Live 256×256 terrain preview with biome breakdown bar

### 📍 Visual Map Canvas

- **Drag & drop location pins** on a rendered terrain canvas
- **Scroll to zoom** (50%–800%), **Alt+drag to pan**
- Location pins auto-named by terrain biome ("Dark Wood", "Mountain Peak", etc.)
- Click a pin to select and edit its properties in a side panel

### 🧑 NPC System

- 9 NPC roles: villager, merchant, quest giver, guard, companion, enemy, boss, neutral, custom
- Assign NPCs to locations with auto map resolution
- Intro dialogue and design notes per NPC

### 📜 Quest System

- 4 quest types: main, side, daily, hidden
- Checklist objectives with optional location tie-ins
- Link quests to NPC givers
- Live progress bar per quest
- Status tracking: draft → active → completed / failed

### 🏷️ Tag System

- Add tags to locations with autocomplete and quick-tag buttons
- Tag metadata: category, color, description
- Global rename, merge, and delete tags across the entire world
- Filter locations by tag (ANY / ALL mode)

### 💾 Export Formats

- **Native JSON** — full reimportable world file
- **CSV** — flat location table for Unity/Godot importers and spreadsheets
- **Tiled .tmj** — one file per map, compatible with Tiled Map Editor 1.10+

### 🔧 Editor Quality of Life

- **Undo/Redo** — up to 50 steps, `Cmd+Z` / `Cmd+Shift+Z`
- **Minimap** in sidebar with live terrain and location pins
- **Styled modals** — no more browser `confirm()` / `alert()`
- **Auto-persist** to localStorage — never lose your work
- **Import** any compatible world JSON
- **Validation** — errors and warnings in the Preview tab
- **48 unit tests** with Vitest

---

## 🛠️ Tech Stack

| Layer      | Technology                 |
| ---------- | -------------------------- |
| Framework  | React 19                   |
| Language   | TypeScript                 |
| Build tool | Vite                       |
| Styling    | Tailwind CSS v4            |
| State      | useReducer + Context       |
| Terrain    | Custom FBM noise (no deps) |
| Tests      | Vitest                     |
| Deploy     | Vercel                     |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/sabrinaelkins/open-world-tool.git
cd open-world-tool
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run tests

```bash
npm test
```

### Build for production

```bash
npm run build
```

---

## 📁 Project Structure

```
src/
├── components/         # UI components
│   ├── MapCanvas.tsx   # Zoom/pan canvas with draggable pins
│   ├── TerrainEditor.tsx # FBM terrain controls
│   ├── LocationsEditor.tsx
│   ├── NpcsEditor.tsx
│   ├── QuestsEditor.tsx
│   ├── TagsEditor.tsx
│   ├── PreviewTab.tsx
│   ├── ExportModal.tsx
│   ├── Modal.tsx
│   └── Sidebar.tsx     # Minimap + nav + undo/redo
├── context/
│   ├── WorldContext.tsx    # Provider + undo/redo
│   ├── worldContextDef.ts  # Context type + createContext
│   ├── worldReducer.ts     # All state mutations
│   └── useWorld.ts         # Consumer hook
├── types/
│   ├── worldTypes.ts   # All TypeScript interfaces
│   ├── worldIO.ts      # Normalization + migration
│   ├── terrain.ts      # FBM heightmap + biomes
│   └── exportFormats.ts # JSON / CSV / Tiled exporters
└── __tests__/          # 48 unit tests
```

---

## 🗺️ World File Format

```json
{
  "version": 1,
  "world": { "id": "world_001", "name": "My World", "description": "..." },
  "maps": [
    {
      "id": "map_abc",
      "name": "Starter Region",
      "size": { "width": 4000, "height": 4000, "unit": "meters" },
      "terrainGen": { "seed": 42, "scale": 18, "octaves": 4, "lacunarity": 2, "gain": 0.5, "warp": 0.3 },
      "locations": ["loc_xyz"]
    }
  ],
  "locations": [
    {
      "id": "loc_xyz",
      "name": "Dark Wood",
      "mapId": "map_abc",
      "position": { "x": 1200, "y": 800, "z": 0 },
      "radius": 50,
      "tags": ["forest", "quest"]
    }
  ],
  "npcs": [...],
  "quests": [...],
  "tagMeta": { "forest": { "color": "#16a34a", "category": "biome" } }
}
```

---

## 📄 License

MIT © 2026 Sabrina Elkins — see [LICENSE](LICENSE) for details.

---

## 🙏 Contributing

PRs welcome! The codebase is intentionally modular — each editor tab is a self-contained component that reads from `useWorld()` and dispatches typed actions.
