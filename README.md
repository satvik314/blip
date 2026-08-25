# Blip

A tiny 90s-virtual-pet companion for Chrome that helps you pause, slow down,
and notice what you're actually working on. Not a chat app — a check-in ritual.

Open Blip (toolbar icon or `Cmd+Shift+B`) and it takes a slow visible breath
for ~3 seconds before anything else appears. Then it looks at your current tab
and your one intention for the day ("QUEST: ship the landing page") and says one
short, warm, slightly cheeky reflection. You can type one line back and get one
response — then the exchange is over. No history. Every open is a fresh moment.
A small streak heart counts your days of checking in. That's all of it.

## Install (unpacked)

1. Clone/download this folder.
2. `cp env.example.js env.js` and paste in a free Gemini API key from
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
   (`env.js` is gitignored; the key is only ever sent to
   `generativelanguage.googleapis.com`.)
3. Open `chrome://extensions`, enable **Developer mode**, click
   **Load unpacked**, and pick this folder.
4. Pin Blip to the toolbar. If `Cmd+Shift+B` is taken by your browser, rebind
   it at `chrome://extensions/shortcuts`.

If you skip step 2, Blip still breathes with you — it just shows a friendly
note explaining how to give it its "brain chip."

## How it's built

- Manifest V3, minimal permissions: `activeTab` + `storage`, host access only
  to `generativelanguage.googleapis.com`.
- Gemini (`gemini-3.7-flash`) is called from the service worker
  (`background.js`), which is stateless — the popup passes full context each
  time, so MV3 worker teardown never loses anything.
- The key is read from `env.js` via `fetch()` + regex because MV3 service
  workers can't `import()` dynamically, and a static import of a gitignored
  file would break worker registration.
- Blip is a real 16×16 sprite (`sprite.js`), drawn on a canvas at integer
  scale with smoothing off — never blurred. All frames (breath, blink, hop,
  glance) are hand-placed pixels.
- Dark mode is the "backlight" build: deep navy screen, phosphor glow, same
  tomato shell.
- Icons are generated from the same sprite: `node scripts/make-icons.mjs`.

## Fonts

Bundled locally (no runtime requests): [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P)
and [VT323](https://fonts.google.com/specimen/VT323), both under the
[SIL Open Font License](https://openfontlicense.org/).
