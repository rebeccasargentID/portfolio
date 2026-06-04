# Network Closet 3D

A first-person, walk-around 3D version of a Cisco Packet Tracer–style office
layout, built for an IT Fundamentals course. Explore a black two-storey office,
pick up network gear, and rack it in the two wiring closets.

Built with [Three.js](https://threejs.org/) (WebGL) — no plugins, runs in any
modern browser. (Flash is no longer supported by any browser, so this is the
modern equivalent of the old-school 3D feel.)

## Controls

| Action | Key |
| --- | --- |
| Move | W A S D |
| Look | Mouse |
| Sprint | Shift |
| Pick up / Place in rack | E |
| Drop held item | Q |
| Pause (release mouse) | Esc |

## The building (from the blueprint)

- **First floor:** Wiring Closet / IT Room (with the MDF rack), Reception Area,
  central staircase, Guest Area.
- **Second floor:** Office 1, central Wiring Closet (with the IDF rack), Office 2.

Walk up the central stairs to move between floors.

## Run it locally

Because it uses ES modules, open it through a local web server (not by
double-clicking the file):

```bash
cd game
python3 -m http.server 8000
# then open http://localhost:8000/ in your browser
```

Any static server works (e.g. `npx serve`).

## Publish on GitHub Pages (free, shareable link)

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a
   branch**, pick your branch and the `/ (root)` folder, Save.
3. After it builds, the game lives at:
   `https://<your-username>.github.io/portfolio/game/`

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page shell, start screen, HUD, loads Three.js from a CDN |
| `style.css` | Overlay / HUD styling |
| `main.js` | Renderer, lighting, game loop, pick-up/place logic |
| `world.js` | Builds the two-storey building, racks, furniture, spawns |
| `player.js` | First-person movement, wall collision, stair climbing |
| `items.js` | Network gear definitions and carry/rack behavior |
| `ui.js` | Crosshair, prompts, and the heads-up display |

## Tweaking it

- **Add/move gear:** edit `itemSpawns` in `world.js`, or add a new type to
  `ITEM_TYPES` in `items.js`.
- **Change the layout:** walls and rooms are defined in `buildWorld()` in
  `world.js` using metre coordinates that match the 20 m × 12 m blueprint.
- **More rack slots:** change `slotCount` in `makeRack()` in `world.js`.
