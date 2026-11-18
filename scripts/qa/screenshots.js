const { execFile } = require("child_process");
const http = require("http");
const fs = require("fs");
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
  if (r.exceptionDetails) throw new Error("EVAL-FAILED: " + expression.slice(0, 100) + " ||| " + JSON.stringify(r.exceptionDetails).slice(0, 200));
  return r.result.value;
}
function getJSON(path) { return new Promise((res, rej) => { http.get(`http://127.0.0.1:9278${path}`, (r) => { let d=""; r.on("data",c=>d+=c); r.on("end",()=>res(JSON.parse(d))); }).on("error", rej); }); }
async function goto(ws, url) { await send(ws, "Page.navigate", { url }); await sleep(1500); }
async function shot(ws, name) {
  const r = await send(ws, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`/tmp/shots/${name}.png`, Buffer.from(r.data, "base64"));
  console.log("shot", name);
}
function fill(ws, id, value, tag = "HTMLInputElement") {
  return evalJs(ws, `(() => { const el = document.getElementById(${JSON.stringify(id)}); const s = Object.getOwnPropertyDescriptor(window.${tag}.prototype, "value").set; s.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
}
(async () => {
  fs.rmSync("/tmp/shots", { recursive: true, force: true });
  fs.mkdirSync("/tmp/shots");
  execFile("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ["--headless=new", "--remote-debugging-port=9278", "--user-data-dir=/tmp/qa-shots",
     "--no-first-run", "--no-default-browser-check", "about:blank"], () => {});
  let targets = [];
  for (let i = 0; i < 40; i += 1) { try { targets = await getJSON("/json"); if (targets.length) break; } catch {} await sleep(300); }
  let page = targets.find((t) => t.type === "page");
  const WebSocket = global.WebSocket;
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.addEventListener("open", r)));
  await send(ws, "Page.enable");
  await send(ws, "Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

  const base = "http://localhost:3100";
  await goto(ws, `${base}/`); await shot(ws, "01-home");
  await goto(ws, `${base}/about-me`); await shot(ws, "02-about");
  await goto(ws, `${base}/projects`); await shot(ws, "03-projects");
  await goto(ws, `${base}/projects/resume-site`); await shot(ws, "04-project-detail");
  await goto(ws, `${base}/blogs`); await sleep(800); await shot(ws, "05-blogs");
  await goto(ws, `${base}/blogs/building-this-portfolio`); await sleep(800); await shot(ws, "06-blog-detail");
  await goto(ws, `${base}/contact-me-server-form`); await shot(ws, "07-contact-server");
  await goto(ws, `${base}/contact-me`); await shot(ws, "08-contact-api");
  await goto(ws, `${base}/admin/login`); await shot(ws, "09-admin-login");

  await fill(ws, "password", "portfolio-admin");
  await evalJs(ws, `[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Sign in")?.click()`);
  await sleep(2500);

  await goto(ws, `${base}/admin/site-config`); await sleep(800); await shot(ws, "10-admin-site-config");
  await goto(ws, `${base}/admin/projects`); await sleep(800); await shot(ws, "11-admin-projects");
  await goto(ws, `${base}/admin/blogs`); await sleep(800); await shot(ws, "12-admin-blogs");
  await goto(ws, `${base}/admin/ideas`); await sleep(800); await shot(ws, "13-admin-ideas");
  await goto(ws, `${base}/admin/briefs`); await sleep(800); await shot(ws, "14-admin-briefs");
  await goto(ws, `${base}/admin/contacts`); await sleep(800); await shot(ws, "15-admin-contacts");
  await goto(ws, `${base}/admin/about-page`); await sleep(800); await shot(ws, "16-admin-about");

  await send(ws, "Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await goto(ws, `${base}/`); await shot(ws, "17-mobile-home");
  await goto(ws, `${base}/admin/projects`); await sleep(800); await shot(ws, "18-mobile-admin-projects");

  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
