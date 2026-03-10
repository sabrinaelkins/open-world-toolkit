# Open World Toolkit

A lightweight **React + TypeScript world-building editor** for designing and managing open-world game data.

This tool allows developers to create and organize **maps, locations, and metadata tags**, export world data as portable JSON files, and automatically persist editing sessions in the browser.

---

## Features

- **World Editing**
  - Create and manage maps and locations
  - Edit world metadata and settings

- **Tag System**
  - Add tags to locations
  - Tag metadata (categories, descriptions, colors)
  - Rename, merge, and delete tags across the entire world

- **JSON Import / Export**
  - Export worlds as portable `.json` files
  - Import previously saved world files
  - Schema migration support for older world versions

- **Validation System**
  - Detect invalid map references
  - Warn about missing tags or unassigned locations
  - Preview diagnostics for errors and warnings

- **Local Persistence**
  - Autosaves world data to **browser LocalStorage**
  - Restore editing session after refresh

---

## Tech Stack

- **Language:** TypeScript (compiled to JavaScript)
- **Framework:** React
- **Build Tool:** Vite
- **Data Format:** JSON
- **Storage:** Browser LocalStorage
- **Version Control:** Git

---

## Project Architecture

Key design patterns used in the project:

- **Type-safe data modeling** using TypeScript interfaces
- **Schema migration system** for upgrading world file versions
- **Data normalization and validation** for imported world files
- **Single source of truth** for world data (`world.locations`)
- **Derived state synchronization** using React hooks (`useMemo`)
- **Modular component architecture** for editor UI

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/sabrinaelkins/open-world-toolkit.git
cd open-world-toolkit
---
## License

This project is licensed under the MIT License.

Copyright (c) 2026 Sabrina Elkins

See the [LICENSE](LICENSE) file for details.
```
