// Records the investor demo: drives the portal with Playwright, draws a smooth
// cursor in the page, and captures 2x frames at known scroll positions.
//
//   node demo/tools/record.mjs <outDir> [timing.json]
//
// Everything runs SLOW times slower than real time (CSS animations through the
// CDP Animation domain, our cursor/scroll tweens through their durations) and
// the compositor speeds it back up, which turns ~15 captures a second into
// smooth 60 fps. timing.json ({ "1": 1.2, ... }) scales each scene's holds.
import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3200";
const DB = "postgresql://aalmaram:aalmaram@localhost:5433/aalmaram_e2e?schema=public";
const SLOW = Number(process.env.DEMO_SLOW ?? 4);
const VW = 1440;
const VH = 900;
const OUT = path.resolve(process.argv[2] ?? "demo/out/take");
const HOLD_SCALE = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], "utf8")) : {};

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "frames"), { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// A CDP call in flight when the page navigates can wait forever for a frame; give up instead.
const within = (p, ms, label) =>
  Promise.race([p, sleep(ms).then(() => Promise.reject(new Error(`timeout: ${label}`)))]);
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

// ---------------------------------------------------------------- data reset
console.log("[demo] resetting the demo database…");
execSync("node scripts/e2e-db.mjs", { env: { ...process.env, DATABASE_URL: DB }, stdio: "ignore" });
const prisma = new PrismaClient({ datasources: { db: { url: DB } } });
const rm = await prisma.user.findUniqueOrThrow({ where: { email: "rm@aalmaram.test" } });
const elena = await prisma.client.update({
  where: { email: "elena.fischer@example.com" },
  data: { relationshipManagerId: rm.id },
});
const elenaTrip = await prisma.trip.findFirstOrThrow({ where: { clientId: elena.id } });
const lab = await prisma.vendor.findFirstOrThrow({ where: { name: { startsWith: "Backwater Diagnostics" } } });
await prisma.$disconnect();

// ---------------------------------------------------------------- browser
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2 });
await context.addInitScript(({ slow }) => {
  const install = () => {
    if (document.getElementById("demo-cursor")) return;
    const style = document.createElement("style");
    style.textContent = `
      #demo-cursor { position: fixed; left: 0; top: 0; width: 26px; height: 34px; z-index: 2147483647; pointer-events: none;
        transform-origin: 3px 3px; filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.35)); will-change: transform; }
      #demo-cursor.press { animation: demo-press 0.28s ease-out; }
      @keyframes demo-press { 40% { scale: 0.82; } 100% { scale: 1; } }
      .demo-ripple { position: fixed; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; pointer-events: none;
        z-index: 2147483646; background: rgb(18 48 42 / 0.22); border: 2px solid rgb(18 48 42 / 0.35);
        animation: demo-ripple 0.55s ease-out forwards; }
      @keyframes demo-ripple { from { transform: scale(0.3); opacity: 1; } to { transform: scale(1.5); opacity: 0; } }`;
    document.documentElement.append(style);
    const cursor = document.createElement("div");
    cursor.id = "demo-cursor";
    cursor.innerHTML = `<svg viewBox="0 0 26 34" width="26" height="34"><path d="M3 3 L3 27 L9.2 20.8 L13.6 31 L18 29.2 L13.6 19 L22 19 Z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>`;
    document.documentElement.append(cursor);
  };
  window.__demoApply = (s) => {
    install();
    const c = document.getElementById("demo-cursor");
    c.style.transform = `translate(${s.x - 3}px, ${s.y - 3}px)`;
    if (s.scrollY !== undefined) window.scrollTo(0, s.scrollY);
    if (s.el) {
      const el = document.querySelector(s.el.sel);
      if (el) el.scrollTop = s.el.top;
    }
    return { sx: window.scrollX, sy: window.scrollY };
  };
  window.__demoClick = (x, y) => {
    const c = document.getElementById("demo-cursor");
    c.classList.remove("press");
    void c.offsetWidth;
    c.classList.add("press");
    const r = document.createElement("div");
    r.className = "demo-ripple";
    r.style.left = `${x}px`;
    r.style.top = `${y}px`;
    document.documentElement.append(r);
    setTimeout(() => r.remove(), 700 * slow);
  };
}, { slow: SLOW });

