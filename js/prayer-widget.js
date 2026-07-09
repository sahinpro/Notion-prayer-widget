const STORAGE_KEY = "ptw_deentab_v2";
const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const COUNTRY_CITY = {
  Bangladesh: ["Dhaka", "Chittagong", "Sylhet", "Sunamganj", "Khulna", "Rajshahi", "Comilla", "Rangpur", "Barisal"],
  "Saudi Arabia": ["Makkah", "Madinah", "Riyadh", "Jeddah", "Dammam"],
  Pakistan: ["Karachi", "Lahore", "Islamabad", "Peshawar"],
  India: ["Delhi", "Kolkata", "Mumbai", "Hyderabad"],
  UAE: ["Dubai", "Abu Dhabi", "Sharjah"],
  Turkey: ["Istanbul", "Ankara", "Bursa"],
  Malaysia: ["Kuala Lumpur", "Johor Bahru", "Penang"],
  Indonesia: ["Jakarta", "Bandung", "Surabaya"],
  Egypt: ["Cairo", "Alexandria", "Giza"],
};

function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      country: saved.country || "Bangladesh",
      city: saved.city || "Sunamganj",
      school: saved.school || "1",
      method: saved.method || "3",
    };
  } catch (_e) {
    return { country: "Bangladesh", city: "Sunamganj", school: "1", method: "3" };
  }
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function parseTimeOnDate(base, value) {
  if (!value) return null;
  const cleaned = String(value).replace(/\s*\(.+\)\s*/g, "").trim();
  const m = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const d = new Date(base);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

function fmt12(date) {
  return date
    ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "--:--";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

let state = {
  cfg: loadConfig(),
  data: null,
  loading: true,
  error: null,
  settingsOpen: false,
};
let tick = null;

async function fetchPrayerData(cfg) {
  const key = `ptw_aladhan_${cfg.country}_${cfg.city}_${cfg.method}_${cfg.school}_${todayKey()}`;
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    if (cached) return cached;
  } catch (_e) {}

  const url = new URL("https://api.aladhan.com/v1/timingsByCity");
  url.searchParams.set("city", cfg.city);
  url.searchParams.set("country", cfg.country);
  url.searchParams.set("method", cfg.method);
  url.searchParams.set("school", cfg.school);
  const res = await fetch(url);
  const json = await res.json();
  if (json.code !== 200 || !json.data?.timings) throw new Error("Failed to load prayer times");
  const payload = {
    times: {
      Fajr: json.data.timings.Fajr,
      Dhuhr: json.data.timings.Dhuhr,
      Asr: json.data.timings.Asr,
      Maghrib: json.data.timings.Maghrib,
      Isha: json.data.timings.Isha,
    },
    hijri: json.data.date?.hijri || null,
    gregorian: json.data.date?.gregorian || null,
  };
  localStorage.setItem(key, JSON.stringify(payload));
  return payload;
}

function computeSchedule() {
  if (!state.data) return null;
  const now = new Date();
  const entries = PRAYERS.map((name) => ({
    name,
    start: parseTimeOnDate(now, state.data.times[name]),
  }));

  const fajrTomorrow = new Date(entries[0].start);
  fajrTomorrow.setDate(fajrTomorrow.getDate() + 1);

  for (let i = 0; i < entries.length; i++) {
    entries[i].end = entries[i + 1] ? entries[i + 1].start : fajrTomorrow;
  }

  let current = entries.find((e) => now >= e.start && now < e.end) || entries[entries.length - 1];
  let next = entries.find((e) => e.start > now);
  if (!next) next = { name: "Fajr", start: fajrTomorrow };

  const total = Math.max(1, next.start - current.start);
  const elapsed = Math.min(total, Math.max(0, now - current.start));
  return { now, entries, current, next, progress: Math.round((elapsed / total) * 100) };
}

function countdown(target, now) {
  let s = Math.max(0, Math.floor((target - now) / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  s %= 3600;
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

function rowIcon(name) {
  const icons = {
    Fajr: "◔",
    Dhuhr: "☼",
    Asr: "◐",
    Maghrib: "◒",
    Isha: "◑",
  };
  return icons[name] || "•";
}

function render() {
  const app = document.getElementById("app");
  if (state.loading) {
    app.innerHTML = `<div class="loading-state">Loading prayer times...</div>`;
    return;
  }
  if (state.error) {
    app.innerHTML = `<div class="card"><div class="error">${escapeHtml(state.error)}</div></div>`;
    return;
  }

  const s = computeSchedule();
  const hijri = state.data.hijri;
  const hijriLabel = hijri ? `${hijri.day} ${hijri.month?.en} ${hijri.year} AH` : "";
  const nextText = s.next.name;
  const cd = countdown(s.next.start, s.now);

  app.innerHTML = `
    <div class="deentab-shell">
      <div class="card fade-in">
        <div class="card-header">
          <div class="header-left">
            <span class="dots">⋮⋮</span>
            <span class="title">Prayer Times</span>
          </div>
          <div class="header-actions">
            <button id="settings-btn" class="icon-btn" aria-label="Settings">⚙</button>
            <button id="close-settings-btn" class="icon-btn" aria-label="Close settings">×</button>
          </div>
        </div>

        <div class="location-block">
          <h2>${escapeHtml(state.cfg.city)}</h2>
          <p>${escapeHtml(state.cfg.country)}</p>
          <p class="hijri">${escapeHtml(hijriLabel)}</p>
        </div>

        <div class="next-block">
          <p>Next prayer <span class="accent">${escapeHtml(nextText)}</span> in</p>
          <div class="countdown digit">${cd}</div>
          <div class="progress"><span style="width:${s.progress}%"></span></div>
        </div>

        <div class="rows">
          ${s.entries.map((e) => `
            <div class="row ${e.name === s.current.name ? "active" : ""}">
              <div class="row-left"><span class="row-icon">${rowIcon(e.name)}</span><span>${e.name}</span></div>
              <div class="row-time digit">${fmt12(e.start)} - ${e.end ? fmt12(e.end) : "Next Fajr"}</div>
            </div>
          `).join("")}
        </div>
      </div>

      ${state.settingsOpen ? settingsMarkup() : ""}
    </div>
  `;

  document.getElementById("settings-btn")?.addEventListener("click", () => {
    state.settingsOpen = true;
    render();
    bindSettings();
  });
  document.getElementById("close-settings-btn")?.addEventListener("click", () => {
    state.settingsOpen = false;
    render();
  });

  if (state.settingsOpen) bindSettings();
}

function settingsMarkup() {
  const countries = Object.keys(COUNTRY_CITY);
  const cities = COUNTRY_CITY[state.cfg.country] || [];
  return `
    <div class="settings-overlay">
      <div class="settings-card fade-in">
        <div class="settings-title">Location Settings</div>
        <label>Country</label>
        <select id="cfg-country" class="field-input">
          ${countries.map((c) => `<option ${c === state.cfg.country ? "selected" : ""}>${c}</option>`).join("")}
        </select>
        <label>City</label>
        <select id="cfg-city" class="field-input">
          ${cities.map((c) => `<option ${c === state.cfg.city ? "selected" : ""}>${c}</option>`).join("")}
        </select>
        <label>Fiqh Madhab Calculation Method</label>
        <select id="cfg-school" class="field-input">
          <option value="1" ${state.cfg.school === "1" ? "selected" : ""}>Standard (Shafi'i, Maliki, Hanbali)</option>
          <option value="2" ${state.cfg.school === "2" ? "selected" : ""}>Hanafi</option>
        </select>
        <div class="settings-actions">
          <button id="save-settings" class="btn btn-primary">Save Locally</button>
          <button id="cancel-settings" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

function bindSettings() {
  const countryEl = document.getElementById("cfg-country");
  countryEl?.addEventListener("change", () => {
    const country = countryEl.value;
    const city = (COUNTRY_CITY[country] || [])[0] || "";
    state.cfg.country = country;
    state.cfg.city = city;
    render();
    bindSettings();
  });

  document.getElementById("cancel-settings")?.addEventListener("click", () => {
    state.settingsOpen = false;
    render();
  });

  document.getElementById("save-settings")?.addEventListener("click", async () => {
    const nextCfg = {
      ...state.cfg,
      country: document.getElementById("cfg-country").value,
      city: document.getElementById("cfg-city").value,
      school: document.getElementById("cfg-school").value,
      method: "3",
    };
    state.cfg = nextCfg;
    saveConfig(nextCfg);
    state.settingsOpen = false;
    state.loading = true;
    render();
    await boot();
  });
}

async function boot() {
  try {
    state.data = await fetchPrayerData(state.cfg);
    state.error = null;
  } catch (e) {
    state.error = e.message || "Failed to load prayer data";
  }
  state.loading = false;
  render();
}

async function init() {
  render();
  await boot();
  clearInterval(tick);
  tick = setInterval(() => {
    if (!state.loading && !state.error && !state.settingsOpen) render();
  }, 1000);
}

init();
