# DeskBuddy

A cute pixel-art desk buddy that lives on your friend's desktop and tells them what you're up to.
Pick a boy or girl, give them a name, and they show up — animated — on your buddy's screen,
pinned to the left edge, with a speech bubble carrying your status. The UI follows Notion's dark theme.

- **Doing work** — sits at a desk behind a glowing laptop, typing
- **In a meeting** — headset on, "…" speech bubble
- **At lunch** — same desk, steaming ramen, happily munching an onigiri
- **Coffee break** — standing, sipping a steaming mug
- **Working out** — dumbbell curls
- **Sleeping** — eyes shut, zZz floating up
- **Away** — stands holding a *BRB* sign, waving (also what your buddy sees when your socket drops)
- **Custom** — shouts your message through a megaphone

```
deskbuddy/
├── server/    Node.js WebSocket server (ws + express)
└── desktop/   Electron + React + Vite desktop app (macOS & Windows)
```

## Run it

Requires Node 18+.

```bash
npm install
```

**1. Start the server** (on one machine — your LAN or anywhere reachable):

```bash
npm run server
```

Listens on `ws://localhost:8080`. Set `PORT` to change it. Open `http://localhost:8080`
in a browser to see who's in which room.

**2. Start the desktop app** (on each machine):

```bash
npm run desktop
```

First launch asks for a character, a name and the room password. The password is
hardcoded by design: **`buddy123`** (`desktop/src/shared/constants.ts` and
`server/src/index.js` — change both if you change it, or set `DESKBUDDY_PASSWORD` on the server).

Once in, open **⚙ Settings** to point the app at the server's address
(e.g. `ws://192.168.1.20:8080`) and pick a room name. Both buddies must use the
same server and room.

The desktop pet overlay is click-through except on the pet itself: drag it to move,
double-click it to bring the main window forward.

## Build installers

```bash
npm run build:mac   # → desktop/dist/*.dmg   (universal)
npm run build:win   # → desktop/dist/*.exe   (NSIS installer)
```

Build Windows installers on Windows and the DMG on macOS — cross-building is possible
but not configured here. Add `desktop/build/icon.icns` / `icon.ico` to replace the default icon.

## How it talks

JSON over WebSocket. The client lives in Electron's main process so the connection
survives whatever the windows do.

```
client → server   join   { room, password, name, character, status }
                  status { kind, message, since }
server → client   joined      { self:{id}, peers:[…] }
                  peer:update { peer }
                  peer:left   { id }
                  error       { code, message }
```

The server pings every 10 s; a client that misses a pong is dropped and its peers
immediately see it as *Away · not connected*. The client reconnects with exponential backoff.

## Testing both buddies on one machine

`DESKBUDDY_PROFILE=<name>` gives an instance its own settings folder, so two can run side by side:

```bash
cd desktop && npm run build && DESKBUDDY_PROFILE=a npx electron . & DESKBUDDY_PROFILE=b npx electron .
```

`out/renderer/gallery.html` (after a build) shows every character × status; `index.html` opened in a
plain browser runs on a mock API with demo buddies, handy for tweaking the UI.

## Notes

- The password is a gate, not security. Don't expose the server to the internet as-is.
- Profile and settings are stored in Electron's `userData` folder as `deskbuddy.json`.
  "Reset profile" in Settings clears it.
- Characters are plain SVG pixel grids in `desktop/src/renderer/src/components/Character.tsx`
  (one letter per pixel). Edit the grids to change hair, outfits or props.
# wee
