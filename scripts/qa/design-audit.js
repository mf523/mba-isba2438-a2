const { execFile } = require("child_process");
const http = require("http");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let msgId = 0;
function send(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const on = (e) => { const m = JSON.parse(e.data); if (m.id === id) { ws.removeEventListener("message", on); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); } };
    ws.addEventListener("message", on);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evalJs(ws, expression) {
  const r = await send(ws, "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error("EVAL-FAILED: " + expression.slice(0, 100) + " ||| " + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
}
function getJSON(path) { return new Promise((res, rej) => { http.get(`http://127.0.0.1:9280${path}`, (r) => { let d=""; r.on("data",c=>d+=c); r.on("end",()=>res(JSON.parse(d))); }).on("error", rej); }); }
async function goto(ws, url) { await send(ws, "Page.navigate", { url }); await sleep(1400); }
function fill(ws, id, value) {
  return evalJs(ws, `(() => { const el = document.getElementById(${JSON.stringify(id)}); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set; s.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
}
const AUDIT = `(() => {
  function lum(c) {
    const m = c.match(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)\\)/);
    if (!m) return null;
    const f = (v) => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    return 0.2126*f(+m[1])+0.7152*f(+m[2])+0.0722*f(+m[3]);
  }
  function contrast(fg, bg) { const l1=lum(fg), l2=lum(bg); if(l1==null||l2==null) return null; return +(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)).toFixed(2)); }
  function probe(sel) {
    const el = document.querySelector(sel);
    if (!el) return { sel, missing: true };
    const cs = getComputedStyle(el);
    let chain = el, bgTop = "rgba(0,0,0,0)";
    while (chain) { const bg = getComputedStyle(chain).backgroundColor; if (bg && bg !== "rgba(0, 0, 0, 0)") { bgTop = bg; break; } chain = chain.parentElement; }
    const rect = el.getBoundingClientRect();
    return { sel, fg: cs.color, bg: bgTop, c: contrast(cs.color, bgTop), px: cs.fontSize, h: Math.round(rect.height), overflowX: document.documentElement.scrollWidth - window.innerWidth };
  }
  return [
    ".site-header a", ".brand-tagline", ".nav-list a",
    ".page-main h1", ".page-main h2", ".page-main > p",
    ".card h3", ".card p", ".card-meta", ".inline-link",
    ".submit-button", ".secondary-button", ".button-primary",
    ".brief-audience", ".brief-meta .tag", ".admin-badge", ".admin-nav a",
    ".admin-table th", ".field-error", ".form-feedback-success", ".form-feedback-error", ".card-cta",
  ].map(probe);
})()`;
(async () => {
  execFile("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ["--headless=new", "--remote-debugging-port=9280", "--user-data-dir=/tmp/qa-audit5",
     "--no-first-run", "--no-default-browser-check", "about:blank"], () => {});
  let targets = [];
  for (let i = 0; i < 40; i += 1) { try { targets = await getJSON("/json"); if (targets.length) break; } catch {} await sleep(300); }
  const page = targets.find((t) => t.type === "page");
  const ws = new global.WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.addEventListener("open", r)));
  await send(ws, "Page.enable");

  const base = "http://localhost:3100";
  for (const scheme of ["light", "dark"]) {
    await send(ws, "Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
    await send(ws, "Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await goto(ws, `${base}/`); await sleep(600);
    const home = await evalJs(ws, AUDIT);
    console.log(`===== ${scheme} /home`);
    for (const p of home) console.log(JSON.stringify(p));
    await goto(ws, `${base}/blogs`); await sleep(700);
    const blogs = await evalJs(ws, AUDIT);
    console.log(`===== ${scheme} /blogs (only new probes)`);
    for (const p of blogs) { if ([".submit-button", ".secondary-button", ".button-primary", ".brief-audience", ".brief-meta .tag", ".admin-badge", ".admin-nav a", ".admin-table th", ".field-error", ".form-feedback-success", ".form-feedback-error", ".card-cta"].includes(p.sel)) console.log(JSON.stringify(p)); }
  }
  const ts = await evalJs(ws, `(() => { const a = document.querySelector(".nav-list a"); const r = a.getBoundingClientRect(); return { navH: Math.round(r.height), navW: Math.round(r.width) }; })()`);
  console.log("desktop nav tap:", JSON.stringify(ts));
  await send(ws, "Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  for (const url of [`${base}/`, `${base}/projects`, `${base}/admin/site-config`]) {
    await goto(ws, url); await sleep(700);
    const r = await evalJs(ws, `({ ov: document.documentElement.scrollWidth - window.innerWidth, navH: Math.round(document.querySelector(".nav-list a")?.getBoundingClientRect().height ?? -1) })`);
    console.log(`MOBILE ${url}:`, JSON.stringify(r));
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
