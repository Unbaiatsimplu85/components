import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ════════════════════════════════════════════════════
   FIREBASE
   ════════════════════════════════════════════════════ */
const fbApp = initializeApp(FIREBASE_CONFIG);
const auth  = getAuth(fbApp);

/* ════════════════════════════════════════════════════
   MONGODB DATA API
   ════════════════════════════════════════════════════ */
const MONGO_BASE =
  `https://data.mongodb-api.com/app/${MONGO_CONFIG.appId}/endpoint/data/v1/action`;

async function mongoCall(action, body) {
  const res = await fetch(`${MONGO_BASE}/${action}`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key":      MONGO_CONFIG.apiKey
    },
    body: JSON.stringify({
      dataSource: MONGO_CONFIG.dataSource,
      database:   MONGO_CONFIG.database,
      collection: MONGO_CONFIG.collection,
      ...body
    })
  });
  if (!res.ok) throw new Error(`MongoDB error ${res.status}`);
  return res.json();
}

/* ════════════════════════════════════════════════════
   WAKE-UP ENGINE
   ════════════════════════════════════════════════════ */
// r=85 → circumference = 2π×85 ≈ 534
const CIRC = 2 * Math.PI * 85;

const wuScreen    = document.getElementById("wakeup-screen");
const wuArc       = document.getElementById("wu-arc");        // SVG element!
const wuNum       = document.getElementById("wu-num");
const wuSecLabel  = document.getElementById("wu-sec-label");
const wuLog       = document.getElementById("wu-log");
const wuCountArea = document.getElementById("wu-counting-area");
const wuTimeoutEl = document.getElementById("wu-timeout");
const wuReady     = document.getElementById("wu-ready");

let secondsLeft  = WAKEUP_SECONDS;
let tickTimer    = null;
let pingTimer    = null;
let isRunning    = false;
let serverAlive  = false;
let pingAttempt  = 0;

/* SVG elements MUST use setAttribute instead of .className = */
function arcSetClass(cls) {
  wuArc.setAttribute("class", cls);
}

function setArc(ratio) {
  wuArc.style.strokeDasharray  = CIRC;
  wuArc.style.strokeDashoffset = CIRC * (1 - ratio);
}

function logRow(text, status /* pending | ok | fail */) {
  // Keep max 3 rows
  while (wuLog.children.length >= 3) {
    wuLog.removeChild(wuLog.firstChild);
  }
  const row = document.createElement("div");
  row.className = "wu-log-row";
  row.innerHTML = `<div class="wu-dot ${status}"></div><span>${esc(text)}</span>`;
  wuLog.appendChild(row);
  return row.querySelector(".wu-dot");
}

