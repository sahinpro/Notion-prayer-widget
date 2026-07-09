/* =========================================================================
   PROVIDER LAYER — this is the "future-proof" part.
   To add a new prayer-time API: add one entry to PRAYER_PROVIDERS with
   buildUrl(cfg) -> string and normalize(json) -> NormalizedPrayerData.
   Everything below (render, countdown, cache) only talks to this shape:
   { times: {Fajr,Sunrise,Dhuhr,Asr,Maghrib,Isha,Imsak?}, hijri, gregorian, timezone, qibla? }
   ========================================================================= */
const PRAYER_PROVIDERS = {
  islamicapi: {
    label: "IslamicAPI",
    buildUrl(cfg) {
      const p = new URLSearchParams({
        lat: cfg.lat,
        lon: cfg.lon,
        api_key: cfg.apiKey,
      });
      if (cfg.method) p.set("method", cfg.method);
      if (cfg.school) p.set("school", cfg.school);
      return `https://islamicapi.com/api/v1/prayer-time/?${p.toString()}`;
    },
    normalize(json) {
      if (!json || json.status !== "success" || !json.data) {
        throw new Error(json?.message || "Unable to fetch prayer times");
      }
      const d = json.data;
      const t = d.times || {};
      return {
        times: {
          Imsak: t.Imsak ?? null,
          Fajr: t.Fajr,
          Sunrise: t.Sunrise,
          Dhuhr: t.Dhuhr,
          Asr: t.Asr,
          Maghrib: t.Maghrib ?? t.Sunset,
          Isha: t.Isha,
        },
        hijri: d.date?.hijri ?? null,
        gregorian: d.date?.gregorian ?? null,
        timezone: d.timezone ?? null,
        qibla: d.qibla ?? null,
      };
    },
  },

  // Example stub for a second provider — mirror this shape and register it
  // above, then pass ?provider=aladhan in the embed URL to switch.
  // aladhan: {
  //   label: 'AlAdhan',
  //   buildUrl(cfg) { return `https://api.aladhan.com/v1/timings?latitude=${cfg.lat}&longitude=${cfg.lon}&method=${cfg.method||3}`; },
  //   normalize(json) {
  //     const t = json.data.timings;
  //     return { times: { Fajr:t.Fajr, Sunrise:t.Sunrise, Dhuhr:t.Dhuhr, Asr:t.Asr, Maghrib:t.Maghrib, Isha:t.Isha },
  //       hijri: json.data.date.hijri, gregorian: json.data.date.gregorian, timezone: { name: json.data.meta.timezone } };
  //   }
  // },
};

const PRAYER_ORDER = [
  "Fajr",
  "Sunrise",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
];
const COUNTABLE = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]; // Sunrise shown but not "next prayer"-eligible

const PRAYER_ICONS = {
  Imsak: `<path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/><circle cx="12" cy="12" r="4"/>`,
  Fajr: `<path d="M12 2v4M4.9 8.5 7.7 10.6M19.1 8.5 16.3 10.6M2 18h20M4 18a8 8 0 0 1 16 0"/>`,
  Sunrise: `<path d="M12 4V2M4.9 8.5 3.5 7.1M19.1 8.5 20.5 7.1M2 18h20M6 14a6 6 0 0 1 12 0M17 18l2-2M7 18l-2-2"/>`,
  Dhuhr: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`,
  Asr: `<circle cx="12" cy="14" r="4"/><path d="M12 3v2M4.9 7.9l1.4 1.4M19.1 7.9l-1.4 1.4M3 14h2M19 14h2"/>`,
  Maghrib: `<path d="M2 18h20M4 18a8 8 0 0 1 16 0M12 2v4M4.9 8.5 3.5 7.1M19.1 8.5 20.5 7.1"/><path d="m9 21 3-3 3 3"/>`,
  Isha: `<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z"/>`,
};

/* =========================================================================
   CONFIG
   Location resolution priority (highest wins):
     1. lat+lon present in the URL           -> "locked" embed link, no GPS call
     2. manualLocation:true in localStorage   -> user pinned coords in Settings
     3. live browser geolocation (GPS/network) -> runs fresh on every load
     4. DEFAULTS (Dhaka)                       -> only if geolocation fails/denied
   ========================================================================= */
