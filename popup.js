// popup.js — the ritual.
// Open → Blip breathes for ~3s (nothing else appears) → HUD + one reflection →
// optionally one reply, one response → done. No history. Fresh moment every open.

import { FRAMES, drawFrame } from "./sprite.js";

const $ = (id) => document.getElementById(id);
const screen = $("screen");
const questBtn = $("quest");
const questText = $("questText");
const streakText = $("streakText");
const canvas = $("pet");
const dialog = $("dialog");
const dialogText = $("dialogText");
const cursor = $("cursor");
const entry = $("entry");
const entryLabel = $("entryLabel");
const entryInput = $("entryInput");
const fin = $("fin");

const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const SCALE = 7;
const SX = Math.floor((canvas.width - 16 * SCALE) / 2);
const SY = canvas.height - 16 * SCALE;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- palette (single source of truth: CSS variables) ---------- */

let palette = readPalette();
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n) => cs.getPropertyValue(n).trim();
  return { o: g("--px-o"), b: g("--px-b"), h: g("--px-h"), e: g("--px-e"), m: g("--px-m"), c: g("--px-c") };
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => (palette = readPalette()));

/* ---------- animation engine ---------- */

const BREATH_SEQ = [
  ["exhale", 550],
  ["normal", 450],
  ["inhale", 1250],
  ["normal", 450],
  ["exhale", 550],
]; // ≈3.25s — the pause IS the product
const HOP_SEQ = [
  ["exhale", 90, 0],
  ["happy", 80, -8],
  ["happy", 90, -14],
  ["happy", 120, -17],
  ["happy", 90, -13],
  ["happy", 80, -7],
  ["exhale", 110, 0],
  ["happy", 450, 0],
];

let mode = { name: "breath", t0: performance.now() };
let nextBlinkAt = 0;
let breathResolve;
const breathDone = new Promise((r) => (breathResolve = r));

function setMode(name) {
  mode = { name, t0: performance.now() };
}

function frameAt(now) {
  const t = now - mode.t0;
  switch (mode.name) {
    case "breath": {
      let acc = 0;
      for (const [f, d] of BREATH_SEQ) {
        acc += d;
        if (t < acc) return [f, 0];
      }
      breathResolve();
      setMode("idle");
      return ["normal", 0];
    }
    case "idle": {
      if (now < nextBlinkAt + 140 && now >= nextBlinkAt) return ["blink", bob(now)];
      if (now >= nextBlinkAt + 140) nextBlinkAt = now + 2400 + Math.random() * 3200;
      return ["normal", bob(now)];
    }
    case "think":
      return [t % 1500 < 700 ? "normal" : "inhale", 0];
    case "hop": {
      let acc = 0;
      for (const [f, d, dy] of HOP_SEQ) {
        acc += d;
        if (t < acc) return [f, dy];
      }
      setMode("idle");
      return ["normal", 0];
    }
    case "glance": {
      if (t < 2300) return ["glance", 0];
      setMode("idle");
      return ["normal", 0];
    }
  }
  return ["normal", 0];
}

const bob = (now) => (Math.floor(now / 850) % 2 ? 1 : 0);

function loop(now) {
  const [frame, dy] = frameAt(now);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawFrame(ctx, FRAMES[frame], SX, SY + dy, SCALE, palette);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function animForTag(tag) {
  if (tag === "CHEER") setMode("hop");
  else if (tag === "NOTICE") setMode("glance");
  else setMode("idle");
}

/* ---------- dialogue box typing ---------- */

let typeToken = 0;
let skipTyping = false;
dialog.addEventListener("click", () => (skipTyping = true));

async function say(text) {
  const my = ++typeToken;
  skipTyping = false;
  cursor.classList.remove("on");
  dialog.classList.toggle("small", text.length > 150);
  dialogText.textContent = "";
  for (const ch of text) {
    if (typeToken !== my) return;
    if (skipTyping) {
      dialogText.textContent = text;
      break;
    }
    dialogText.textContent += ch;
    await sleep(ch === " " ? 12 : 26);
  }
  if (typeToken === my) cursor.classList.add("on");
}

function startThinking() {
  const my = ++typeToken;
  cursor.classList.remove("on");
  dialog.classList.remove("small");
  dialogText.textContent = "";
  setMode("think");
  let n = 0;
  const iv = setInterval(() => {
    if (typeToken !== my) return clearInterval(iv);
    n = (n % 3) + 1;
    dialogText.textContent = "· ".repeat(n).trim();
  }, 350);
  return () => clearInterval(iv);
}

/* ---------- name-entry field ---------- */

let entryResolver = null;
entry.addEventListener("submit", (e) => {
  e.preventDefault();
  if (entryResolver) {
    const resolve = entryResolver;
    entryResolver = null;
    resolve(entryInput.value);
  }
});

function askEntry({ label, placeholder = "", maxLength = 80 }) {
  entryLabel.textContent = label;
  entryInput.value = "";
  entryInput.placeholder = placeholder;
  entryInput.maxLength = maxLength;
  entry.classList.remove("hidden");
  requestAnimationFrame(() => entryInput.focus());
  return new Promise((r) => (entryResolver = r));
}
const hideEntry = () => entry.classList.add("hidden");

/* ---------- storage / tab / background helpers ---------- */

const pad = (n) => String(n).padStart(2, "0");
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TODAY = localISO(new Date());
const YESTERDAY = localISO(new Date(Date.now() - 864e5));

function computeStreak(store) {
  if (store.lastCheckin === TODAY) return { streak: store.streak || 1, bumped: false };
  if (store.lastCheckin === YESTERDAY) return { streak: (store.streak || 0) + 1, bumped: true };
  return { streak: 1, bumped: true };
}

async function getTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return { title: "", domain: "" };
    let domain = "";
    try {
      const u = new URL(tab.url || "");
      domain = u.protocol === "chrome:" ? `chrome://${u.hostname}` : (u.hostname || "").replace(/^www\./, "");
    } catch {}
    return { title: tab.title || "", domain };
  } catch {
    return { title: "", domain: "" };
  }
}