async function ping(attempt) {
  const dot = logRow(`Verificare #${attempt} (${WAKEUP_SECONDS - secondsLeft}s scurse)`, "pending");
  try {
    const res = await fetch(`${RENDER_URL}/health`, {
      method: "GET",
      cache:  "no-store",
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      dot.className = "wu-dot ok";
      dot.parentElement.querySelector("span").textContent = "✓ Server activ!";
      onServerReady();
    } else {
      dot.className = "wu-dot fail";
      dot.parentElement.querySelector("span").textContent =
        `Răspuns ${res.status} — mai așteptăm...`;
    }
  } catch {
    dot.className = "wu-dot fail";
    dot.parentElement.querySelector("span").textContent =
      "Fără răspuns — mai așteptăm...";
  }
}

function onServerReady() {
  if (serverAlive) return;
  serverAlive = true;
  stopTimers();

  // Arc → green  (SVG: must use setAttribute!)
  setArc(1);
  arcSetClass("wu-ring-fg done");

  // Number → green checkmark
  wuNum.classList.add("done");
  wuNum.textContent = "✓";
  wuSecLabel.style.display = "none";

  wuReady.classList.add("visible");

  setTimeout(() => {
    wuScreen.classList.remove("visible");
    showPage("user");
  }, 1300);
}

function onTimeout() {
  stopTimers();
  wuCountArea.style.display = "none";
  wuTimeoutEl.classList.add("visible");
}

function stopTimers() {
  clearInterval(tickTimer);
  clearInterval(pingTimer);
  isRunning = false;
}

function startWakeup() {
  if (isRunning) return;
  isRunning   = true;
  serverAlive = false;
  secondsLeft = WAKEUP_SECONDS;
  pingAttempt = 0;

  // Reset UI
  wuCountArea.style.display = "block";
  wuTimeoutEl.classList.remove("visible");
  wuReady.classList.remove("visible");
  wuLog.innerHTML        = "";
  wuNum.textContent      = secondsLeft;
  wuNum.className        = "wu-num";           // plain HTML element — ok
  wuSecLabel.style.display = "";
  arcSetClass("wu-ring-fg");                   // SVG element — use setAttribute
  setArc(1);

  wuScreen.classList.add("visible");

  // First ping immediately
  pingAttempt++;
  ping(pingAttempt);

  // Countdown tick
  tickTimer = setInterval(() => {
    secondsLeft--;
    wuNum.textContent = secondsLeft;
    setArc(secondsLeft / WAKEUP_SECONDS);

    if (secondsLeft <= 15) {
      arcSetClass("wu-ring-fg warn");
      wuNum.classList.add("warn");
    } else {
      arcSetClass("wu-ring-fg");
      wuNum.classList.remove("warn");
    }

    if (secondsLeft <= 0) {
      clearInterval(tickTimer);
      if (!serverAlive) onTimeout();
    }
  }, 1000);

  // Ping every N seconds
  pingTimer = setInterval(() => {
    if (!serverAlive && secondsLeft > 0) {
      pingAttempt++;
      ping(pingAttempt);
    }
  }, PING_INTERVAL_S * 1000);
}

// Retry button
document.getElementById("wu-retry").addEventListener("click", () => {
  stopTimers();
  startWakeup();
});

/* ════════════════════════════════════════════════════
   ROUTER
   ════════════════════════════════════════════════════ */
let currentUser = null;

function showPage(name) {
  document.querySelectorAll(".page, .login-shell").forEach(el => {
    el.classList.remove("active");
  });
  const el = document.getElementById(`page-${name}`);
  if (el) el.classList.add("active");
}

function route() {
  const hash = location.hash.replace("#", "") || "user";

  if (hash === "admin") {
    // Admin page never needs wake-up
    wuScreen.classList.remove("visible");
    stopTimers();
    if (!currentUser) {
      showPage("login");
    } else {
      showPage("admin");
      loadAdminList();
      checkSetup();
    }
  } else {
    // User page — show wake-up if server not confirmed
    document.getElementById("search-results").innerHTML = "";
    document.getElementById("search-input").value = "";
    if (!serverAlive) {
      // Hide all pages, show wake-up
      document.querySelectorAll(".page, .login-shell").forEach(el => {
        el.classList.remove("active");
      });
      startWakeup();
    } else {
      showPage("user");
    }
  }
}

window.addEventListener("hashchange", route);
onAuthStateChanged(auth, user => { currentUser = user; route(); });

/* ════════════════════════════════════════════════════
   TOAST
   ════════════════════════════════════════════════════ */
function toast(msg, type = "info", dur = 3400) {
  const t = document.createElement("div");
  t.className  = `toast ${type}`;
  t.textContent = msg;
  document.getElementById("toasts").appendChild(t);
  setTimeout(() => t.remove(), dur);
}

/* ════════════════════════════════════════════════════
   SETUP BANNER
   ════════════════════════════════════════════════════ */
function checkSetup() {
  const bad =
    RENDER_URL.includes("INLOCUIESTE") ||
    MONGO_CONFIG.apiKey.includes("INLOCUIESTE") ||
    FIREBASE_CONFIG.apiKey.includes("INLOCUIESTE");
  document.getElementById("setup-banner").classList.toggle("show", bad);
}

/* ════════════════════════════════════════════════════
   LOGIN
   ════════════════════════════════════════════════════ */
document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const pass  = document.getElementById("login-pass").value;
  const errEl = document.getElementById("login-err");
  const btn   = document.getElementById("login-btn");

  errEl.style.display = "none";
  if (!email || !pass) {
    errEl.textContent  = "Completează email-ul și parola.";
    errEl.style.display = "block";
    return;
  }

  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span> &nbsp;SE VERIFICĂ...';

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    if (ADMIN_EMAIL && cred.user.email !== ADMIN_EMAIL) {
      await signOut(auth);
      throw new Error("Acces refuzat pentru acest cont.");
    }
    location.hash = "admin";
  } catch (e) {
    let msg = "Email sau parolă incorectă.";
    if (e.message.includes("Acces refuzat")) msg = e.message;
    errEl.textContent  = msg;
    errEl.style.display = "block";
  } finally {
    btn.disabled  = false;
    btn.innerHTML = "🚀 &nbsp;INTRĂ ÎN CONT";
  }
});

document.getElementById("login-pass").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("login-btn").click();
});

/* ════════════════════════════════════════════════════
   LOGOUT
   ════════════════════════════════════════════════════ */
document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
  location.hash = "user";
});

/* ════════════════════════════════════════════════════
   ADMIN — LOAD LIST
   ════════════════════════════════════════════════════ */
async function loadAdminList() {
  const listEl  = document.getElementById("admin-list");
  const countEl = document.getElementById("comp-count");

  listEl.innerHTML =
    `<div class="empty-state"><span class="icon" style="font-size:1.2rem">⟳</span>Se încarcă...</div>`;

  try {
    const data = await mongoCall("find", { filter: {}, limit: 200 });
    const docs = data.documents || [];
    countEl.textContent = docs.length;

    if (!docs.length) {
      listEl.innerHTML =
        `<div class="empty-state"><span class="icon">📭</span>Nicio componentă în bază</div>`;
      return;
    }

    listEl.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "comp-list";

    docs.forEach(doc => {
      const item = document.createElement("div");
      item.className = "comp-item";
      item.innerHTML = `
        <div class="comp-info">
          <div class="comp-name">${esc(doc.name)}</div>
          <div class="comp-detail">${esc(doc.details)}</div>
        </div>
        <button class="btn btn-red" style="padding:7px 14px;font-size:.72rem;border-radius:6px;flex-shrink:0">
          🗑 ȘTERGE
        </button>`;
      item.querySelector("button").addEventListener("click", () =>
        deleteComp(doc._id.$oid || doc._id, item));
      wrap.appendChild(item);
    });

    listEl.appendChild(wrap);
  } catch (e) {
    listEl.innerHTML =
      `<div class="empty-state"><span class="icon">⚠️</span>${esc(e.message)}</div>`;
  }
}