const DEFAULTS = {
  lat: "23.8103",
  lon: "90.4125",
  label: "Dhaka, Bangladesh",
  method: "3",
  school: "1",
  provider: "islamicapi",
};
const STORAGE_KEY = "ptw_config_v1";

function loadConfig() {
  const url = new URLSearchParams(location.search);
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch (e) {}

  const urlHasCoords = url.has("lat") && url.has("lon");
  const manualLocation = urlHasCoords || stored.manualLocation === true;

  const cfg = {
    apiKey: url.get("api_key") || stored.apiKey || "",
    lat: url.get("lat") || stored.lat || DEFAULTS.lat,
    lon: url.get("lon") || stored.lon || DEFAULTS.lon,
    label: url.get("label") || stored.label || DEFAULTS.label,
    method: url.get("method") || stored.method || DEFAULTS.method,
    school: url.get("school") || stored.school || DEFAULTS.school,
    provider: url.get("provider") || stored.provider || DEFAULTS.provider,
    manualLocation,
  };
  return cfg;
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported in this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 300000,
    });
  });
}

async function reverseGeocode(lat, lon) {
  const key = `ptw_geo_${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}`;
  const cached = localStorage.getItem(key);
  if (cached) return cached;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10`,
    );
    const json = await res.json();
    const a = json.address || {};
    const city =
      a.city || a.town || a.village || a.county || a.state_district || "";
    const country = a.country || "";
    const label =
      [city, country].filter(Boolean).join(", ") ||
      `${Number(lat).toFixed(3)}, ${Number(lon).toFixed(3)}`;
    localStorage.setItem(key, label);
    return label;
  } catch (e) {
    return null;
  }
}

function buildEmbedUrl(cfg) {
  const u = new URL(location.href.split("?")[0], location.href);
  u.searchParams.set("api_key", cfg.apiKey);
  u.searchParams.set("lat", cfg.lat);
  u.searchParams.set("lon", cfg.lon);
  u.searchParams.set("label", cfg.label);
  u.searchParams.set("method", cfg.method);
  u.searchParams.set("school", cfg.school);
  return u.toString();
}

/* =========================================================================
   TIME PARSING — API returns either "15:24" (24h) or "3:36 PM" (12h)
   depending on endpoint variant, so handle both.
   ========================================================================= */
function parseTimeOnDate(baseDate, timeStr) {
  if (!timeStr) return null;
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = m[3]?.toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  const d = new Date(baseDate);
  d.setHours(h, min, 0, 0);
  return d;
}

function fmt12(date) {
  if (!date) return "--:--";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/* =========================================================================
   FETCH + CACHE
   ========================================================================= */
async function fetchPrayerData(cfg) {
  const provider =
    PRAYER_PROVIDERS[cfg.provider] || PRAYER_PROVIDERS.islamicapi;
  const cacheKey = `ptw_cache_${cfg.provider}_${cfg.lat}_${cfg.lon}_${cfg.method}_${cfg.school}_${todayKey()}`;

  const cached = sessionCache(cacheKey);
  if (cached) return { data: cached, fromCache: true };

  const url = provider.buildUrl(cfg);
  const res = await fetch(url);
  const json = await res.json();
  const normalized = provider.normalize(json);

  try {
    localStorage.setItem(cacheKey, JSON.stringify(normalized));
  } catch (e) {}
  purgeOldCache(cacheKey);
  return { data: normalized, fromCache: false };
}

function sessionCache(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function purgeOldCache(currentKey) {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("ptw_cache_") && k !== currentKey)
    .forEach((k) => localStorage.removeItem(k));
}

/* =========================================================================
   APP STATE + RENDER
   ========================================================================= */
let state = {
  cfg: loadConfig(),
  data: null,
  error: null,
  loading: true,
  geoStatus: "idle",
  geoError: null,
};
let clockInterval = null;

async function init() {
  render();
  if (!state.cfg.apiKey) {
    state.loading = false;
    render();
    return;
  }

  if (!state.cfg.manualLocation) {
    state.geoStatus = "locating";
    render();
    try {
      const pos = await getPosition();
      state.cfg.lat = pos.coords.latitude.toFixed(5);
      state.cfg.lon = pos.coords.longitude.toFixed(5);
      state.geoStatus = "success";
      // Don't block first render on reverse geocoding — fill the label in once it resolves.
      reverseGeocode(state.cfg.lat, state.cfg.lon).then((label) => {
        if (label) {
          state.cfg.label = label;
          refreshLabelInDom();
        }
      });
    } catch (e) {
      state.geoStatus = "error";
      state.geoError =
        e.code === 1
          ? "Location permission denied"
          : e.message || "Could not detect location";
      // fall back to whatever was previously stored, else Dhaka defaults
      state.cfg.lat = state.cfg.lat || DEFAULTS.lat;
      state.cfg.lon = state.cfg.lon || DEFAULTS.lon;
    }
  } else {
    state.geoStatus = "manual";
  }

  try {
    const { data } = await fetchPrayerData(state.cfg);
    state.data = data;
    state.error = null;
  } catch (e) {
    state.error = e.message || "Failed to load prayer times";
  }
  state.loading = false;
  render();
  startClock();
  scheduleMidnightRefresh();
}

function refreshLabelInDom() {
  const el = document.getElementById("loc-label");
  if (el) el.textContent = state.cfg.label;
}

function startClock() {
  clearInterval(clockInterval);
  clockInterval = setInterval(() => renderLiveBits(), 1000);
}

function scheduleMidnightRefresh() {
  setInterval(() => {
    if (state.lastKey && state.lastKey !== todayKey()) location.reload();
    state.lastKey = state.lastKey || todayKey();
  }, 30000);
}

function tz() {
  return (
    state.data?.timezone?.name ||
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
}

function nowInTz() {
  try {
    return new Date(
      new Date().toLocaleString("en-US", { timeZone: tz() }),
    );
  } catch (e) {
    return new Date();
  }
}

function computeSchedule() {
  const now = nowInTz();
  const t = state.data.times;
  const entries = PRAYER_ORDER.filter((name) => t[name]).map((name) => ({
    name,
    time: parseTimeOnDate(now, t[name]),
  }));

  let next = entries.find(
    (e) => COUNTABLE.includes(e.name) && e.time > now,
  );
  let isTomorrow = false;
  if (!next) {
    const fajr = entries.find((e) => e.name === "Fajr");
    if (fajr) {
      const t2 = new Date(fajr.time);
      t2.setDate(t2.getDate() + 1);
      next = { name: "Fajr", time: t2 };
      isTomorrow = true;
    }
  }

  let current = null;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].time <= now && COUNTABLE.includes(entries[i].name)) {
      current = entries[i].name;
      break;
    }
  }

  return { now, entries, next, isTomorrow, current };
}

function countdownStr(target, now) {
  let ms = target - now;
  if (ms < 0) ms = 0;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { h, m, s, str: h > 0 ? `${h}h ${m}m` : `${m}m ${s}s` };
}

function icon(name, extraClass = "") {
  return `<svg class="w-4 h-4 ${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PRAYER_ICONS[name] || ""}</svg>`;
}

