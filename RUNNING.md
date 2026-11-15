# Exactspace React assignments

Both projects are independent Vite + React applications. The original README, assignment Markdown files, screenshots, and GIFs are preserved unchanged. No GitHub repository has been created or published.

## Requirements

Use Node.js 22.12+ (verified with Node 24) and npm. Run commands from the indicated project folder. Each project includes its own lockfile; use `npm ci` for reproducible installs.

## Photo Gallery

From `photo-gallery`:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173).

- One-column photo list matching the original white gallery design.
- Fetches the original Picsum paginated feed, renders `download_url` and `author`, and appends the next page as the end approaches.
- Stops at an empty page, filters duplicate photo IDs, prevents overlapping fetches, and cancels requests on unmount.
- Independent Font Awesome thumbs-up counts start at zero and increment on every click.
- Loading, empty, end-of-feed, failed-request retry, image-failure retry, and a manual load-more fallback.
- Responsive layout, lazy-loaded images, keyboard-accessible buttons, and announced status messages.

```sh
npm test
npm run build
npm run preview
```

The production output is `photo-gallery/dist`. It can be hosted as a static site. **Picsum is the default source**, including production builds. It requires internet access; the live service timed out during verification. If a deployment encounters CORS restrictions, add a same-origin proxy for that environment. Likes last for the current page session.

### Select Picsum or the local demo

Set `VITE_PHOTO_SOURCE` to `picsum` or `mock`. If unset, it defaults to `picsum`; an invalid value displays a configuration error. This is an explicit fallback switch, not an automatic switch after a failed request, so a gallery never mixes real and demo entries.

Mock mode fetches local JSON files containing exactly the string fields `id`, `author`, and `download_url`. It has 18 unique entries in three pages of six, followed by an empty page. All images are bundled SVG landscape illustrations with demo artist labels; no external image or data service is contacted. Both modes use the same infinite scrolling, per-photo likes, validation, timeout, retry, and end-of-feed logic.

Exact PowerShell commands from the repository root:

```powershell
Set-Location 'E:\Fourth Year\Projects\react-assignments-main\photo-gallery'
# Reliable demonstration (no external data/image requests):
$env:VITE_PHOTO_SOURCE = 'mock'
npm run dev
```

Stop Vite with Ctrl+C before changing modes. To run the original API:

```powershell
$env:VITE_PHOTO_SOURCE = 'picsum'
npm run dev
```

For a production demo build, from the same folder:

```powershell
$env:VITE_PHOTO_SOURCE = 'mock'
npm run build
npm run preview
```

For the original Picsum production build (stop preview first):

```powershell
$env:VITE_PHOTO_SOURCE = 'picsum'
npm run build
npm run preview
```

Vite embeds the source selection **at build time**: changing the variable only for `preview` does not change an existing build. Rebuild after switching. To clear the terminal override afterwards, run `Remove-Item Env:VITE_PHOTO_SOURCE -ErrorAction SilentlyContinue`. Alternatively, copy `.env.example` to `.env.local`, set the desired value, and restart Vite/rebuild. Terminal variables take precedence over `.env.local`. No local override is committed, so the checked-in default remains Picsum.

On macOS/Linux, the equivalent commands are `VITE_PHOTO_SOURCE=mock npm run dev` and `VITE_PHOTO_SOURCE=picsum npm run dev`; replace `dev` with `build` to build either source, then run `npm run preview`.

From `photo-gallery`, run the checks for both modes:

```powershell
npm test
npm run test:e2e
```

The component suite runs the full gallery behavior tests in both modes and validates the real local fixtures and image paths. The browser suite starts both modes on ports 4175 and 4176, exercises the actual mock files without external requests, and intercepts Picsum responses to reliably test API routing, likes, scrolling, and error recovery despite the upstream outage. It uses installed Microsoft Edge and requires permission to start/stop temporary servers. A live-service check remains available separately in the chat project's browser suite below.

## Team Chat

From `chat-app`:

```sh
npm ci
npm run dev
```

This starts the Express + Socket.IO server on port 3001 and Vite on port 5174. Open http://127.0.0.1:5174 in two tabs to see real-time synchronization. Vite proxies `/socket.io` to Express, including WebSocket upgrades.

- Chat thread and bottom composer match the GIF's pale background, white bubbles, avatars, and compact user/time labels. The excluded sidebar is intentionally absent.
- A randomly selected Alan, Bob, Carol, Dean, or Elin is assigned by the server to each message.
- Send button and Enter send; Shift + Enter adds a line break. Empty messages are rejected and text is limited to 2,000 characters on both client and server.
- Independent message likes synchronize to all connected clients.
- Searchable emoji picker with insertion at the cursor.
- Clicking `@` shows all five users; typing `@` filters suggestions. Arrow keys and Enter select a mention; mentions are highlighted in the thread.
- Socket.IO broadcasts new messages and updates, supplies history on connection/reconnection, and acknowledges writes. Request IDs prevent retrying an uncertain write from duplicating a message or like.
- Connection indicators, offline send prevention, preserved drafts on send failure, retryable likes, and scrolling that respects a reader viewing older messages.

```sh
npm test
npm run build
npm start
```

For production, Express serves `chat-app/dist` and Socket.IO together at http://localhost:3001. `PORT` can change the production server port. Development uses port 3001 in the Vite proxy; update that proxy as well if changing the development server port.

The server intentionally stores chat history and likes in memory: reconnecting clients recover history while the server remains running, but restarting the server clears it. Authentication, a database, and multiple rooms are outside these assignments.

## Structure

```text
photo-gallery/
  src/              Gallery components, fetching hook, styles, component tests
  public/mock/      Three local JSON pages, empty final page, and local SVG images
  e2e/              Browser verification of both gallery source modes
  .env.example      Documented source selector (default: picsum)
  package.json      Independent scripts and dependencies
  package-lock.json
  vite.config.js
  [original assignment and reference images]
chat-app/
  client/           React chat UI, connection hook, composer, picker, UI tests
  server/           Express + Socket.IO server and real-socket integration tests
  shared/           User list and message constraints
  e2e/              Browser tests covering both apps
  package.json      Independent scripts and dependencies
  package-lock.json
  vite.config.js
  playwright.config.js
  [original assignment and both GIF copies]
```

## Browser verification

From `chat-app`, after building both projects:

```sh
npm run test:e2e
```

The browser tests use installed Microsoft Edge, start temporary production servers, and cover gallery pagination/retry/likes/mobile overflow plus chat emoji/mentions, two-client synchronization, independent likes, and reconnect recovery. They use deterministic photo fixtures so an upstream outage does not make ordinary tests fail. If Edge is unavailable, install it or change `channel` in `playwright.config.js` to your available Playwright browser.

An additional opt-in check verifies the real Picsum feed and image loading. In PowerShell:

```powershell
$env:LIVE_PHOTOS = '1'
npm run test:e2e
Remove-Item Env:LIVE_PHOTOS
```

Screenshots and failure traces go in the ignored `chat-app/test-results` directory. The live feed check requires outbound network access; browser tests also require permission to start and stop child processes.

Component tests cover pagination, deduplication, concurrent-request prevention, StrictMode cancellation, retries, image failures, emojis, mentions, validation, draft preservation, and delayed acknowledgements. Socket integration tests use real ephemeral servers and cover broadcasting, concurrent likes, idempotent writes, reconnect history, malformed input, and health checks.