const page = await context.newPage();
page.setDefaultTimeout(20_000);
for (const ev of ["unhandledRejection", "uncaughtException"]) process.on(ev, (e) => {
  console.error("[demo] failed:", e);
  process.exit(1);
});
const cdp = await context.newCDPSession(page);
await cdp.send("Animation.enable");
const slowAnimations = () => cdp.send("Animation.setPlaybackRate", { playbackRate: 1 / SLOW }).catch(() => {});

// ---------------------------------------------------------------- setup (not recorded)
console.log("[demo] signing in…");
await page.goto(`${BASE}/login`);
await page.getByLabel("Email").fill("admin@aalmaram.test");
await page.getByLabel("Password").fill("Aalmaram!Demo1");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(/\/admin$/);
await page.goto(`${BASE}/admin/clients/${elena.id}`);
await page.getByRole("button", { name: /Send invitation/ }).click();
await page.waitForURL(/u=/);
const mail = fs.readFileSync(".mail.log", "utf8");
const invite = [...mail.matchAll(/http:\/\/localhost:3200\/trip\/access\/[A-Za-z0-9_-]+/g)].at(-1)[0];
await page.goto(invite);
await page.waitForURL(/\/trip$/);
await page.waitForLoadState("load");

// ---------------------------------------------------------------- state + capture
// scrollY / el are only set while a scroll tween runs; otherwise the page owns its scroll.
const state = { x: 1080, y: 620, scrollY: undefined, el: null };
const tweens = new Set();
const log = { slow: SLOW, viewport: [VW, VH], frames: [], events: [] };
let t0 = 0;
let frozen = true;
let capturing = false;
let clicking = false; // the loop leaves the mouse alone while a click is in progress
let lastHash = "";
const now = () => performance.now() - t0;
const event = (type, data = {}) => log.events.push({ type, t: now(), ...data });

function tween(apply, from, to, ms) {
  return new Promise((resolve) => {
    const start = now();
    tweens.add({ apply, from, to, start, dur: ms * SLOW, resolve });
  });
}

function stepTweens() {
  const t = now();
  for (const tw of tweens) {
    const k = Math.min(1, (t - tw.start) / tw.dur);
    tw.apply(tw.from, tw.to, ease(k));
    if (k >= 1) {
      tweens.delete(tw);
      tw.resolve();
    }
  }
}

const writes = [];
async function captureLoop() {
  let n = 0;
  while (capturing) {
    if (frozen) {
      await sleep(10);
      continue;
    }
    stepTweens();
    try {
      const at = await within(page.evaluate((s) => window.__demoApply(s), state), 2000, "apply");
      if (!clicking) await within(page.mouse.move(state.x, state.y), 1000, "mouse");
      const t1 = now();
      const { data } = await within(
        cdp.send("Page.captureScreenshot", {
          format: "jpeg",
          quality: 92,
          optimizeForSpeed: true,
          clip: { x: at.sx, y: at.sy, width: VW, height: VH, scale: 2 },
        }),
        3000,
        "capture",
      );
      const t = (t1 + now()) / 2;
      if (frozen) continue;
      const hash = crypto.createHash("md5").update(data).digest("hex");
      if (hash === lastHash) continue; // unchanged: the compositor repeats the previous frame
      lastHash = hash;
      const file = `${String(++n).padStart(6, "0")}.jpg`;
      writes.push(fs.promises.writeFile(path.join(OUT, "frames", file), Buffer.from(data, "base64")));
      log.frames.push({ file, t, cx: state.x, cy: state.y });
    } catch {
      await sleep(20); // a navigation tore the page down mid-call
    }
  }
}