function render() {
  const app = document.getElementById("app");

  if (!state.cfg.apiKey) {
    app.innerHTML = setupScreen();
    bindSetupScreen();
    return;
  }

  if (state.loading) {
    const msg =
      state.geoStatus === "locating"
        ? "Detecting your exact location…"
        : "Loading prayer times…";
    app.innerHTML = `<div class="loading-state fade-in">
<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>
${msg}
    </div>`;
    return;
  }

  if (state.error) {
    app.innerHTML = `
<div class="fade-in alert-error text-sm">
  <p class="font-medium text-red-300 mb-1">Couldn't load prayer times</p>
  <p class="text-red-200/70 mb-4">${escapeHtml(state.error)}</p>
  <button id="retry-btn" class="btn btn-secondary text-xs">Retry</button>
  <button id="reset-btn" class="btn btn-ghost text-xs ml-2">Edit settings</button>
</div>`;
    document.getElementById("retry-btn").onclick = () => {
      state.loading = true;
      render();
      init();
    };
    document.getElementById("reset-btn").onclick = () => {
      localStorage.removeItem(STORAGE_KEY);
      state.cfg.apiKey = "";
      render();
    };
    return;
  }

  const { entries, next, isTomorrow, current } = computeSchedule();
  const g = state.data.gregorian;
  const dateLabel = g
    ? `${g.month?.en ?? ""} ${g.day ?? ""}, ${g.year ?? ""}`
    : new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
  const hijri = state.data.hijri;
  const hijriLabel = hijri
    ? `${hijri.month?.en ?? ""} ${hijri.day ?? ""}, ${hijri.year ?? ""} AH`
    : "";

  app.innerHTML = `
    <div class="fade-in glass-card">

<div class="flex items-center justify-between px-5 pt-5 pb-3">
  <div>
    <h1 class="text-title flex items-center gap-1.5">
      <svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>
      Prayer Times
    </h1>
    <p class="text-caption mt-0.5 flex items-center gap-1">
      <svg class="w-3 h-3 shrink-0 ${state.geoStatus === "success" ? "text-accent" : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-7.58 8-13a8 8 0 1 0-16 0c0 5.42 8 13 8 13Z"/><circle cx="12" cy="9" r="2.5"/></svg>
      <span id="loc-label">${escapeHtml(state.cfg.label)}</span>
    </p>
  </div>
  <div class="text-right">
    <p class="text-subhead font-medium">${dateLabel}</p>
    ${hijriLabel ? `<p class="text-caption mt-0.5">${hijriLabel}</p>` : ""}
  </div>
</div>

${
  state.geoStatus === "error"
    ? `
<div class="alert-warning">
  <svg class="w-3.5 h-3.5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>
  <span>${escapeHtml(state.geoError)} — showing ${escapeHtml(state.cfg.label)}. Open Settings to allow location or set coordinates manually.</span>
</div>`
    : ""
}

<div id="live-clock" class="px-5"></div>

<div id="next-banner" class="mx-5 mt-3"></div>

<div class="grouped-list">
  ${entries.map((e) => rowHtml(e, current)).join("")}
</div>

<div class="toolbar">
  <button id="copy-embed-btn" class="btn-toolbar">
    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    <span id="copy-embed-label">Copy embed link</span>
  </button>
  <button id="settings-btn" class="btn-toolbar">
    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    Settings
  </button>
</div>
    </div>
  `;

  document.getElementById("settings-btn").onclick = () => {
    app.innerHTML = setupScreen(true);
    bindSetupScreen();
  };
  document.getElementById("copy-embed-btn").onclick = async () => {
    const url = buildEmbedUrl(state.cfg);
    const label = document.getElementById("copy-embed-label");
    try {
      await navigator.clipboard.writeText(url);
      label.textContent = "Copied! Paste into Notion";
    } catch (e) {
      label.textContent = url;
    }
    setTimeout(() => {
      label.textContent = "Copy embed link";
    }, 2500);
  };
  renderLiveBits();
}

