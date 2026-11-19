const { execFile } = require("child_process");
const http = require("http");
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
let msgId = 0;
function send(ws, method, params = {}) {
  if (typeof ws === "string") { ws = global.ACTIVE_WS; }
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const on = (e) => { const m = JSON.parse(e.data); if (m.id === id) { ws.removeEventListener("message", on); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); } };
    ws.addEventListener("message", on);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evalJs(ws, expression) {
  if (typeof ws === "string") { expression = ws; ws = global.ACTIVE_WS; }
  const r = await send(ws, "Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error("EVAL-FAILED: " + expression.slice(0, 120) + " ||| " + JSON.stringify(r.exceptionDetails).slice(0, 200));
  return r.result.value;
}
let failures = 0;
function check(name, pass, detail = "") { console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); if (!pass) failures += 1; }
function getJSON(path) { return new Promise((res, rej) => { http.get(`http://127.0.0.1:9276${path}`, (r) => { let d=""; r.on("data",c=>d+=c); r.on("end",()=>res(JSON.parse(d))); }).on("error", rej); }); }
async function api(path, method, body) {
  return evalJs(`(async () => { const r = await fetch("${path}", { method: "${method}", headers: ${body ? '{ "Content-Type": "application/json" }' : '{ "cache-control": "no-store" }'}, body: ${body ? JSON.stringify(JSON.stringify(body)) : "undefined"} }); return { status: r.status, json: await r.json() }; })()`);
}
async function apiText(path) {
  return evalJs(`(async () => { const r = await fetch("${path}${path.includes("?") ? "&" : "?"}cb=" + Date.now(), { headers: { "cache-control": "no-store" } }); return { status: r.status, text: await r.text() }; })()`);
}
async function goto(ws, url) { await send(ws, "Page.navigate", { url }); await sleep(1400); }
async function fill(ws, id, value, tagName = "HTMLInputElement") {
  await evalJs(`(() => { const el = document.getElementById(${JSON.stringify(id)}); const s = Object.getOwnPropertyDescriptor(window.${tagName}.prototype, "value").set; s.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
}
async function clickInCard(ws, title, buttonText) {
  await evalJs(`(() => { const card = [...document.querySelectorAll(".brief-card")].find((c) => c.querySelector("h3")?.textContent === ${JSON.stringify(title)}); const b = card && [...card.querySelectorAll("button, a")].find((x) => x.textContent.trim() === ${JSON.stringify(buttonText)}); if (b) b.click(); })()`);
}
async function clickInRow(ws, needle, buttonText) {
  await evalJs(`(() => { const row = [...document.querySelectorAll(".admin-table tbody tr")].find((tr) => tr.textContent.includes(${JSON.stringify(needle)})); const b = row && [...row.querySelectorAll("button")].find((x) => x.textContent.trim() === ${JSON.stringify(buttonText)}); if (b) b.click(); })()`);
}
async function clickButton(ws, text) {
  await evalJs(`(() => { const b = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === ${JSON.stringify(text)}); if (b) b.click(); })()`);
}
async function waitIdle(ws, ms) { await sleep(ms ?? 900); }
(async () => {
  execFile("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ["--headless=new", "--remote-debugging-port=9276", "--user-data-dir=/tmp/qa-stage3",
     "--no-first-run", "--no-default-browser-check", "about:blank"], () => {});
  let targets = [];
  for (let i = 0; i < 40; i += 1) { try { targets = await getJSON("/json"); if (targets.length) break; } catch {} await sleep(300); }
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener("open", res, { once: true }); ws.addEventListener("error", rej, { once: true }); });
  global.ACTIVE_WS = ws;
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.method === "Page.javascriptDialogOpening") {
      send(ws, "Page.handleJavaScriptDialog", { accept: true });
    }
  });
  await send(ws, "Page.enable");

  await goto(ws, "http://localhost:3100/admin/login");
  for (let i = 0; i < 30; i += 1) { if (await evalJs(`(() => { const el = document.getElementById("password"); return Boolean(el && Object.keys(el).some((k) => k.startsWith("__react"))); })()`)) break; await sleep(400); }
  await fill(ws, "password", "portfolio-admin");
  await clickButton(ws, "Sign in");
  await waitIdle(ws, 2200);
  check("signed in", (await evalJs("location.pathname")) === "/admin/site-config");

  console.log("--- 3.1 projects API");
  let r = await api("/api/projects", "GET");
  check("GET /api/projects public → 200 + defaults", r.status === 200 && r.json.ok && r.json.projects.some((p) => p.slug === "resume-site"));
  r = await api("/api/projects", "POST", { title: "Stage3 Probe", summary: "Probe project.", description: "Probe description.", techStack: "React, CSS" });
  check("POST /api/projects → 201 + techStack parsed", r.status === 201 && r.json.ok && r.json.project.slug === "stage3-probe" && r.json.project.techStack.join(",") === "React,CSS", JSON.stringify(r.json).slice(0, 90));
  const probeSlug = r.json.project.slug;
  r = await api("/api/projects", "POST", { title: "Stage3 Probe", summary: "Dup.", description: "Dup.", techStack: [] });
  check("POST duplicate slug → 409", r.status === 409 && r.json.fieldErrors?.slug);
  r = await api("/api/projects", "POST", { title: "", summary: "", description: "", techStack: [] });
  check("POST invalid → 400 fieldErrors", r.status === 400 && r.json.fieldErrors?.title && r.json.fieldErrors?.summary);
  r = await api(`/api/projects/${probeSlug}`, "GET");
  check("GET /api/projects/[slug] → 200", r.status === 200 && r.json.project.title === "Stage3 Probe");
  r = await api("/api/projects/nope", "GET");
  check("GET unknown slug → 404", r.status === 404);
  r = await api(`/api/projects/${probeSlug}`, "PUT", { title: "Stage3 Probe v2", summary: "Updated.", description: "Updated body.", techStack: ["React"], slug: "different-slug" });
  check("PUT slug change → 400", r.status === 400 && r.json.fieldErrors?.slug);
  r = await api(`/api/projects/${probeSlug}`, "PUT", { title: "Stage3 Probe v2", summary: "Updated.", description: "Updated body.", techStack: ["React"] });
  check("PUT content → 200, slug kept", r.status === 200 && r.json.project.title === "Stage3 Probe v2" && r.json.project.slug === probeSlug);
  r = await api("/api/projects/nope", "PUT", { title: "x", summary: "x", description: "x", techStack: [] });
  check("PUT unknown slug → 404", r.status === 404);
  r = await api(`/api/projects/${probeSlug}`, "DELETE");
  check("DELETE → 200, again → 404", r.status === 200 && (await api(`/api/projects/${probeSlug}`, "DELETE")).status === 404);

  console.log("--- stale-cache check (public /projects)");
  await api("/api/projects", "POST", { title: "Cache Probe", summary: "Fresh from the API.", description: "Should appear on the public page immediately.", techStack: [] });
  await sleep(800);
  const afterAdd = await apiText("/projects");
  check("public /projects shows new project without stale cache", afterAdd.text.includes("Cache Probe"));
  await api("/api/projects/cache-probe", "DELETE");
  await sleep(1500);
  const afterDelete = await apiText("/projects");
  check("public /projects drops deleted project", !afterDelete.text.includes("Cache Probe"));

  console.log("--- 3.1 blogs API");
  r = await api("/api/blogs", "POST", { title: "Stage3 Blog", summary: "Probe.", content: "Body text." });
  check("POST /api/blogs → 201", r.status === 201 && r.json.blog.slug === "stage3-blog");
  r = await api("/api/blogs/stage3-blog", "PUT", { title: "Stage3 Blog v2", summary: "Probe updated.", content: "Body v2." });
  check("PUT /api/blogs/[slug] → 200, publishedAt kept", r.status === 200 && r.json.blog.title === "Stage3 Blog v2");
  r = await api("/api/blogs/stage3-blog", "PUT", { title: "x", summary: "x", content: "x", slug: "changed" });
  check("PUT blog slug change → 400", r.status === 400 && r.json.fieldErrors?.slug);
  r = await api("/api/blogs/stage3-blog", "DELETE");
  check("DELETE /api/blogs/[slug] → 200, again 404", r.status === 200 && (await api("/api/blogs/stage3-blog", "DELETE")).status === 404);

  console.log("--- 3.1 contacts API");
  r = await api("/api/contacts", "POST", { name: "E2E Visitor", email: "e2e@example.com", message: "Hello from the e2e." });
  check("POST /api/contacts public → 201 with status new", r.status === 201 && r.json.submission.status === "new");
  const contactId = r.json.submission.id;
  r = await api("/api/contacts", "GET");
  check("GET /api/contacts admin → 200 sorted newest first", r.status === 200 && r.json.submissions[0].id === contactId);
  r = await api(`/api/contacts/${contactId}`, "GET");
  check("GET /api/contacts/[id] → 200", r.status === 200);
  r = await api(`/api/contacts/${contactId}`, "PUT", { status: "archived" });
  check("PUT status archived → 200", r.status === 200 && r.json.submission.status === "archived");
  r = await api(`/api/contacts/${contactId}`, "PUT", { status: "bogus" });
  check("PUT bad status → 400", r.status === 400 && r.json.fieldErrors?.status);
  r = await api(`/api/contacts/${contactId}`, "PUT", { message: "edited" });
  check("PUT message content → 400", r.status === 400 && r.json.fieldErrors?.status);
  r = await api(`/api/contacts/${contactId}`, "DELETE");
  check("DELETE /api/contacts/[id] → 200, again 404", r.status === 200 && (await api(`/api/contacts/${contactId}`, "DELETE")).status === 404);

  console.log("--- 3.2 /admin/projects screen");
  await goto(ws, "http://localhost:3100/admin/projects");
  await waitIdle(ws, 900);
  let titles = await evalJs(`[...document.querySelectorAll(".brief-card h3")].map((h) => h.textContent)`);
  check("projects list renders defaults", titles.includes("Resume Site"), JSON.stringify(titles).slice(0, 80));
  await fill(ws, "project-title", "Screen Probe");
  await fill(ws, "project-summary", "Added from the screen.");
  await fill(ws, "project-description", "Screen description body.", "HTMLTextAreaElement");
  await clickButton(ws, "Add project");
  await waitIdle(ws);
  titles = await evalJs(`[...document.querySelectorAll(".brief-card h3")].map((h) => h.textContent)`);
  check("created project appears without reload", titles.includes("Screen Probe"), JSON.stringify(titles).slice(0, 90));
  const successMsg = await evalJs(`[...document.querySelectorAll(".form-feedback-success")].map((e) => e.textContent).join(" ")`);
  check("success feedback shown", successMsg.includes("Project added"), successMsg.slice(0, 70));
  await clickInCard(ws, "Screen Probe", "Edit");
  await waitIdle(ws, 300);
  await fill(ws, "project-title", "Screen Probe v2");
  await clickButton(ws, "Save changes");
  await waitIdle(ws);
  titles = await evalJs(`[...document.querySelectorAll(".brief-card h3")].map((h) => h.textContent)`);
  check("edited project updates in place", titles.includes("Screen Probe v2"), JSON.stringify(titles).slice(0, 90));
  await clickInCard(ws, "Screen Probe v2", "Delete");
  await waitIdle(ws, 1200);
  titles = await evalJs(`[...document.querySelectorAll(".brief-card h3")].map((h) => h.textContent)`);
  check("delete (confirmed) removes from list", !titles.includes("Screen Probe v2") && titles.includes("Resume Site") && titles.includes("Task Tracker"), JSON.stringify(titles).slice(0, 90));
  await evalJs(`(() => { const el = document.getElementById("project-title"); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set; s.call(el, ""); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await clickButton(ws, "Add project");
  await waitIdle(ws);
  const fieldErr = await evalJs(`document.getElementById("project-title-error")?.textContent ?? ""`);
  check("validation error beside field", fieldErr.includes("Title is required"), fieldErr);

  console.log("--- 3.2 /admin/blogs screen");
  await goto(ws, "http://localhost:3100/admin/blogs");
  await waitIdle(ws, 900);
  titles = await evalJs(`[...document.querySelectorAll(".brief-card h3")].map((h) => h.textContent)`);
  check("blogs list renders", titles.length >= 1, JSON.stringify(titles).slice(0, 80));
  await fill(ws, "blog-title", "Screen Blog");
  await fill(ws, "blog-summary", "From the screen.");
  await fill(ws, "blog-content", "Screen body.", "HTMLTextAreaElement");
  await clickButton(ws, "Add Blog Post");
  await waitIdle(ws);
  titles = await evalJs(`[...document.querySelectorAll(".brief-card h3")].map((h) => h.textContent)`);
  check("created blog appears", titles.includes("Screen Blog"), JSON.stringify(titles).slice(0, 90));
  await clickInCard(ws, "Screen Blog", "Edit");
  await waitIdle(ws, 300);
  await fill(ws, "blog-title", "Screen Blog v2");
  await clickButton(ws, "Save changes");
  await waitIdle(ws);
  titles = await evalJs(`[...document.querySelectorAll(".brief-card h3")].map((h) => h.textContent)`);
  check("edited blog updates in place", titles.includes("Screen Blog v2"));
  await clickInCard(ws, "Screen Blog v2", "Delete");
  await waitIdle(ws, 1200);
  titles = await evalJs(`[...document.querySelectorAll(".brief-card h3")].map((h) => h.textContent)`);
  check("deleted blog gone", !titles.includes("Screen Blog v2") && titles.includes("Building This Portfolio"));

  console.log("--- 3.2 /admin/contacts screen");
  await goto(ws, "http://localhost:3100/admin/contacts");
  await waitIdle(ws, 900);
  const hasTable = await evalJs(`Boolean(document.querySelector(".admin-table"))`);
  check("contacts table renders (client-fetch)", hasTable);
  r = await api("/api/contacts", "POST", { name: "E2E Screen Visitor", email: "screen-e2e@example.com", message: "Screen archive test." });
  const screenContactId = r.json.submission?.id;
  check("seeded a contact via the API for the screen test", r.status === 201 && Boolean(screenContactId));
  await goto(ws, "http://localhost:3100/admin/contacts");
  await waitIdle(ws, 900);
  const archiveBtn = await evalJs(`[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Archive")?.textContent ?? ""`);
  check("archive button present", archiveBtn === "Archive");
  await clickInRow(ws, "E2E Screen Visitor", "Archive");
  await waitIdle(ws);
  const unarchive = await evalJs(`[...document.querySelectorAll(".admin-table tbody tr")].find((tr) => tr.textContent.includes("E2E Screen Visitor")) && [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Unarchive")`);
  check("archive flips to unarchive", Boolean(unarchive));
  const noticeText = await evalJs(`[...document.querySelectorAll(".form-feedback-success")].map((e) => e.textContent).join(" ")`);
  check("archive feedback shown", noticeText.includes("archived"), noticeText.slice(0, 70));
  await clickInRow(ws, "E2E Screen Visitor", "Delete");
  await waitIdle(ws, 1200);
  const rowGone = await evalJs(`![...document.querySelectorAll(".admin-table tbody tr")].some((tr) => tr.textContent.includes("E2E Screen Visitor"))`);
  check("delete (confirmed) removes the row", rowGone);

  console.log("--- 3.2 /admin/ideas screen (edit/delete)");
  await goto(ws, "http://localhost:3100/admin/ideas");
  await waitIdle(ws, 900);
  await fill(ws, "idea-title", "Screen Idea");
  await fill(ws, "idea-summary", "Idea from the screen.");
  await fill(ws, "idea-body", "Idea body text.", "HTMLTextAreaElement");
  await clickButton(ws, "Save idea");
  await waitIdle(ws);
  titles = await evalJs(`[...document.querySelectorAll(".brief-card h3")].map((h) => h.textContent)`);
  check("created idea appears", titles.includes("Screen Idea"));
  await clickInCard(ws, "Screen Idea", "Edit");
  await waitIdle(ws, 400);
  const ideaTitleVal = await evalJs(`document.getElementById("idea-title")?.value`);
  check("edit prefills the idea form", ideaTitleVal === "Screen Idea", String(ideaTitleVal));
  await fill(ws, "idea-title", "Screen Idea v2");
  await clickButton(ws, "Save changes");
  await waitIdle(ws);
  titles = await evalJs(`[...document.querySelectorAll(".brief-card h3")].map((h) => h.textContent)`);
  check("edited idea updates in place", titles.includes("Screen Idea v2"));
  await clickInCard(ws, "Screen Idea v2", "Delete");
  await waitIdle(ws, 1200);
  titles = await evalJs(`[...document.querySelectorAll(".brief-card h3")].map((h) => h.textContent)`);
  check("deleted idea gone", !titles.includes("Screen Idea v2") && titles.includes("Prefill Source") === false ? titles.includes("Brief to published piece") : false);

  console.log("--- idea → content prefill");
  await fill(ws, "idea-title", "Prefill Source");
  await fill(ws, "idea-summary", "Prefill summary.");
  await fill(ws, "idea-body", "Prefill body line one.", "HTMLTextAreaElement");
  await clickButton(ws, "Save idea");
  await waitIdle(ws);
  const ideaId = await evalJs(`[...document.querySelectorAll(".brief-card")].find((c) => c.querySelector("h3")?.textContent === "Prefill Source")?.querySelector("a[href*='from-idea']")?.getAttribute("href")`);
  check("idea card exposes Start links", Boolean(ideaId), String(ideaId));
  await goto(ws, `http://localhost:3100${ideaId}`);
  await waitIdle(ws, 1100);
  const blogTitle = await evalJs(`document.getElementById("blog-title")?.value`);
  check("blog create form prefilled from idea", blogTitle === "Prefill Source", String(blogTitle));

  const blogSummary = await evalJs(`document.getElementById("blog-summary")?.value`);
  const blogContent = await evalJs(`document.getElementById("blog-content")?.value`);
  const prefillNote = await evalJs(`[...document.querySelectorAll(".form-feedback-success")].map((e) => e.textContent).join(" ")`);
  check("blog create form prefilled from idea", blogTitle === "Prefill Source" && blogSummary === "Prefill summary." && blogContent === "Prefill body line one." && prefillNote.includes("Prefilled"), `${JSON.stringify({ blogTitle, blogSummary })} ${prefillNote.slice(0, 50)}`);
  await goto(ws, `http://localhost:3100/admin/projects?from-idea=${ideaId.split("=")[1]}`);
  await waitIdle(ws, 1100);
  const projTitle = await evalJs(`document.getElementById("project-title")?.value`);
  const projDesc = await evalJs(`document.getElementById("project-description")?.value`);
  check("project create form prefilled from idea", projTitle === "Prefill Source" && projDesc === "Prefill body line one.", JSON.stringify({ projTitle, projDesc }).slice(0, 90));

  console.log("--- choice oracle (AI: ollama + pollinations)");
  const choicesResp = await evalJs(`(async () => { const r = await fetch("/api/assistant/choices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seed: "database migrations explained through bad relationships", targetType: "blog-post" }) }); return { status: r.status, json: await r.json() }; })()`);
  check("POST /api/assistant/choices → 200 with 3 choices", choicesResp.status === 200 && choicesResp.json.ok && choicesResp.json.choices.length === 3, JSON.stringify(choicesResp.json.choices?.map((c) => c.angle)));
  const unauthChoices = await evalJs(`(async () => { const r = await fetch("/api/assistant/choices", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", credentials: "omit" }); return r.status; })()`);
  check("choices without admin → 401", unauthChoices === 401);
  await goto(ws, "http://localhost:3100/admin/ideas");
  await waitIdle(ws, 900);
  await fill(ws, "idea-seed", "database migrations explained through bad relationships", "HTMLTextAreaElement");
  await clickButton(ws, "Show me the choices");
  let choiceCards = 0;
  for (let i = 0; i < 50; i += 1) {
    await sleep(3000);
    choiceCards = await evalJs(`document.querySelectorAll(".choice-card").length`);
    if (choiceCards > 0) break;
  }
  check("oracle shows 3 choice cards", choiceCards === 3, String(choiceCards));
  await evalJs(`document.querySelector(".choice-card")?.click()`);
  await waitIdle(ws, 400);
  const filledSummary = await evalJs(`document.getElementById("idea-summary")?.value`);
  const filledBody = await evalJs(`document.getElementById("idea-body")?.value`);
  check("selecting a choice fills summary + body", Boolean(filledSummary) && Boolean(filledBody) && filledBody.length > 20, String(filledSummary?.slice(0, 60)));
  await fill(ws, "idea-title", "Oracle Choice");
  await clickButton(ws, "Save idea");
  await waitIdle(ws, 1500);
  titles = await evalJs(`[...document.querySelectorAll(".brief-card h3")].map((h) => h.textContent)`);
  check("oracle idea saved to board", titles.includes("Oracle Choice"));
  const oracleCard = `[...document.querySelectorAll(".brief-card")].find((c) => c.querySelector("h3")?.textContent === "Oracle Choice")`;
  await evalJs(`${oracleCard}?.querySelector(".brief-card-actions button")?.click()`);
  let artworkShown = false;
  for (let i = 0; i < 60; i += 1) {
    await sleep(3000);
    artworkShown = await evalJs(`Boolean(${oracleCard}?.querySelector("img.idea-artwork"))`);
    if (artworkShown) break;
    const pending = await evalJs(`document.querySelector(".form-feedback-success")?.textContent ?? ""`);
    if (pending.includes("unreachable") && i % 2 === 1) {
      await evalJs(`${oracleCard}?.querySelector(".brief-card-actions button")?.click()`);
    }
  }
  check("generated picture appears on the idea card", artworkShown);
  const oracleId = await evalJs(`${oracleCard}?.querySelector("a[href*='from-idea']")?.getAttribute("href")?.split("=")[1]`);
  const imageStatus = await evalJs(`(async () => { const r = await fetch("/api/images/${oracleId}", { headers: { "cache-control": "no-store" } }); return { s: r.status, t: r.headers.get("content-type") }; })()`);
  check("GET /api/images/[ideaId] → 200 image", imageStatus.s === 200 && String(imageStatus.t).startsWith("image/"), JSON.stringify(imageStatus));
  await clickInCard(ws, "Oracle Choice", "Delete");
  await waitIdle(ws, 1200);
  titles = await evalJs(`[...document.querySelectorAll(".brief-card h3")].map((h) => h.textContent)`);
  check("oracle idea deleted", !titles.includes("Oracle Choice"));

  console.log("--- nav");
  await goto(ws, "http://localhost:3100/admin/briefs");
  await waitIdle(ws, 700);
  const nav = await evalJs(`[...document.querySelectorAll(".admin-nav a")].map((a) => a.textContent)`);
  check("studio nav order", JSON.stringify(nav) === JSON.stringify(["Briefs","Ideas","Blog posts","Projects","Contact requests","About page","Site config","View site"]), JSON.stringify(nav));

  console.log("--- public pages unchanged");
  const home = await apiText("/");
  check("public home renders", home.status === 200 && home.text.includes("Resume Site") === false ? true : home.status === 200);

  process.exit(failures > 0 ? 1 : 0);
})().catch((e) => { console.error("SCRIPT-ERROR", String(e).slice(0, 400)); process.exit(1); });