// Hold the last frame while a new document loads, then cut to it cleanly.
let loading = null;
page.on("request", (req) => {
  if (req.isNavigationRequest() && req.frame() === page.mainFrame()) {
    frozen = true;
    loading ??= (async () => {
      const started = Date.now();
      // Wait for the new document to commit (the old one is still "complete" until then), then load.
      await page.waitForEvent("framenavigated", { predicate: (f) => f === page.mainFrame(), timeout: 15_000 }).catch(() => {});
      await page.waitForLoadState("load").catch(() => {});
      await within(page.waitForFunction(() => document.readyState === "complete" && document.fonts.status === "loaded", null, { polling: 50 }), 8000, "ready").catch((e) => console.log("  ", e.message));
      await within(slowAnimations(), 2000, "rate").catch(() => {});
      await sleep(350); // hydration, and effects such as scrolling to a just-added item
      console.log(`  loaded ${new URL(page.url()).pathname} in ${Date.now() - started} ms`);
      state.scrollY = undefined;
      state.el = null;
      frozen = false;
      loading = null;
    })();
  }
});
page.on("framenavigated", (frame) => {
  if (frame === page.mainFrame()) event("url", { url: frame.url() });
});
const settled = async () => {
  await sleep(30);
  while (loading) await loading;
};

// ---------------------------------------------------------------- choreography helpers
let scene = "0";
async function hold(base) {
  const ms = base * 1000 * SLOW * (HOLD_SCALE[scene] ?? 1);
  event("hold", { scene, ms });
  await sleep(ms);
}
const pause = (base) => sleep(base * 1000 * SLOW);

async function moveTo(target, { dx = 0.5, dy = 0.5, speed = 1 } = {}) {
  let x;
  let y;
  if (Array.isArray(target)) [x, y] = target;
  else {
    const box = await target.boundingBox();
    if (!box) throw new Error(`no box for ${target}`);
    x = box.x + box.width * dx;
    y = box.y + box.height * dy;
  }
  const from = { x: state.x, y: state.y };
  const dist = Math.hypot(x - from.x, y - from.y);
  const ms = Math.min(1100, Math.max(420, 300 + dist * 0.6)) / speed;
  // A slight arc reads as a hand moving, not a robot.
  const nx = -(y - from.y) / (dist || 1);
  const ny = (x - from.x) / (dist || 1);
  const bow = Math.min(60, dist * 0.08);
  event("move", { from, to: { x, y }, dur: ms * SLOW });
  await tween(
    (a, b, k) => {
      const arc = Math.sin(Math.PI * k) * bow;
      state.x = a.x + (b.x - a.x) * k + nx * arc;
      state.y = a.y + (b.y - a.y) * k + ny * arc;
    },
    from,
    { x, y },
    ms,
  );
}

async function click(target, opts) {
  console.log("  click", String(target).slice(0, 90));
  await moveTo(target, opts);
  await pause(0.12);
  event("click", { x: state.x, y: state.y });
  clicking = true;
  await page.evaluate(([x, y]) => window.__demoClick(x, y), [state.x, state.y]);
  await page.mouse.move(state.x, state.y);
  await page.mouse.down();
  await sleep(70 * SLOW);
  await page.mouse.up();
  clicking = false;
  await pause(0.15);
  await settled();
}

const currentScroll = () => page.evaluate(() => window.scrollY);

async function scrollTo(y, ms = 900) {
  const [from, max] = await page.evaluate(() => [window.scrollY, document.documentElement.scrollHeight - innerHeight]);
  const to = Math.max(0, Math.min(max, y));
  if (Math.abs(to - from) < 2) return;
  await tween((a, b, k) => (state.scrollY = a + (b - a) * k), from, to, ms);
  state.scrollY = undefined;
}

/** Scroll so the element's top sits `top` px below the viewport top. */
async function scrollToEl(locator, top = 110, ms = 900) {
  const box = await locator.boundingBox();
  await scrollTo((await currentScroll()) + box.y - top, ms);
}