function rowHtml(entry, current) {
  const isCurrent = entry.name === current;
  return `
    <div class="list-row ${isCurrent ? "list-row-active" : ""}">
<div class="flex items-center gap-2.5">
  <span class="list-row-icon">${icon(entry.name)}</span>
  <span class="text-[15px] font-medium ${isCurrent ? "text-accent" : ""}">${entry.name}</span>
</div>
<span class="text-[15px] digit ${isCurrent ? "text-accent font-semibold" : "text-subhead"}">${fmt12(entry.time)}</span>
    </div>`;
}

function renderLiveBits() {
  if (!state.data) return;
  const clockEl = document.getElementById("live-clock");
  const bannerEl = document.getElementById("next-banner");
  if (!clockEl || !bannerEl) return;

  const now = nowInTz();
  const { next, isTomorrow } = computeSchedule();
  const cd = next ? countdownStr(next.time, now) : null;

  const h = now.getHours() % 12 || 12;
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "PM" : "AM";

  clockEl.innerHTML = `
    <div class="flex items-center justify-center gap-1.5 py-2">
${flipDigit(String(h).padStart(2, "0"))}
<span class="text-white/20 text-xl font-bold pb-1">:</span>
${flipDigit(mm)}
<span class="text-white/20 text-xl font-bold pb-1">:</span>
${flipDigit(ss, true)}
<span class="ml-1.5 text-caption font-bold self-end mb-2">${ampm}</span>
    </div>`;

  bannerEl.innerHTML = next
    ? `
    <div class="next-banner">
<div class="flex items-center gap-2">
  <span class="relative flex h-2 w-2">
    <span class="live-dot absolute inline-flex h-full w-full rounded-full bg-[var(--accent)]"></span>
    <span class="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
  </span>
  <span class="text-subhead">Next: <span class="font-medium" style="color:var(--label-primary)">${next.name}${isTomorrow ? " (tomorrow)" : ""}</span></span>
</div>
<span class="text-[13px] font-semibold text-accent digit">${cd.str}</span>
    </div>`
    : "";
}

