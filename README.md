# Inazuma Eleven Guide & Team Builder

A responsive companion app for **Inazuma Eleven** that helps managers browse every canon player, compare stats, track elemental matchups, and (soon) assemble their dream squads. The experience is tuned for touch navigation, fast filtering, and looks great in the Harvest Moon–inspired dark palette.

---

## Highlights

- 🔎 **Players encyclopedia** – ~6,000 athletes from the franchise rendered with portraits, elements, roles, and calculated power metrics (Focus AT/DF, KP, etc.).
- ⚖️ **Advanced ordering** – stack multiple stat or power metrics (e.g., Kick + Control) to surface specific archetypes instantly.
- ⭐ **Favorites & persistence** – star must-have characters and filter the table to your shortlist with settings saved in localStorage.
- 🧮 **Dual views** – toggle between raw stats and derived “Power” formulas that follow the official mechanics documented in the repo.
- 📱 **Mobile-first UI** – shadcn/ui + Tailwind v4 delivers snappy cards, sticky headers, and sidebar navigation optimized for handheld play.
- 🛠️ **Team Builder (WIP)** – reserved route and atoms are ready for drag-and-drop roster planning in upcoming releases.

---

## Tech Stack

- **React 19 + Vite** (TypeScript, strict mode)
- **Tailwind CSS v4** with a custom Harvest Moon theme
- **shadcn/ui** primitives (Sidebar, Table, Select, etc.)
- **Jotai** with `atomWithStorage` for local persistence
- **lucide-react** iconography

---

## Getting Started

```bash
pnpm install   # install dependencies
pnpm start     # start Vite dev server (http://localhost:5173 by default)
```

Production build:

```bash
pnpm build
pnpm preview   # optional – serve the dist bundle locally
```

---

## Project Structure

```
src/
  assets/data/           # large JSON datasets (players, abilities, gear)
  components/
    layout/AppLayout.tsx # shell, sidebar, and page outlet
    ui/                  # shadcn-based primitives
  hooks/                 # shared hooks (e.g., mobile detection)
  lib/                   # utilities, icon mapping helpers
  pages/                 # routed pages (PlayersPage, Team Builder placeholder)
  store/
    players.ts           # sorting/filter preferences
    favorites.ts         # starred player atom
  App.tsx                # routes wired into AppLayout
  main.tsx               # Vite entry point
  index.css              # Tailwind + theme tokens
```

Players are loaded from `src/assets/data/players.json` at build time and memoized so filtering stays instant even with thousands of rows.

---

## Development Notes

- **State** – keep new persistent UI state in Jotai atoms (prefer `atomWithStorage` when reloading should retain the value). Co-locate atoms under `src/store/`.
- **Styling** – rely on existing shadcn components and Tailwind utilities. Favor small gaps/paddings (`gap-2`, `p-2`) per the project brief.
- **Accessibility** – interactive pills, toggles, and buttons already ship with focus/aria styles. Mirror those patterns for new controls.
- **Performance** – large tables use lazy rendering + `IntersectionObserver`. When adding new bulk lists, follow the same pattern.
- **Data sync** – after refreshing `src/data-scrapper/dumps/player-affinity.json`, run `npx tsx src/data-scrapper/add-affinity-to-players.ts` to propagate the `Affinity` field into `src/assets/data/players.json`.

---

## Roadmap

- 🛠️ Team Builder drag-and-drop interface with gear/technique slots
- 📚 Additional reference sheets (equipment, abilities, hissatsu lookup)
- 🔁 Import/export for sharing squads

Open an issue or PR if you want to contribute!

---

## License

MIT