async function scrollPanel(sel, by, ms = 900) {
  const from = await page.evaluate((s) => document.querySelector(s)?.scrollTop ?? 0, sel);
  const max = await page.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? el.scrollHeight - el.clientHeight : 0;
  }, sel);
  await tween((a, b, k) => (state.el = { sel, top: a + (b - a) * k }), from, Math.min(max, from + by), ms);
  state.el = null;
}

/** Camera for the compositor: zoom z towards a viewport point (or the cursor when no point). */
async function zoom(z, target, { dur = 0.9 } = {}) {
  let at = null;
  if (Array.isArray(target)) at = target;
  else if (target) {
    const b = await target.boundingBox();
    at = [b.x + b.width / 2, b.y + b.height / 2];
  }
  event("zoom", { z, at, dur });
}

async function type(locator, text) {
  await locator.pressSequentially(text, { delay: 75 * SLOW });
}

const nav = (name) => page.getByRole("navigation", { name: "Your trip" }).getByRole("link", { name, exact: true });
const sheet = () => page.getByRole("dialog");
const PANEL = "[role=dialog] .portal-panel";

// ---------------------------------------------------------------- start
await slowAnimations();
await page.evaluate((s) => window.__demoApply(s), state);
await page.mouse.move(state.x, state.y);
t0 = performance.now();
frozen = false;
capturing = true;
const loop = captureLoop();

async function begin(name) {
  scene = name;
  event("scene", { scene: name });
  console.log(`[demo] scene ${name}`);
}

// 1 · Welcome (reload so the page settles in on camera)
await begin("1");
await page.reload();
await settled();
await hold(2);
await moveTo(page.getByText(/^Hello, /), { dx: 0.2, dy: 0.6, speed: 0.7 });
await hold(5);
await moveTo([1010, 560], { speed: 0.6 });
await hold(5);

// 2 · My trip
await begin("2");
const next = page.getByRole("region", { name: "What happens next" });
await scrollToEl(next, 96, 1100);
await zoom(1.32, next);
await moveTo(next.locator("ol li").nth(0), { dx: 0.1, dy: 0.3 });
await hold(1.6);
await moveTo(next.locator("ol li").nth(4), { dx: 0.1, dy: 0.3, speed: 0.55 });
await hold(1.2);
await zoom(1);
await scrollToEl(page.getByRole("region", { name: "Arranged for you" }), 96, 1000);
await moveTo(page.getByRole("region", { name: "Arranged for you" }).getByRole("link").first(), { dx: 0.35 });
await hold(2.2);
await moveTo(page.getByRole("button", { name: /to get in touch/ }), { dx: 0.4 });
await zoom(1.3, page.getByRole("region", { name: "Your personal contact" }));
await hold(2.6);
await zoom(1);

// 3 · Day by day
await begin("3");
await scrollTo(0, 900);
await click(nav("Day by day"));
await hold(1);
await scrollToEl(page.locator("[id^=day-]").first(), 84, 900);
await click(page.getByRole("button", { name: /Comprehensive Blood Panel.*Open details/ }), { dx: 0.3 });
await sheet().waitFor();
await pause(0.5);
await zoom(1.28, [1150, 450]);
await hold(1.6);
await scrollPanel(PANEL, 330, 1300);
await hold(3.4);
await click(sheet().getByRole("button", { name: "Close" }));
await zoom(1);
await hold(0.6);

// 4 · Adding something
await begin("4");
const day4 = page.locator("[id^=day-]").nth(3);
await scrollToEl(day4, 120, 1000);
await click(day4.getByRole("button", { name: /^Add something to Day/ }));
await sheet().getByText("Ideas for this day").waitFor();
await pause(0.4);
await zoom(1.28, [1150, 470]);
await hold(1.2);
await click(sheet().getByRole("button", { name: /^Kathakali Performance/ }), { dx: 0.3 });
await hold(1.2);
await click(sheet().getByRole("button", { name: /^Evening/ }));
await hold(0.8);
await click(sheet().getByRole("button", { name: "Add to my trip" }));
await zoom(1);
await page.getByText("Just added").waitFor();
await pause(0.3);
const added = page.locator("li", { has: page.getByText("Just added") }).last();
await moveTo(added, { dx: 0.45 });
await zoom(1.35, added);
await hold(2.2);
await zoom(1);
await scrollTo(0, 1100);
const total = page.getByRole("region", { name: "Trip total" });
await moveTo(total, { dx: 0.3 });
await zoom(1.45, total);
await hold(2.4);
await zoom(1);