function flipDigit(val, muted = false) {
  return `<span class="digit flip-digit ${muted ? "flip-digit-muted" : ""}">${val}</span>`;
}

/* =========================================================================
   SETUP SCREEN (first run / no api key, or Settings button)
   ========================================================================= */
function setupScreen(isEdit = false) {
  const c = state.cfg;
  return `
    <div class="fade-in glass-card glass-card-padded">
<h2 class="text-title mb-1">${isEdit ? "Settings" : "Set up Prayer Times"}</h2>
<p class="text-caption mb-4">Get a free key at <a class="underline" style="color:var(--label-secondary)" href="https://www.islamicapi.com" target="_blank" rel="noopener">islamicapi.com</a>. Stored only in this browser.</p>

<div class="space-y-3">
  <div>
    <label class="field-label" for="cfg-key">API Key</label>
    <input id="cfg-key" type="text" value="${escapeAttr(c.apiKey)}" placeholder="your api key" class="field-input" />
  </div>
  <label class="flex items-center gap-2 py-1 cursor-pointer select-none min-h-[44px]">
    <input id="cfg-auto" type="checkbox" ${!c.manualLocation ? "checked" : ""} class="w-4 h-4 rounded accent-[var(--accent)]" />
    <span class="text-subhead">Auto-detect exact location via GPS on each load</span>
  </label>
  <div class="grid grid-cols-2 gap-3">
    <div>
      <label class="field-label" for="cfg-lat">Latitude</label>
      <input id="cfg-lat" type="text" value="${escapeAttr(c.lat)}" class="field-input" />
    </div>
    <div>
      <label class="field-label" for="cfg-lon">Longitude</label>
      <input id="cfg-lon" type="text" value="${escapeAttr(c.lon)}" class="field-input" />
    </div>
  </div>
  <p class="text-caption leading-snug">Auto-detect only works when this page is opened directly (Notion's embedded iframe blocks GPS permission). For Notion: leave auto-detect on here once, hit Save, then use <span style="color:var(--label-secondary)">Copy embed link</span> — it bakes your exact coordinates into the URL so the Notion embed doesn't need location access at all.</p>
  <div>
    <label class="field-label" for="cfg-label">Location label</label>
    <input id="cfg-label" type="text" value="${escapeAttr(c.label)}" class="field-input" />
  </div>
  <div class="grid grid-cols-2 gap-3">
    <div>
      <label class="field-label" for="cfg-method">Method</label>
      <select id="cfg-method" class="field-input">
        ${methodOptions(c.method)}
      </select>
    </div>
    <div>
      <label class="field-label" for="cfg-school">Asr School</label>
      <select id="cfg-school" class="field-input">
        <option value="1" ${c.school === "1" ? "selected" : ""}>Shafi</option>
        <option value="2" ${c.school === "2" ? "selected" : ""}>Hanafi</option>
      </select>
    </div>
  </div>
</div>

<div class="flex items-center gap-2 mt-4">
  <button id="use-location" class="btn btn-ghost text-[12px]">
    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-7.58 8-13a8 8 0 1 0-16 0c0 5.42 8 13 8 13Z"/><circle cx="12" cy="9" r="2.5"/></svg>
    Use my location
  </button>
</div>

<button id="save-cfg" class="btn btn-primary mt-4">
  Save &amp; view times
</button>

${
  isEdit
    ? `
<button id="copy-embed-btn-settings" class="btn btn-secondary w-full mt-2 text-[12.5px]">
  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
  <span id="copy-embed-label-settings">Copy embed link with current coordinates</span>
</button>`
    : ""
}
    </div>`;
}

