const DAY_MS = 86_400_000;
const JULIAN_YEAR_DAYS = 365.25;
const YEAR_MS = DAY_MS * JULIAN_YEAR_DAYS;
const SYNODIC_MONTH_DAYS = 29.53058867;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

const DEFAULT_LOCATION = {
  name: "未命名观测点",
  lat: 0,
  lon: 0,
  light: "未估算光污染，请结合本地光害地图确认。",
};

const EQUIPMENT = {
  naked: {
    label: "肉眼暗空",
    maxMag: 5.5,
    easyMag: 4.8,
    minAlt: 35,
    price: "0 元，但需要真正暗的天空",
    skill: "入门，重点是暗适应和辨认星座",
    note: "适合在 Bortle 1-3 暗空下尝试。城市里肉眼极限会显著变差，接近 G5 的目标并不稳。",
  },
  binoculars: {
    label: "双筒望远镜",
    maxMag: 8.0,
    easyMag: 6.8,
    minAlt: 30,
    price: "约 300-1500 元",
    skill: "入门到轻度练习，需要会按星图跳星",
    note: "7x50 或 10x50 双筒可以覆盖较宽视场，适合先用亮星定位，再确认较暗目标。",
  },
  camera_fixed: {
    label: "相机固定三脚架",
    maxMag: 8.5,
    easyMag: 7.2,
    minAlt: 28,
    price: "已有相机时成本较低",
    skill: "需要会手动曝光、对焦和多张堆栈",
    note: "使用广角到中焦短曝光，拍多张后堆栈。长焦固定三脚架会受地球自转拖线限制。",
  },
  telephoto_tracker: {
    label: "长焦加星野赤道仪",
    maxMag: 11.0,
    easyMag: 8.8,
    minAlt: 25,
    price: "约 3000-15000 元，取决于镜头和赤道仪",
    skill: "中等，需要极轴、构图和堆栈处理",
    note: "200-600mm 镜头加轻量赤道仪是长焦恒星拍摄的甜点位，时间候选可以放暗一些。",
  },
  small_scope: {
    label: "小望远镜深空入门",
    maxMag: 13.5,
    easyMag: 10.2,
    minAlt: 23,
    price: "约 8000-30000 元",
    skill: "进阶，需要 GoTo、导星或短曝光堆栈",
    note: "允许更暗但时间更准的恒星。建议先在 Stellarium 或 Aladin 里确认视场和邻近亮星。",
  },
  advanced: {
    label: "进阶民用设备",
    maxMag: 14.0,
    easyMag: 11.0,
    minAlt: 22,
    price: "约 30000 元以上，仍属于民用设备范围",
    skill: "进阶，需要稳定跟踪、校准帧和后期经验",
    note: "接近当前星表亮度下限。真正瓶颈通常是透明度、月光、跟踪精度和后期信噪比。",
  },
};

const STAR_COLORS = {
  "blue-white": "#6e8fbe",
  white: "#f2f4f0",
  "yellow-white": "#e3c46f",
  orange: "#bd7a45",
  red: "#a65445",
  unknown: "#dfe5dc",
};

const app = {
  catalog: null,
  crossIds: {},
  crossMeta: null,
  stars: [],
  results: [],
  selectedIndex: 0,
  selectedKind: "precision",
  currentForm: null,
  map: null,
  marker: null,
};

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", init);

async function init() {
  initTheme();
  populateTimeZones();
  setDefaultForm();
  applySharedState();
  bindControls();
  initMap();
  drawStarscape();
  await loadCatalog();
  $("birthForm").dispatchEvent(new Event("submit", { cancelable: true }));
}

function populateTimeZones() {
  const fallback = ["UTC", "Asia/Shanghai", "Asia/Tokyo", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : fallback;
  $("timeZoneOptions").innerHTML = zones.map((zone) => `<option value="${escapeHTML(zone)}"></option>`).join("");
}

function setDefaultForm() {
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  $("birthDate").value = "1990-01-01";
  $("birthTime").value = "12:00";
  $("birthTimeZone").value = browserZone;
  $("observerTimeZone").value = browserZone;
  $("latitude").value = DEFAULT_LOCATION.lat.toFixed(4);
  $("longitude").value = DEFAULT_LOCATION.lon.toFixed(4);
}

function bindControls() {
  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
  });

  $("birthForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!app.catalog) return;

    try {
      const form = readForm();
      app.currentForm = form;
      app.results = computeResults(form);
      app.selectedIndex = 0;
      app.selectedKind = "precision";
      updateShareUrl(form);
      renderResults();
    } catch (error) {
      $("summary").innerHTML = `<span class="warning">${escapeHTML(error.message)}</span>`;
      console.error(error);
    }
  });

  $("latitude").addEventListener("change", syncMarkerFromFields);
  $("longitude").addEventListener("change", syncMarkerFromFields);
  $("shareButton").addEventListener("click", copyShareLink);
  $("placeSearchButton").addEventListener("click", searchPlace);
  $("placeSearch").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchPlace();
    }
  });
}

function initTheme() {
  const saved = localStorage.getItem("birthday-starlight-theme");
  setTheme(saved === "fieldbook" ? "fieldbook" : "mission");
}

function setTheme(theme) {
  const nextTheme = theme === "fieldbook" ? "fieldbook" : "mission";
  document.body.dataset.theme = nextTheme;
  localStorage.setItem("birthday-starlight-theme", nextTheme);
  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === nextTheme));
  });
}