function sendBg(msg, timeout = 15000) {
  return Promise.race([
    chrome.runtime.sendMessage(msg).catch(() => ({ ok: false, error: "internal" })),
    sleep(timeout).then(() => ({ ok: false, error: "timeout" })),
  ]);
}

function basePayload(intention, tab) {
  const d = new Date();
  return {
    kind: "reflect",
    timeStr: d.toLocaleString(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" }),
    intention,
    tabTitle: tab.title,
    tabDomain: tab.domain,
  };
}

/* ---------- blip's canned lines (only for setup + hiccups) ---------- */

const KEY_NOTE =
  "psst — i can't think without my brain chip. in the blip folder, copy env.example.js to env.js and paste a free gemini key from aistudio.google.com. then reload me at chrome://extensions.";

function errText(res) {
  switch (res?.error) {
    case "no_key":
      return KEY_NOTE;
    case "bad_key":
      return "hm — my brain chip won't accept that key. double-check env.js, then reload me from chrome://extensions.";
    case "rate_limit":
      return "whew, i'm thinking too fast (rate limit). give me a minute, then open me again.";
    case "network":
    case "timeout":
      return "…static. i couldn't reach my thoughts — check your connection and try me again.";
    default:
      return "my circuits fizzled for a second. the breath still counted, though — that part always works.";
  }
}

/* ---------- the ritual ---------- */

let flowDone = false;

async function runQuestSetup(oldQuest) {
  if (oldQuest) await say(`new day, new quest. yesterday: "${oldQuest.slice(0, 34)}". what's today's ONE thing?`);
  else await say("hi, i'm blip. what's the ONE thing you want to do today?");
  const typed = (await askEntry({
    label: "QUEST>",
    placeholder: oldQuest ? "enter = keep yesterday's" : "ship the landing page…",
    maxLength: 60,
  })).trim();
  hideEntry();
  const intention = typed || oldQuest || "just notice where the day goes";
  if (!typed && !oldQuest) await say("no quest? that works too. today's quest: just notice.");
  await chrome.storage.local.set({ intention, intentionDate: TODAY });
  questText.textContent = intention;
  setMode("hop");
  await sleep(700);
  return intention;
}

async function main() {
  const [store, tab, ping] = await Promise.all([
    chrome.storage.local.get(["intention", "intentionDate", "streak", "lastCheckin"]),
    getTab(),
    sendBg({ type: "ping" }, 4000),
  ]);
  const hasKey = !!ping?.hasKey;
  const questIsFresh = !!store.intention && store.intentionDate === TODAY;

  // prefetch the reflection while Blip breathes, so nothing stalls after
  let pending = null;
  if (hasKey && questIsFresh) pending = sendBg({ type: "chat", payload: basePayload(store.intention, tab) });

  await breathDone;

  const { streak, bumped } = computeStreak(store);
  chrome.storage.local.set({ streak, lastCheckin: TODAY });
  questText.textContent = questIsFresh ? store.intention : store.intention || "—";
  streakText.textContent = String(streak);
  screen.classList.remove("asleep");
  await sleep(400);
  if (bumped) {
    setMode("hop");
    await sleep(800);
  }

  let intention = store.intention;
  if (!questIsFresh) intention = await runQuestSetup(store.intention);

  if (!hasKey) {
    await say(KEY_NOTE);
    flowDone = true;
    return;
  }

  if (!pending) pending = sendBg({ type: "chat", payload: basePayload(intention, tab) });
  const settled = await Promise.race([pending, sleep(60).then(() => null)]);
  let res = settled;
  if (!res) {
    const stop = startThinking();
    res = await pending;
    stop();
  }

  if (!res.ok) {
    setMode("idle");
    await say(errText(res));
    flowDone = true;
    return;
  }

  animForTag(res.tag);
  await say(res.text);

  // one optional reply, one response, and the moment ends
  const reply = (await askEntry({ label: "SAY>", placeholder: "one line back?" })).trim();
  hideEntry();
  if (!reply) {
    finish();
    return;
  }
  const stop = startThinking();
  const res2 = await sendBg({
    type: "chat",
    payload: { ...basePayload(intention, tab), kind: "reply", reflection: `[${res.tag}] ${res.text}`, reply },
  });
  stop();
  if (res2.ok) {
    animForTag(res2.tag);
    await say(res2.text);
  } else {
    setMode("idle");
    await say(errText(res2));
  }
  finish();
}

function finish() {
  fin.classList.remove("hidden");
  flowDone = true;
}

/* quest is editable once the moment has played out */
questBtn.addEventListener("click", async () => {
  if (!flowDone) return;
  flowDone = false;
  fin.classList.add("hidden");
  await say("rewrite the quest? type it below. (enter = keep as is)");
  const typed = (await askEntry({ label: "QUEST>", placeholder: questText.textContent, maxLength: 60 })).trim();
  hideEntry();
  if (typed) {
    await chrome.storage.local.set({ intention: typed, intentionDate: TODAY });
    questText.textContent = typed;
    setMode("hop");
    await say(`quest updated: ${typed}`);
  } else {
    await say("keeping it. back to the day.");
  }
  finish();
});

main();