function methodOptions(selected) {
  const methods = {
    1: "Karachi",
    2: "ISNA",
    3: "Muslim World League",
    4: "Umm Al-Qura, Makkah",
    5: "Egyptian",
    7: "Tehran",
    8: "Gulf Region",
    9: "Kuwait",
    10: "Qatar",
    11: "MUIS, Singapore",
    12: "UOIF, France",
    13: "Diyanet, Turkey",
    14: "Russia",
    15: "Moonsighting Worldwide",
    16: "Dubai",
    17: "JAKIM, Malaysia",
    18: "Tunisia",
    19: "Algeria",
    20: "KEMENAG, Indonesia",
    21: "Morocco",
    22: "Lisbon, Portugal",
    23: "Jordan",
    0: "Jafari / Shia",
  };
  return Object.entries(methods)
    .map(
      ([v, l]) =>
        `<option value="${v}" ${String(v) === String(selected) ? "selected" : ""}>${l}</option>`,
    )
    .join("");
}

function bindSetupScreen() {
  document
    .getElementById("use-location")
    ?.addEventListener("click", async () => {
      if (!navigator.geolocation) return;
      const btn = document.getElementById("use-location");
      const original = btn.innerHTML;
      btn.innerHTML = original.replace("Use my location", "Detecting…");
      try {
        const pos = await getPosition();
        document.getElementById("cfg-lat").value =
          pos.coords.latitude.toFixed(5);
        document.getElementById("cfg-lon").value =
          pos.coords.longitude.toFixed(5);
        const label = await reverseGeocode(
          pos.coords.latitude,
          pos.coords.longitude,
        );
        if (label) document.getElementById("cfg-label").value = label;
      } catch (e) {
        // silently leave fields as-is; error is self-evident from unchanged values
      }
      btn.innerHTML = original;
    });

  document.getElementById("save-cfg")?.addEventListener("click", () => {
    const autoDetect = document.getElementById("cfg-auto").checked;
    const cfg = {
      apiKey: document.getElementById("cfg-key").value.trim(),
      lat:
        document.getElementById("cfg-lat").value.trim() || DEFAULTS.lat,
      lon:
        document.getElementById("cfg-lon").value.trim() || DEFAULTS.lon,
      label:
        document.getElementById("cfg-label").value.trim() ||
        DEFAULTS.label,
      method: document.getElementById("cfg-method").value,
      school: document.getElementById("cfg-school").value,
      provider: state.cfg.provider || DEFAULTS.provider,
      manualLocation: !autoDetect,
    };
    saveConfig(cfg);
    state.cfg = cfg;
    state.loading = true;
    render();
    init();
  });

  document
    .getElementById("copy-embed-btn-settings")
    ?.addEventListener("click", async () => {
      const cfg = {
        apiKey: document.getElementById("cfg-key").value.trim(),
        lat:
          document.getElementById("cfg-lat").value.trim() || DEFAULTS.lat,
        lon:
          document.getElementById("cfg-lon").value.trim() || DEFAULTS.lon,
        label:
          document.getElementById("cfg-label").value.trim() ||
          DEFAULTS.label,
        method: document.getElementById("cfg-method").value,
        school: document.getElementById("cfg-school").value,
      };
      const url = buildEmbedUrl(cfg);
      const label = document.getElementById("copy-embed-label-settings");
      try {
        await navigator.clipboard.writeText(url);
        label.textContent = "Copied! Paste into Notion";
      } catch (e) {
        label.textContent = url;
      }
      setTimeout(() => {
        label.textContent = "Copy embed link with current coordinates";
      }, 2500);
    });
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}
function escapeAttr(s) {
  return escapeHtml(s);
}

init();
