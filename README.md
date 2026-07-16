# Wharf
 
An interactive, drag-and-drop Dockerfile builder. Drag instruction blocks onto a deck, edit their fields inline, and watch a real, correctly-formatted Dockerfile assemble live — no syntax to memorize, no guessing at formatting.
 
## Features
 
- **Drag-and-drop deck** — build a Dockerfile by dragging instruction blocks (`FROM`, `RUN`, `COPY`, `ENV`, `EXPOSE`, `CMD`, and more) into place, or click to add
- **Live preview** — the generated Dockerfile updates in real time as you edit fields or reorder blocks
- **Reordering** — drag blocks within the deck, or use the up/down controls, to change instruction order
- **Copy / download** — grab the generated Dockerfile as text or download it directly
- **Type-aware fields** — each instruction exposes only the fields it actually needs (e.g. exec vs. shell form for `CMD`/`ENTRYPOINT`, key/value pairs for `ENV`/`LABEL`)
## Tech Stack
 
- **TypeScript** (strict mode) — full type safety across app state, schema definitions, and rendering
- **Vite** — dev server and build tooling
- **Native HTML5 Drag and Drop API** — no external drag-and-drop library
- **Plain CSS** with custom properties as a centralized design-token system
## Architecture
 
The app follows a strict separation of concerns across four modules:
 
```
src/
├── schema.ts   → pure data: what each Dockerfile instruction is (fields, defaults, render logic)
├── state.ts    → the `blocks` array and functions that mutate it — no DOM access
├── ui.ts       → turns state into DOM elements — reads state, never owns it
└── main.ts     → wires everything together, seeds initial blocks, boots the app
```
 
**Schema-driven design.** Every Dockerfile instruction is described once, as data, in `schema.ts` — its fields, their defaults, and a `render()` function that turns filled-in values into a line of Dockerfile syntax. The palette, the block editors, and the output generator are all built generically off this schema rather than containing per-instruction logic. Adding a new instruction means adding one entry here, not touching the rendering code.
 
**Single source of truth.** One array (`blocks`) in `state.ts` represents the entire deck. Every user action — adding, removing, reordering, or editing a block — mutates that array and triggers a full re-render, the same "state → render" loop used by frameworks like React, just implemented directly.
 
**Type-safe trust boundaries.** Internal app state uses a strict `DockerInstructionType` union — TypeScript guarantees a block's type is always one of the real, valid instructions. Data from outside the app (e.g. a shared URL) is typed more loosely as `PortableBlock` and explicitly validated against the schema before it's allowed to become real state, so malformed or tampered external data can't corrupt the app.
 
## Getting Started
 
```bash
git clone <your-repo-url>
cd wharf
npm install
npm run dev
```
 
Open the local URL Vite prints (typically `http://localhost:5173`).
 
To build for production:
 
```bash
npm run build
```
 
Output is written to `dist/`.
 
## Roadmap
 
- [ ] **Kubernetes block set** — a parallel schema and palette for Kubernetes resources (Deployments, Services, ConfigMaps, and more), reusing the same deck and drag-and-drop mechanics to generate YAML manifests alongside Dockerfiles
- [ ] **Templates** — one-click presets that populate the deck with a ready-made block configuration for common stacks (e.g. Node.js API, Python + Postgres, static site + Nginx)
- [ ] **Shareable links** — serialize a full deck configuration into a URL so others can open, view, and fork a shared setup without any backend
- [ ] **AI-assisted building** — describe what you're building in plain language and have the deck auto-populate with the relevant blocks, using structured output validated against the existing schema