/* ════════════════════════════════════════════════════
   ADMIN — ADD
   ════════════════════════════════════════════════════ */
document.getElementById("add-btn").addEventListener("click", async () => {
  const name    = document.getElementById("add-name").value.trim();
  const details = document.getElementById("add-details").value.trim();
  const btn     = document.getElementById("add-btn");

  if (!name)    { toast("Introduceți numele componentei.", "error"); return; }
  if (!details) { toast("Introduceți detaliile componentei.", "error"); return; }

  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span> &nbsp;SE ADAUGĂ...';

  try {
    await mongoCall("insertOne", {
      document: { name, details, createdAt: new Date().toISOString() }
    });
    toast(`✓ „${name}" adăugată!`, "success");
    document.getElementById("add-name").value    = "";
    document.getElementById("add-details").value = "";
    await loadAdminList();
  } catch (e) {
    toast("Eroare: " + e.message, "error");
  } finally {
    btn.disabled  = false;
    btn.innerHTML = "✚ &nbsp;ADAUGĂ ÎN BAZĂ";
  }
});

/* ════════════════════════════════════════════════════
   ADMIN — DELETE
   ════════════════════════════════════════════════════ */
async function deleteComp(id, itemEl) {
  if (!confirm("Sigur vrei să ștergi această componentă?")) return;

  itemEl.style.opacity       = ".3";
  itemEl.style.pointerEvents = "none";

  try {
    await mongoCall("deleteOne", { filter: { _id: { $oid: id } } });
    toast("Componentă ștearsă.", "info");
    await loadAdminList();
  } catch (e) {
    toast("Eroare la ștergere: " + e.message, "error");
    itemEl.style.opacity       = "1";
    itemEl.style.pointerEvents = "auto";
  }
}

/* ════════════════════════════════════════════════════
   SEARCH
   ════════════════════════════════════════════════════ */
document.getElementById("search-btn").addEventListener("click", doSearch);
document.getElementById("search-input").addEventListener("keydown", e => {
  if (e.key === "Enter") doSearch();
});

async function doSearch() {
  const q         = document.getElementById("search-input").value.trim();
  const resultsEl = document.getElementById("search-results");
  const btn       = document.getElementById("search-btn");

  if (!q) { toast("Introduceți un termen de căutare.", "error"); return; }

  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span> &nbsp;CAUT...';
  resultsEl.innerHTML = "";

  try {
    const data = await mongoCall("find", {
      filter: {
        $or: [
          { name:    { $regex: q, $options: "i" } },
          { details: { $regex: q, $options: "i" } }
        ]
      },
      limit: 100
    });

    const docs = data.documents || [];

    if (!docs.length) {
      resultsEl.innerHTML = `
        <div class="empty-state">
          <span class="icon">🔍</span>
          Nicio componentă găsită pentru
          <strong style="color:var(--text)">"${esc(q)}"</strong>
        </div>`;
      return;
    }

    const header = document.createElement("p");
    header.style.cssText =
      "font-size:.76rem;color:var(--muted);font-family:'Space Mono',monospace;margin-bottom:13px;letter-spacing:.04em";
    header.textContent =
      `${docs.length} rezultat${docs.length === 1 ? "" : "e"} pentru "${q}"`;

    const wrap = document.createElement("div");
    wrap.className = "comp-list";

    docs.forEach((doc, i) => {
      const item = document.createElement("div");
      item.className = "comp-item";
      item.style.animationDelay = `${i * 35}ms`;
      item.innerHTML = `
        <div class="comp-info">
          <div class="comp-name">${highlight(doc.name, q)}</div>
          <div class="comp-detail">${highlight(doc.details, q)}</div>
        </div>
        <span class="comp-tag">✓ GĂSIT</span>`;
      wrap.appendChild(item);
    });

    resultsEl.appendChild(header);
    resultsEl.appendChild(wrap);
  } catch (e) {
    resultsEl.innerHTML =
      `<div class="empty-state"><span class="icon">⚠️</span>${esc(e.message)}</div>`;
  } finally {
    btn.disabled  = false;
    btn.innerHTML = "🔍 &nbsp;CAUTĂ";
  }
}

/* ════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════ */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;");
}

function highlight(text, query) {
  const safe  = esc(text);
  const safeQ = esc(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safe.replace(new RegExp(`(${safeQ})`, "gi"), "<mark>$1</mark>");
}

/* ════════════════════════════════════════════════════
   BOOT
   ════════════════════════════════════════════════════ */
route();