function initMap() {
  if (!window.L || !$("map")) {
    $("map").textContent = "地图资源没有载入。你仍然可以手动输入纬度和经度。";
    return;
  }

  const fieldLat = Number($("latitude").value);
  const fieldLon = Number($("longitude").value);
  const startLat = clamp(Number.isFinite(fieldLat) ? fieldLat : DEFAULT_LOCATION.lat, -90, 90);
  const startLon = clamp(Number.isFinite(fieldLon) ? fieldLon : DEFAULT_LOCATION.lon, -180, 180);
  app.map = L.map("map", {
    zoomControl: true,
    attributionControl: true,
  }).setView([startLat, startLon], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(app.map);

  app.marker = L.marker([startLat, startLon], { draggable: true }).addTo(app.map);
  app.marker.on("dragend", () => {
    const pos = app.marker.getLatLng();
    setLocation(pos.lat, pos.lng, "地图选点");
  });
  app.map.on("click", (event) => setLocation(event.latlng.lat, event.latlng.lng, "地图选点"));
}

function applySharedState() {
  const params = new URLSearchParams(window.location.search);
  if (!params.size) return;

  setInputFromParam(params, "birthDate", "birth");
  setInputFromParam(params, "birthTime", "time");
  setInputFromParam(params, "birthTimeZone", "birthTz");
  setInputFromParam(params, "observerTimeZone", "obsTz");
  setInputFromParam(params, "latitude", "lat");
  setInputFromParam(params, "longitude", "lon");
  setInputFromParam(params, "horizon", "years");
  setInputFromParam(params, "placeSearch", "place");

  const equipmentKey = params.get("equipment");
  if (equipmentKey && EQUIPMENT[equipmentKey]) {
    const option = document.querySelector(`input[name="equipment"][value="${equipmentKey}"]`);
    if (option) option.checked = true;
  }
}

function setInputFromParam(params, inputId, paramName) {
  const value = params.get(paramName);
  if (value !== null && value !== "") $(inputId).value = value;
}

async function copyShareLink() {
  try {
    const form = app.currentForm || readForm();
    const url = updateShareUrl(form);
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(url);
    setShareStatus("分享链接已复制。");
  } catch (error) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError" || error.message === "Clipboard unavailable") {
      const form = app.currentForm || readForm();
      updateShareUrl(form);
      setShareStatus("链接已更新到地址栏，可以手动复制。");
      return;
    }
    setShareStatus(error.message || "无法生成分享链接。", true);
  }
}

function updateShareUrl(form) {
  const url = buildShareUrl(form);
  window.history.replaceState(null, "", url);
  return url;
}

function buildShareUrl(form) {
  const params = new URLSearchParams();
  params.set("birth", `${form.birthYear}-${pad2(form.birthMonth)}-${pad2(form.birthDay)}`);
  params.set("time", `${pad2(form.birthHour)}:${pad2(form.birthMinute)}`);
  params.set("birthTz", form.birthTimeZone);
  params.set("obsTz", form.observerTimeZone);
  params.set("lat", form.location.lat.toFixed(4));
  params.set("lon", form.location.lon.toFixed(4));
  params.set("equipment", equipmentKeyFor(form.equipment));
  params.set("years", String(form.horizon));
  if (form.location.name && form.location.name !== DEFAULT_LOCATION.name) {
    params.set("place", form.location.name);
  }
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

function equipmentKeyFor(equipment) {
  return Object.entries(EQUIPMENT).find(([, value]) => value === equipment)?.[0] || "naked";
}

function setShareStatus(message, isWarning = false) {
  const target = $("shareStatus");
  target.textContent = message;
  target.classList.toggle("warning", isWarning);
}

function setLocation(lat, lon, name) {
  $("latitude").value = Number(lat).toFixed(4);
  $("longitude").value = Number(lon).toFixed(4);
  $("placeSearch").value = name || "";
  if (app.marker) app.marker.setLatLng([lat, lon]);
  if (app.map) app.map.panTo([lat, lon], { animate: true });
}

function syncMarkerFromFields() {
  const lat = Number($("latitude").value);
  const lon = Number($("longitude").value);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  if (app.marker) app.marker.setLatLng([lat, lon]);
  if (app.map) app.map.panTo([lat, lon], { animate: true });
}

async function searchPlace() {
  const query = $("placeSearch").value.trim();
  if (!query) return;

  $("placeSearchButton").disabled = true;
  $("placeSearchButton").textContent = "查找中";
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const results = await response.json();
    if (!results.length) throw new Error("没有找到这个地点，请换一个名称或手动输入坐标。");
    const place = results[0];
    const lat = Number(place.lat);
    const lon = Number(place.lon);
    setLocation(lat, lon, place.display_name);
    if (app.map) app.map.setView([lat, lon], 9);
  } catch (error) {
    $("summary").innerHTML = `<span class="warning">${escapeHTML(error.message)}</span>`;
  } finally {
    $("placeSearchButton").disabled = false;
    $("placeSearchButton").textContent = "定位";
  }
}