// 5 · Ask us: say what she enjoys, see ideas, and her personal contact is right there.
await begin("5");
await click(nav("Ask us"));
await hold(0.6);
const box = page.getByLabel("Your message");
await scrollToEl(box, 420, 900);
await click(box, { dx: 0.3 });
await zoom(1.3, box);
await type(box, "We'd love to see the backwaters");
await hold(0.3);
await click(page.getByRole("button", { name: "Send" }));
const ideas = page.getByRole("list", { name: "Ideas from the assistant" });
await ideas.waitFor();
await zoom(1);
await scrollToEl(ideas, 300, 1000);
await moveTo(ideas.locator("li").first(), { dx: 0.4, dy: 0.3 });
await hold(1.8);
await scrollTo(0, 1000);
await moveTo(page.getByRole("button", { name: /to get in touch/ }), { dx: 0.4 });
await zoom(1.3, page.getByRole("region", { name: "Your personal contact" }));
await hold(2);
await zoom(1);

// 6 · Review and confirm
await begin("6");
await click(nav("Day by day"));
await click(page.getByRole("link", { name: /Review and confirm/ }).first());
await page.getByRole("heading", { name: "Review your trip" }).waitFor();
await settled();
await hold(0.6);
const maxY = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
await scrollTo(maxY, 2000);
await click(page.getByRole("button", { name: "Yes, confirm my trip" }), { speed: 1.2 });
await hold(0.4);
const step = page.getByRole("region", { name: "What happens next" });
await scrollToEl(step, 96, 1000);
await moveTo(step.locator("ol li").nth(2), { dx: 0.1, dy: 0.3 });
await zoom(1.32, step);
await hold(2);
await zoom(1);

// 7 · Behind the scenes
await begin("7");
await page.goto(`${BASE}/admin/vendors/${lab.id}`);
await settled();
await hold(1.4);
await scrollTo(500, 1200);
await moveTo([620, 420], { speed: 0.8 });
await hold(1.2);
await scrollTo(1100, 1200);
await hold(1.2);
await page.goto(`${BASE}/admin/trips/${elenaTrip.id}`);
await settled();
const block = page.locator("article", { hasText: "Comprehensive Blood Panel" }).first();
await scrollToEl(block, 240, 1200);
const select = block.getByLabel("Booking");
await moveTo(select);
await zoom(1.4, block);
await pause(0.2);
await page.evaluate(([x, y]) => window.__demoClick(x, y), [state.x, state.y]);
await select.selectOption("CONFIRMED");
await hold(0.8);
await click(block.getByRole("button", { name: "Save" }));
await hold(0.6);
await zoom(1);
await page.goto(`${BASE}/trip/itinerary`);
await settled();
const row = page.getByRole("button", { name: /Comprehensive Blood Panel.*Open details/ });
await scrollToEl(row, 220, 900);
await moveTo(row, { dx: 0.75 });
await zoom(1.45, row);
await hold(3);
await zoom(1);

// 8 · Close
await begin("8");
await click(nav("My trip"));
await moveTo([1040, 560], { speed: 0.6 });
await hold(5);
event("end");

capturing = false;
await loop;
await Promise.all(writes);
fs.writeFileSync(path.join(OUT, "timeline.json"), JSON.stringify(log));
console.log(`[demo] ${log.frames.length} frames, ${(now() / SLOW / 1000).toFixed(1)} s of video → ${OUT}`);
await browser.close();