async function loadCatalog() {
  const status = $("catalogStatus");
  try {
    const response = await fetch("data/star-catalog.json", { cache: "force-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    app.catalog = await response.json();
    app.stars = app.catalog.stars || [];
    await loadCrossIdentifications();
    const meta = app.catalog.meta || {};
    const aliasCount = app.crossMeta?.matchedCount || Object.keys(app.crossIds).length;
    status.textContent = `${(meta.count || app.stars.length).toLocaleString()} stars` +
      (aliasCount ? ` · ${aliasCount.toLocaleString()} names` : "");
  } catch (error) {
    status.textContent = "Catalog failed";
    $("summary").innerHTML = `无法读取 <code>data/star-catalog.json</code>。请通过本地服务器或 GitHub Pages 打开页面。`;
    console.error(error);
  }
}

async function loadCrossIdentifications() {
  try {
    const response = await fetch("data/star-crossids.json", { cache: "force-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    app.crossIds = payload.aliases || {};
    app.crossMeta = payload.meta || null;
  } catch (error) {
    app.crossIds = {};
    app.crossMeta = null;
    console.info("Optional star cross-identifications unavailable.", error);
  }
}

function readForm() {
  const [birthYear, birthMonth, birthDay] = $("birthDate").value.split("-").map(Number);
  const [birthHour, birthMinute] = ($("birthTime").value || "12:00").split(":").map(Number);
  const birthTimeZone = $("birthTimeZone").value.trim();
  const observerTimeZone = $("observerTimeZone").value.trim();
  if (!isValidTimeZone(birthTimeZone)) throw new Error("出生地时区无效，请使用类似 Asia/Shanghai 的 IANA 时区。");
  if (!isValidTimeZone(observerTimeZone)) throw new Error("观测地时区无效，请使用类似 Asia/Shanghai 的 IANA 时区。");

  const lat = Number($("latitude").value);
  const lon = Number($("longitude").value);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("纬度必须在 -90 到 90 之间。");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error("经度必须在 -180 到 180 之间。");

  const equipmentKey = document.querySelector('input[name="equipment"]:checked')?.value || "naked";
  const equipment = EQUIPMENT[equipmentKey] || EQUIPMENT.naked;
  const horizon = clamp(Number($("horizon").value) || 20, 5, 50);
  const birthMs = zonedDateMs(birthYear, birthMonth, birthDay, birthHour, birthMinute, birthTimeZone);
  const placeName = $("placeSearch").value.trim() || DEFAULT_LOCATION.name;

  return {
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute,
    birthTimeZone,
    observerTimeZone,
    birthMs,
    location: {
      name: placeName,
      lat,
      lon,
      light: DEFAULT_LOCATION.light,
    },
    equipment,
    horizon,
  };
}

function computeResults(form) {
  const startYear = nextBirthdayYear(form);
  const years = [];
  for (let year = startYear; year < startYear + form.horizon; year += 1) {
    const anniversary = anniversaryParts(year, form.birthMonth, form.birthDay);
    const targetMs = zonedDateMs(
      year,
      anniversary.month,
      anniversary.day,
      form.birthHour,
      form.birthMinute,
      form.birthTimeZone,
    );
    const targetAgeYears = (targetMs - form.birthMs) / YEAR_MS;
    years.push(computeYear(form, year, anniversary, targetMs, targetAgeYears));
  }
  return years;
}

function computeYear(form, year, anniversary, targetMs, targetAgeYears) {
  const minDistance = app.stars[0]?.distanceLy ?? 0;
  const maxDistance = app.stars[app.stars.length - 1]?.distanceLy ?? 0;
  if (targetAgeYears < minDistance || targetAgeYears > maxDistance) {
    return {
      year,
      anniversary,
      targetMs,
      targetAgeYears,
      precision: null,
      bright: null,
      status: `星表覆盖约 ${minDistance.toFixed(1)} 到 ${maxDistance.toFixed(0)} 光年；这个生日窗口需要 ${targetAgeYears.toFixed(1)} 光年。`,
    };
  }

  const seen = new Set();
  const records = [];
  const spans = [0.03, 0.08, 0.18, 0.4, 0.8, 1.6, 3.2, 6.4, 12, 24];

  for (const span of spans) {
    const nearby = starsInDistanceRange(targetAgeYears, span);
    for (const star of nearby) {
      if (seen.has(star.id)) continue;
      seen.add(star.id);
      if (star.gMag > form.equipment.maxMag) continue;
      const visibility = bestVisibility(star, form, anniversary);
      if (!visibility || visibility.alt < form.equipment.minAlt) continue;
      records.push(candidateRecord(star, form, year, targetMs, targetAgeYears, visibility));
    }

    if (selectPrecision(records, form) && selectBright(records, form)) break;
  }

  const precision = selectPrecision(records, form);
  const bright = selectBright(records, form);
  return {
    year,
    anniversary,
    targetMs,
    targetAgeYears,
    precision,
    bright,
    status: records.length ? `${records.length} 个可见候选进入筛选` : "没有找到满足高度和设备限制的候选",
  };
}

function candidateRecord(star, form, year, targetMs, targetAgeYears, visibility) {
  const arrivalMs = form.birthMs + star.distanceLy * YEAR_MS;
  const arrivalMinMs = form.birthMs + star.distanceMinLy * YEAR_MS;
  const arrivalMaxMs = form.birthMs + star.distanceMaxLy * YEAR_MS;
  const deltaDays = (arrivalMs - targetMs) / DAY_MS;
  return {
    star,
    year,
    targetMs,
    targetAgeYears,
    arrivalMs,
    arrivalMinMs,
    arrivalMaxMs,
    deltaDays,
    absDeltaDays: Math.abs(deltaDays),
    visibility,
  };
}

function selectPrecision(records, form) {
  return records
    .filter((record) => record.star.gMag <= form.equipment.maxMag)
    .slice()
    .sort((a, b) => a.absDeltaDays - b.absDeltaDays || a.star.gMag - b.star.gMag)[0] || null;
}

function selectBright(records, form) {
  const easyPool = records.filter((record) => record.star.gMag <= form.equipment.easyMag);
  const pool = easyPool.length ? easyPool : records;
  return pool
    .slice()
    .sort((a, b) => brightScore(a, form) - brightScore(b, form))[0] || null;
}

function brightScore(record, form) {
  const timePenalty = Math.min(record.absDeltaDays, 900);
  const altitudeBonus = Math.max(0, record.visibility.alt - form.equipment.minAlt) * 2;
  return record.star.gMag * 85 + timePenalty - altitudeBonus;
}

function starsInDistanceRange(targetLy, spanLy) {
  const start = lowerBoundDistance(targetLy - spanLy);
  const end = upperBoundDistance(targetLy + spanLy);
  return app.stars.slice(start, end);
}

function lowerBoundDistance(value) {
  let lo = 0;
  let hi = app.stars.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (app.stars[mid].distanceLy < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBoundDistance(value) {
  let lo = 0;
  let hi = app.stars.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (app.stars[mid].distanceLy <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function bestVisibility(star, form, anniversary) {
  let best = null;
  for (const dayShift of [-1, 0]) {
    const baseMs = zonedDateMs(
      anniversary.year,
      anniversary.month,
      anniversary.day + dayShift,
      0,
      0,
      form.observerTimeZone,
    );
    for (let minutes = 19 * 60; minutes <= 28 * 60; minutes += 30) {
      const sampleMs = baseMs + minutes * 60_000;
      const altAz = horizontalCoords(star.ra, star.dec, sampleMs, form.location.lat, form.location.lon);
      if (!best || altAz.alt > best.alt) {
        best = {
          ...altAz,
          timeMs: sampleMs,
          nightShift: dayShift,
        };
      }
    }
  }
  return best;
}

function horizontalCoords(raDeg, decDeg, ms, latDeg, lonDeg) {
  const lat = latDeg * DEG;
  const dec = decDeg * DEG;
  const ha = normalizeSignedDeg(gmstDeg(ms) + lonDeg - raDeg) * DEG;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  const az = Math.atan2(
    -Math.sin(ha),
    Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(ha),
  );
  return {
    alt: alt * RAD,
    az: normalizeDeg(az * RAD),
  };
}

function observingConditions(record, form) {
  const stepMs = 10 * 60_000;
  const bounds = observingNightBounds(record.visibility.timeMs, form.observerTimeZone);
  const samples = [];

  for (let ms = bounds.startMs; ms <= bounds.endMs; ms += stepMs) {
    const sun = sunEquatorial(ms);
    const moon = moonEquatorial(ms);
    const target = horizontalCoords(record.star.ra, record.star.dec, ms, form.location.lat, form.location.lon);
    const sunAltAz = horizontalCoords(sun.ra, sun.dec, ms, form.location.lat, form.location.lon);
    const moonAltAz = horizontalCoords(moon.ra, moon.dec, ms, form.location.lat, form.location.lon);
    samples.push({
      ms,
      targetAlt: target.alt,
      sunAlt: sunAltAz.alt,
      moonAlt: moonAltAz.alt,
    });
  }

  const minAlt = form.equipment.minAlt;
  const darkWindows = conditionWindows(samples, (sample) => sample.sunAlt <= -18, stepMs, bounds.endMs);
  const targetWindows = conditionWindows(samples, (sample) => sample.targetAlt >= minAlt, stepMs, bounds.endMs);
  const usableWindows = conditionWindows(
    samples,
    (sample) => sample.sunAlt <= -18 && sample.targetAlt >= minAlt,
    stepMs,
    bounds.endMs,
  );
  const bestUsable = samples
    .filter((sample) => sample.sunAlt <= -18 && sample.targetAlt >= minAlt)
    .sort((a, b) => b.targetAlt - a.targetAlt)[0];
  const darkest = samples.slice().sort((a, b) => a.sunAlt - b.sunAlt)[0];
  const moonSample = bestUsable || samples.reduce((best, sample) => (
    Math.abs(sample.ms - record.visibility.timeMs) < Math.abs(best.ms - record.visibility.timeMs) ? sample : best
  ), samples[0]);
  const phase = moonPhase(moonSample.ms);
  const moonText = `${phase.label}，照明约 ${phase.illuminationPercent}%` +
    (moonSample.moonAlt >= 0 ? `，月亮高度 ${moonSample.moonAlt.toFixed(0)}°` : "，月亮在地平线下");

  const usableWindowText = usableWindows.length
    ? formatWindowList(usableWindows, form.observerTimeZone)
    : "目标高度与天文夜无重叠";
  const targetWindowText = targetWindows.length
    ? formatWindowList(targetWindows, form.observerTimeZone)
    : `目标没有高于 ${minAlt}° 的窗口`;
  const darkWindowText = darkWindows.length
    ? formatWindowList(darkWindows, form.observerTimeZone)
    : `无天文夜，太阳最低 ${darkest.sunAlt.toFixed(0)}°`;

  const summary = bestUsable
    ? `观测夜 ${bounds.label}：天文夜 ${darkWindowText}；目标高于 ${minAlt}° 的窗口 ${targetWindowText}；暗夜内最佳约 ${formatClock(bestUsable.ms, form.observerTimeZone)}，目标高度 ${bestUsable.targetAlt.toFixed(0)}°，太阳高度 ${bestUsable.sunAlt.toFixed(0)}°。`
    : `观测夜 ${bounds.label}：天文夜 ${darkWindowText}；目标高于 ${minAlt}° 的窗口 ${targetWindowText}；两者暂未重叠，可以改用相邻日期、降低最低高度或选择更亮候选。`;

  return {
    darkWindowText,
    targetWindowText,
    usableWindowText,
    moonText,
    summary,
  };
}

function observingNightBounds(bestMs, timeZone) {
  const parts = getZonedParts(bestMs, timeZone);
  const eveningDate = parts.hour < 12
    ? shiftLocalDate(parts.year, parts.month, parts.day, -1)
    : { year: parts.year, month: parts.month, day: parts.day };
  const startMs = zonedDateMs(eveningDate.year, eveningDate.month, eveningDate.day, 18, 0, timeZone);
  const endMs = zonedDateMs(eveningDate.year, eveningDate.month, eveningDate.day + 1, 8, 0, timeZone);
  return {
    startMs,
    endMs,
    label: `${eveningDate.year}-${pad2(eveningDate.month)}-${pad2(eveningDate.day)}`,
  };
}

function shiftLocalDate(year, month, day, offsetDays) {
  const date = new Date(Date.UTC(year, month - 1, day + offsetDays, 12, 0, 0));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function conditionWindows(samples, predicate, stepMs, endMs) {
  const windows = [];
  let startMs = null;
  let lastMs = null;

  for (const sample of samples) {
    if (predicate(sample)) {
      if (startMs === null) startMs = sample.ms;
      lastMs = Math.min(sample.ms + stepMs, endMs);
    } else if (startMs !== null) {
      windows.push({ startMs, endMs: lastMs });
      startMs = null;
      lastMs = null;
    }
  }

  if (startMs !== null) windows.push({ startMs, endMs: lastMs });
  return windows;
}

function formatWindowList(windows, timeZone) {
  return windows.map((window) => `${formatClock(window.startMs, timeZone)}-${formatClock(window.endMs, timeZone)}`).join("，");
}

function formatClock(ms, timeZone) {
  const parts = getZonedParts(ms, timeZone);
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

function sunEquatorial(ms) {
  const d = julianDay(ms) - 2451543.5;
  const w = normalizeDeg(282.9404 + 4.70935e-5 * d);
  const e = 0.016709 - 1.151e-9 * d;
  const meanAnomaly = normalizeDeg(356.0470 + 0.9856002585 * d);
  const eccentricAnomaly = meanAnomaly + e * RAD * Math.sin(meanAnomaly * DEG) * (1 + e * Math.cos(meanAnomaly * DEG));
  const xv = Math.cos(eccentricAnomaly * DEG) - e;
  const yv = Math.sqrt(1 - e * e) * Math.sin(eccentricAnomaly * DEG);
  const trueAnomaly = Math.atan2(yv, xv) * RAD;
  const lon = normalizeDeg(trueAnomaly + w);
  const obliquity = (23.4393 - 3.563e-7 * d) * DEG;
  const x = Math.cos(lon * DEG);
  const y = Math.sin(lon * DEG) * Math.cos(obliquity);
  const z = Math.sin(lon * DEG) * Math.sin(obliquity);

  return {
    ra: normalizeDeg(Math.atan2(y, x) * RAD),
    dec: Math.atan2(z, Math.sqrt(x * x + y * y)) * RAD,
  };
}

function moonEquatorial(ms) {
  const d = julianDay(ms) - 2451543.5;
  const node = normalizeDeg(125.1228 - 0.0529538083 * d) * DEG;
  const inclination = 5.1454 * DEG;
  const argPerigee = normalizeDeg(318.0634 + 0.1643573223 * d) * DEG;
  const semiMajorAxis = 60.2666;
  const eccentricity = 0.054900;
  const meanAnomaly = normalizeDeg(115.3654 + 13.0649929509 * d);
  const eccentricAnomaly = meanAnomaly + eccentricity * RAD * Math.sin(meanAnomaly * DEG) * (1 + eccentricity * Math.cos(meanAnomaly * DEG));
  const xOrbital = semiMajorAxis * (Math.cos(eccentricAnomaly * DEG) - eccentricity);
  const yOrbital = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(eccentricAnomaly * DEG);
  const distance = Math.sqrt(xOrbital * xOrbital + yOrbital * yOrbital);
  const trueAnomaly = Math.atan2(yOrbital, xOrbital);
  const lonArg = trueAnomaly + argPerigee;
  const xEcliptic = distance * (Math.cos(node) * Math.cos(lonArg) - Math.sin(node) * Math.sin(lonArg) * Math.cos(inclination));
  const yEcliptic = distance * (Math.sin(node) * Math.cos(lonArg) + Math.cos(node) * Math.sin(lonArg) * Math.cos(inclination));
  const zEcliptic = distance * Math.sin(lonArg) * Math.sin(inclination);
  const obliquity = (23.4393 - 3.563e-7 * d) * DEG;
  const xEquatorial = xEcliptic;
  const yEquatorial = yEcliptic * Math.cos(obliquity) - zEcliptic * Math.sin(obliquity);
  const zEquatorial = yEcliptic * Math.sin(obliquity) + zEcliptic * Math.cos(obliquity);

  return {
    ra: normalizeDeg(Math.atan2(yEquatorial, xEquatorial) * RAD),
    dec: Math.atan2(zEquatorial, Math.sqrt(xEquatorial * xEquatorial + yEquatorial * yEquatorial)) * RAD,
  };
}

function moonPhase(ms) {
  const age = positiveModulo(julianDay(ms) - 2451550.1, SYNODIC_MONTH_DAYS);
  const angle = (age / SYNODIC_MONTH_DAYS) * Math.PI * 2;
  const illuminationPercent = Math.round(((1 - Math.cos(angle)) / 2) * 100);
  const label = moonPhaseLabel(age);
  return { age, illuminationPercent, label };
}

function moonPhaseLabel(age) {
  if (age < 1.84566) return "新月";
  if (age < 5.53699) return "蛾眉月";
  if (age < 9.22831) return "上弦前后";
  if (age < 12.91963) return "盈凸月";
  if (age < 16.61096) return "满月前后";
  if (age < 20.30228) return "亏凸月";
  if (age < 23.99361) return "下弦前后";
  if (age < 27.68493) return "残月";
  return "新月";
}

function julianDay(ms) {
  return ms / DAY_MS + 2440587.5;
}

function gmstDeg(ms) {
  const jd = julianDay(ms);
  const days = jd - 2451545.0;
  return normalizeDeg(280.46061837 + 360.98564736629 * days);
}

function nextBirthdayYear(form) {
  const now = Date.now();
  const nowParts = getZonedParts(now, form.birthTimeZone);
  let year = nowParts.year;
  const anniversary = anniversaryParts(year, form.birthMonth, form.birthDay);
  const thisYearMs = zonedDateMs(
    year,
    anniversary.month,
    anniversary.day,
    form.birthHour,
    form.birthMinute,
    form.birthTimeZone,
  );
  if (thisYearMs <= now) year += 1;
  return year;
}

function anniversaryParts(year, month, day) {
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return { year, month: 2, day: 28, adjusted: true };
  }
  return { year, month, day, adjusted: false };
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function zonedDateMs(year, month, day, hour, minute, timeZone) {
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute);
  let utc = targetUtc;
  for (let i = 0; i < 4; i += 1) {
    const parts = getZonedParts(utc, timeZone);
    const renderedUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    utc -= renderedUtc - targetUtc;
  }
  return utc;
}

function getZonedParts(ms, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
  };
}

function renderResults() {
  const form = app.currentForm;
  const meta = app.catalog.meta || {};
  $("summary").innerHTML = [
    `<strong>${(meta.count || app.stars.length).toLocaleString()} 颗 Gaia DR3 恒星</strong>，约 ${meta.maxDistanceLy || 150} 光年内，G≤${meta.maxGMag || 14}。`,
    `观测点：${escapeHTML(form.location.name)} (${form.location.lat.toFixed(3)}°, ${form.location.lon.toFixed(3)}°)。${escapeHTML(form.location.light)}`,
    `设备：${escapeHTML(form.equipment.label)}，候选上限 G≤${form.equipment.maxMag}，亮星优先 G≤${form.equipment.easyMag}。`,
  ].join("<br>");

  const grid = $("yearGrid");
  grid.innerHTML = app.results.map((result, index) => renderYearCell(result, index)).join("");
  grid.querySelectorAll(".year-cell").forEach((button) => {
    button.addEventListener("click", () => {
      app.selectedIndex = Number(button.dataset.index);
      app.selectedKind = "precision";
      renderResults();
    });
  });

  renderCandidateTabs();
  renderDetail();
}

function renderYearCell(result, index) {
  const active = index === app.selectedIndex ? " active" : "";
  const precision = result.precision ? formatDelta(result.precision.deltaDays) : "无候选";
  const brightMag = result.bright ? `G ${result.bright.star.gMag.toFixed(1)}` : "无";
  const dateLabel = `${result.anniversary.month}/${String(result.anniversary.day).padStart(2, "0")}`;
  const quality = result.precision || result.bright ? "available" : "empty";
  return `
    <button class="year-cell ${quality}${active}" type="button" data-index="${index}">
      <span class="year-cell-top">
        <strong>${result.year}</strong>
        <em>${dateLabel}</em>
      </span>
      <span class="year-cell-data">
        <span>最准 ${escapeHTML(precision)}</span>
        <span>最亮 ${escapeHTML(brightMag)}</span>
      </span>
    </button>
  `;
}

function renderCandidateTabs() {
  const result = app.results[app.selectedIndex];
  const tabs = $("candidateTabs");
  if (!result) {
    tabs.innerHTML = "";
    return;
  }
  const items = [
    { key: "precision", label: "时间最准", record: result.precision },
    { key: "bright", label: "拍摄最稳", record: result.bright },
  ];
  tabs.innerHTML = items.map((item) => {
    const active = app.selectedKind === item.key ? " active" : "";
    const disabled = item.record ? "" : " disabled";
    const name = item.record ? displayName(item.record.star) : "暂无候选";
    return `<button class="tab-button${active}" type="button" data-kind="${item.key}"${disabled}><span>${item.label}</span><strong>${escapeHTML(name)}</strong></button>`;
  }).join("");
  tabs.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      app.selectedKind = button.dataset.kind;
      renderCandidateTabs();
      renderDetail();
    });
  });
}

function renderDetail() {
  const result = app.results[app.selectedIndex];
  const detail = $("detail");
  if (!result) {
    detail.innerHTML = `<p class="empty-state">生成后选择一个年份和候选星。</p>`;
    drawSkyChart(null);
    return;
  }
  const record = result[app.selectedKind] || result.precision || result.bright;
  if (!record) {
    detail.innerHTML = `<p class="empty-state">${escapeHTML(result.status)}</p>`;
    drawSkyChart(null);
    return;
  }
  const star = record.star;
  const form = app.currentForm;
  const kindLabel = app.selectedKind === "bright" ? "拍摄最稳" : "时间最准";
  const simbadUrl = `https://simbad.u-strasbg.fr/simbad/sim-coo?Coord=${encodeURIComponent(`${star.ra} ${star.dec}`)}&Radius=5&Radius.unit=arcsec`;
  const aladinUrl = `https://aladin.cds.unistra.fr/AladinLite/?target=${encodeURIComponent(`${star.ra} ${star.dec}`)}&fov=0.1&survey=P%2FDSS2%2Fcolor`;
  const weatherNote = weatherText(record.targetMs);
  const weatherPanel = renderWeatherPanel(record, form);
  const subtitle = secondaryName(star);
  const identifiers = identifierSummary(star);
  const conditions = observingConditions(record, form);

  detail.innerHTML = `
    <div class="target-label">${kindLabel}</div>
    <h3 class="star-name">${escapeHTML(displayName(star))}</h3>
    ${subtitle ? `<p class="star-subtitle">${escapeHTML(subtitle)}</p>` : ""}
    <div class="metric-grid">
      <div class="metric"><span>抵达时刻</span><strong>${formatZoned(record.arrivalMs, form.observerTimeZone)}</strong></div>
      <div class="metric"><span>生日目标</span><strong>${formatZoned(record.targetMs, form.birthTimeZone)}</strong></div>
      <div class="metric"><span>时间偏差</span><strong>${formatDelta(record.deltaDays)}</strong></div>
      <div class="metric"><span>距离范围</span><strong>${star.distanceMinLy.toFixed(3)} 到 ${star.distanceMaxLy.toFixed(3)} 光年</strong></div>
      <div class="metric"><span>亮度和颜色</span><strong>G ${star.gMag.toFixed(2)}，${colorLabel(star.colorClass)}</strong></div>
      <div class="metric"><span>最佳窗口</span><strong>${formatZoned(record.visibility.timeMs, form.observerTimeZone)}，高度 ${record.visibility.alt.toFixed(0)}°</strong></div>
      <div class="metric"><span>交叉标识</span><strong>${escapeHTML(identifiers)}</strong></div>
      <div class="metric"><span>暗夜可拍</span><strong>${escapeHTML(conditions.usableWindowText)}</strong></div>
      <div class="metric"><span>月相和月高</span><strong>${escapeHTML(conditions.moonText)}</strong></div>
      <div class="metric"><span>坐标</span><strong>RA ${star.ra.toFixed(5)}°，Dec ${star.dec.toFixed(5)}°</strong></div>
      <div class="metric"><span>方位</span><strong>${azLabel(record.visibility.az)} ${record.visibility.az.toFixed(0)}°</strong></div>
    </div>
    <div class="equipment-note">
      <strong>${escapeHTML(form.equipment.label)}</strong>
      <span>${escapeHTML(form.equipment.price)}</span>
      <span>${escapeHTML(form.equipment.skill)}</span>
    </div>
    <ul class="note-list">
      <li>${escapeHTML(form.equipment.note)}</li>
      <li>${escapeHTML(conditions.summary)}</li>
      <li>${escapeHTML(weatherNote)}</li>
      <li>视差不确定性对应抵达范围：${formatZoned(record.arrivalMinMs, form.observerTimeZone)} 到 ${formatZoned(record.arrivalMaxMs, form.observerTimeZone)}。</li>
      <li>找星时可在 Stellarium 或 Aladin 中输入 Gaia source_id：${escapeHTML(star.id)}，再核对相机视场。</li>
      <li>太阳和月亮位置为浏览器端近似星历，用于初筛月光和暮光；正式拍摄前请再用 Stellarium 或天文历核对。</li>
    </ul>
    ${weatherPanel}
    <div class="link-row">
      <a href="${simbadUrl}" target="_blank" rel="noreferrer">SIMBAD</a>
      <a href="${aladinUrl}" target="_blank" rel="noreferrer">Aladin</a>
      <a href="https://gea.esac.esa.int/archive/" target="_blank" rel="noreferrer">Gaia Archive</a>
      <button id="calendarButton" type="button">日历提醒</button>
    </div>
  `;
  bindWeatherControls(record, form);
  bindCalendarDownload(record, form);
  drawSkyChart(record);
}

function renderWeatherPanel(record, form) {
  const availability = weatherAvailability(record.visibility.timeMs);
  const button = availability.available
    ? `<button id="weatherCheckButton" class="secondary-action weather-button" type="button">查询目标夜天气</button>`
    : "";
  return `
    <section class="weather-card" aria-labelledby="weatherTitle">
      <div class="weather-heading">
        <div>
          <span>Weather check</span>
          <strong id="weatherTitle">目标夜天气</strong>
        </div>
        ${button}
      </div>
      <p id="weatherStatus" class="weather-status">${escapeHTML(availability.message)}</p>
      <div id="weatherResult" class="weather-result"></div>
    </section>
  `;
}

function bindWeatherControls(record, form) {
  const button = $("weatherCheckButton");
  if (!button) return;
  button.addEventListener("click", () => checkWeather(record, form));
}

async function checkWeather(record, form) {
  const button = $("weatherCheckButton");
  const status = $("weatherStatus");
  const result = $("weatherResult");
  button.disabled = true;
  button.textContent = "查询中";
  status.textContent = "正在从 Open-Meteo 获取逐小时预报。";
  result.innerHTML = "";

  try {
    const response = await fetch(weatherApiUrl(record, form), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const forecast = await response.json();
    const summary = summarizeForecast(forecast, record.visibility.timeMs, form.observerTimeZone);
    status.textContent = summary.summary;
    result.innerHTML = renderWeatherResult(summary);
  } catch (error) {
    status.innerHTML = `<span class="warning">天气查询失败：${escapeHTML(error.message || "未知错误")}。</span>`;
  } finally {
    button.disabled = false;
    button.textContent = "重新查询天气";
  }
}

function weatherApiUrl(record, form) {
  const params = new URLSearchParams({
    latitude: form.location.lat.toFixed(4),
    longitude: form.location.lon.toFixed(4),
    hourly: [
      "cloud_cover",
      "visibility",
      "precipitation_probability",
      "wind_speed_10m",
      "wind_gusts_10m",
      "temperature_2m",
      "relative_humidity_2m",
    ].join(","),
    forecast_days: "16",
    timezone: "GMT",
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

function summarizeForecast(forecast, targetMs, timeZone) {
  const hourly = forecast.hourly || {};
  const times = hourly.time || [];
  if (!times.length) throw new Error("预报数据为空");

  const rows = times.map((time, index) => ({
    ms: Date.parse(`${time}Z`),
    cloud: numberAt(hourly.cloud_cover, index),
    visibility: numberAt(hourly.visibility, index),
    precip: numberAt(hourly.precipitation_probability, index),
    wind: numberAt(hourly.wind_speed_10m, index),
    gust: numberAt(hourly.wind_gusts_10m, index),
    temp: numberAt(hourly.temperature_2m, index),
    humidity: numberAt(hourly.relative_humidity_2m, index),
  })).filter((row) => Number.isFinite(row.ms));

  const nearby = rows.filter((row) => Math.abs(row.ms - targetMs) <= 2 * 60 * 60_000);
  const sample = nearby.length ? averageWeatherRows(nearby) : nearestWeatherRow(rows, targetMs);
  const grade = weatherGrade(sample);
  const sampleTime = nearestWeatherRow(rows, targetMs).ms;

  return {
    ...sample,
    grade,
    summary: `${grade.label}。预报时间 ${formatZoned(sampleTime, timeZone)}，距离最佳窗口约 ${formatHours((sampleTime - targetMs) / 3_600_000)}。`,
  };
}

function numberAt(values, index) {
  const value = values?.[index];
  return Number.isFinite(value) ? Number(value) : null;
}

function averageWeatherRows(rows) {
  return {
    cloud: average(rows, "cloud"),
    visibility: average(rows, "visibility"),
    precip: average(rows, "precip"),
    wind: average(rows, "wind"),
    gust: average(rows, "gust"),
    temp: average(rows, "temp"),
    humidity: average(rows, "humidity"),
  };
}

function nearestWeatherRow(rows, targetMs) {
  return rows.slice().sort((a, b) => Math.abs(a.ms - targetMs) - Math.abs(b.ms - targetMs))[0];
}

function average(rows, key) {
  const values = rows.map((row) => row[key]).filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weatherGrade(weather) {
  if (
    metricAtLeast(weather.cloud, 75) ||
    metricAtLeast(weather.precip, 45) ||
    metricBelow(weather.visibility, 6000) ||
    metricAtLeast(weather.gust, 40)
  ) {
    return { label: "不推荐拍摄", tone: "bad" };
  }
  if (
    metricAtLeast(weather.cloud, 45) ||
    metricAtLeast(weather.precip, 20) ||
    metricBelow(weather.visibility, 12000) ||
    metricAtLeast(weather.gust, 28)
  ) {
    return { label: "条件一般，需要临近复核", tone: "mixed" };
  }
  return { label: "条件较适合拍摄", tone: "good" };
}

function metricAtLeast(value, threshold) {
  return Number.isFinite(value) && value >= threshold;
}

function metricBelow(value, threshold) {
  return Number.isFinite(value) && value < threshold;
}

function renderWeatherResult(weather) {
  const visibilityKm = Number.isFinite(weather.visibility) ? `${(weather.visibility / 1000).toFixed(1)} km` : "未知";
  return `
    <div class="weather-result-grid ${weather.grade.tone}">
      <div><span>云量</span><strong>${formatWeatherValue(weather.cloud, "%")}</strong></div>
      <div><span>降水概率</span><strong>${formatWeatherValue(weather.precip, "%")}</strong></div>
      <div><span>能见度</span><strong>${visibilityKm}</strong></div>
      <div><span>风速/阵风</span><strong>${formatWeatherValue(weather.wind, " km/h")} / ${formatWeatherValue(weather.gust, " km/h")}</strong></div>
      <div><span>温度</span><strong>${formatWeatherValue(weather.temp, "°C")}</strong></div>
      <div><span>湿度</span><strong>${formatWeatherValue(weather.humidity, "%")}</strong></div>
    </div>
  `;
}

function formatWeatherValue(value, unit) {
  if (!Number.isFinite(value)) return "未知";
  return `${Math.round(value)}${unit}`;
}

function formatHours(hours) {
  const abs = Math.abs(hours);
  if (abs < 0.15) return "0 小时";
  return `${hours >= 0 ? "晚" : "早"} ${abs.toFixed(1)} 小时`;
}

function bindCalendarDownload(record, form) {
  const button = $("calendarButton");
  if (!button) return;
  button.addEventListener("click", () => downloadCalendarEvent(record, form));
}

function downloadCalendarEvent(record, form) {
  const star = record.star;
  const startMs = record.visibility.timeMs;
  const endMs = startMs + 2 * 60 * 60_000;
  const title = `Birthday Starlight: ${displayName(star)}`;
  const description = [
    `Target: ${displayName(star)}`,
    `Gaia DR3 source_id: ${star.id}`,
    `Arrival estimate: ${formatZoned(record.arrivalMs, form.observerTimeZone)}`,
    `Birthday target: ${formatZoned(record.targetMs, form.birthTimeZone)}`,
    `Timing offset: ${formatDelta(record.deltaDays)}`,
    `Distance range: ${star.distanceMinLy.toFixed(3)}-${star.distanceMaxLy.toFixed(3)} light-years`,
    `Magnitude: Gaia G ${star.gMag.toFixed(2)}`,
    `Coordinates: RA ${star.ra.toFixed(5)} deg, Dec ${star.dec.toFixed(5)} deg`,
    `Best window: ${formatZoned(record.visibility.timeMs, form.observerTimeZone)}, altitude ${record.visibility.alt.toFixed(0)} deg, azimuth ${record.visibility.az.toFixed(0)} deg`,
    "Check weather, moonlight, transparency, and framing before observing.",
  ].join("\n");
  const location = `${form.location.name} (${form.location.lat.toFixed(4)}, ${form.location.lon.toFixed(4)})`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Birthday Starlight//Find My Star//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${calendarUid(record, form)}`,
    `DTSTAMP:${formatIcsDate(Date.now())}`,
    `DTSTART:${formatIcsDate(startMs)}`,
    `DTEND:${formatIcsDate(endMs)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(displayName(star))}-${formatIcsDate(startMs).slice(0, 8)}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function calendarUid(record, form) {
  const date = formatIcsDate(record.visibility.timeMs);
  const place = `${form.location.lat.toFixed(4)},${form.location.lon.toFixed(4)}`;
  return `${record.star.id}-${date}-${place}@birthday-starlight`;
}

function formatIcsDate(ms) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function slugify(value) {
  const slug = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "birthday-starlight";
}

function drawSkyChart(record) {
  const canvas = $("skyChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#111613";
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2 + 12;
  const radius = Math.min(w, h) * 0.38;

  ctx.strokeStyle = "rgba(231, 237, 226, 0.22)";
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75, 1].forEach((scale) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * scale, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.fillStyle = "rgba(231, 237, 226, 0.82)";
  ctx.font = "16px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("N", cx, cy - radius - 16);
  ctx.fillText("S", cx, cy + radius + 28);
  ctx.fillText("E", cx + radius + 22, cy + 5);
  ctx.fillText("W", cx - radius - 22, cy + 5);

  ctx.fillStyle = "rgba(184, 195, 182, 0.88)";
  ctx.font = "13px Segoe UI, sans-serif";
  ctx.fillText("90°", cx, cy + 4);
  ctx.fillText("45°", cx, cy - radius * 0.5 - 6);
  ctx.fillText("0° horizon", cx, cy + radius + 14);

  if (!record) {
    ctx.fillStyle = "rgba(184, 195, 182, 0.9)";
    ctx.fillText("等待目标", cx, cy);
    return;
  }

  const alt = clamp(record.visibility.alt, 0, 90);
  const az = record.visibility.az * DEG;
  const r = ((90 - alt) / 90) * radius;
  const x = cx + Math.sin(az) * r;
  const y = cy - Math.cos(az) * r;
  const color = STAR_COLORS[record.star.colorClass] || STAR_COLORS.unknown;

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(x, y);
  ctx.stroke();

  ctx.fillStyle = "#f4f6f0";
  ctx.font = "14px Segoe UI, sans-serif";
  ctx.textAlign = x > cx ? "left" : "right";
  ctx.fillText(displayName(record.star), x + (x > cx ? 12 : -12), y - 10);
  ctx.fillStyle = "rgba(231, 237, 226, 0.88)";
  ctx.fillText(`Alt ${record.visibility.alt.toFixed(0)}° · Az ${record.visibility.az.toFixed(0)}°`, x + (x > cx ? 12 : -12), y + 10);
}

function drawStarscape() {
  const canvas = $("starscape");
  const ctx = canvas.getContext("2d");
  let stars = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.min(130, Math.floor(window.innerWidth / 9)) }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.1 + 0.2,
      alpha: Math.random() * 0.22 + 0.08,
    }));
  }

  function frame() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.fillStyle = "rgba(42, 67, 52, 0.05)";
    for (const star of stars) {
      ctx.globalAlpha = star.alpha;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
}

function displayName(star) {
  const aliases = aliasFor(star);
  if (aliases?.commonName) return aliases.commonName;
  if (aliases?.bayerName) return aliases.bayerName;
  if (aliases?.hip) return aliases.hip;
  if (aliases?.hd) return aliases.hd;
  if (aliases?.gj) return aliases.gj;
  return star.designation || `Gaia DR3 ${star.id}`;
}

function secondaryName(star) {
  const aliases = aliasFor(star);
  if (!aliases) return "";
  const names = [
    aliases.commonName ? aliases.bayerName : "",
    aliases.simbadMainId && aliases.simbadMainId !== aliases.bayerDesignation ? aliases.simbadMainId : "",
    star.designation || `Gaia DR3 ${star.id}`,
  ].filter(Boolean);
  return unique(names).join(" · ");
}

function identifierSummary(star) {
  const aliases = aliasFor(star);
  if (!aliases) return `Gaia DR3 ${star.id}`;
  const identifiers = [
    aliases.hip,
    aliases.hd,
    aliases.hr,
    aliases.gj,
    aliases.simbadMainId ? `SIMBAD ${aliases.simbadMainId}` : "",
    `Gaia DR3 ${star.id}`,
  ].filter(Boolean);
  return unique(identifiers).join(" · ");
}

function aliasFor(star) {
  return app.crossIds?.[star.id] || null;
}

function unique(values) {
  return [...new Set(values)];
}

function colorLabel(colorClass) {
  return {
    "blue-white": "蓝白色",
    white: "白色",
    "yellow-white": "黄白色",
    orange: "橙色",
    red: "红色",
    unknown: "颜色未知",
  }[colorClass] || "颜色未知";
}

function weatherAvailability(observationMs) {
  const daysAway = (observationMs - Date.now()) / DAY_MS;
  if (daysAway < -1) {
    return {
      available: false,
      message: "这个最佳窗口已经不在未来预报范围内。请以实际观测前的天气为准。",
    };
  }
  if (daysAway > 16) {
    return {
      available: false,
      message: "目标夜距离现在超过 16 天，天气预报还不可靠；临近拍摄前再查询。",
    };
  }
  return {
    available: true,
    message: "目标夜已进入 16 天预报窗口，可查询云量、降水概率、能见度和风。",
  };
}

function weatherText(targetMs) {
  const daysAway = (targetMs - Date.now()) / DAY_MS;
  if (daysAway >= 0 && daysAway <= 16) {
    return "目标日期已进入常规天气预报窗口，可在拍摄前再查云量、透明度、风和月相。";
  }
  return "目标日期距离现在超过常规可靠天气预报窗口，多年后的云量只能临近拍摄前再确认。";
}

function formatDelta(days) {
  const abs = Math.abs(days);
  if (abs < 0.04) return "几乎同刻";
  const direction = days >= 0 ? "晚" : "早";
  if (abs < 1) return `${direction} ${(abs * 24).toFixed(1)} 小时`;
  if (abs < 45) return `${direction} ${abs.toFixed(1)} 天`;
  return `${direction} ${(abs / 30.4375).toFixed(1)} 个月`;
}

function formatZoned(ms, timeZone) {
  const parts = getZonedParts(ms, timeZone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)} ${timeZone}`;
}

function azLabel(az) {
  const labels = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  return labels[Math.round(normalizeDeg(az) / 45) % 8];
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeDeg(value) {
  return ((value % 360) + 360) % 360;
}

function normalizeSignedDeg(value) {
  const deg = normalizeDeg(value);
  return deg > 180 ? deg - 360 : deg;
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}
