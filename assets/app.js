const DAY_MS = 86_400_000;
const JULIAN_YEAR_DAYS = 365.25;
const YEAR_MS = DAY_MS * JULIAN_YEAR_DAYS;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

const CITY_PRESETS = {
  hefei: { name: "合肥", lat: 31.8206, lon: 117.2272, bortle: "约 Bortle 8，城区光污染强" },
  anqing: { name: "安庆", lat: 30.5435, lon: 117.0638, bortle: "约 Bortle 5-6，郊外更好" },
  beijing: { name: "北京", lat: 39.9042, lon: 116.4074, bortle: "约 Bortle 8-9，建议远郊" },
  shanghai: { name: "上海", lat: 31.2304, lon: 121.4737, bortle: "约 Bortle 9，暗星难度高" },
  guangzhou: { name: "广州", lat: 23.1291, lon: 113.2644, bortle: "约 Bortle 8-9，建议郊外" },
  chengdu: { name: "成都", lat: 30.5728, lon: 104.0668, bortle: "约 Bortle 7-8，透明度常是关键" },
  custom: { name: "自定义地点", lat: 31.8206, lon: 117.2272, bortle: "自定义坐标，光污染需临近查询" },
};

const EQUIPMENT = {
  visual: {
    label: "肉眼/双筒优先",
    maxMag: 7.0,
    easyMag: 5.8,
    minAlt: 28,
    note: "优先亮星。城市里仍要避开月光和灯光，暗于 G6 的目标建议至少使用双筒或相机。",
  },
  telephoto: {
    label: "相机长焦/轻量赤道仪",
    maxMag: 11.0,
    easyMag: 8.2,
    minAlt: 25,
    note: "适合 300-600mm 镜头、稳定三脚架或轻量赤道仪，多张堆栈会明显降低难度。",
  },
  tracker: {
    label: "小望远镜/堆栈拍摄",
    maxMag: 13.5,
    easyMag: 9.8,
    minAlt: 23,
    note: "允许更暗但时间更准的目标。建议赤道仪、导星或短曝光堆栈，并使用星图确认视场。",
  },
  deep: {
    label: "进阶民用设备",
    maxMag: 14.0,
    easyMag: 10.5,
    minAlt: 22,
    note: "接近当前星表亮度下限，适合熟悉极轴、堆栈、暗场和平场处理的拍摄者。",
  },
};

const STAR_COLORS = {
  "blue-white": "#bfd7ff",
  white: "#f4f7ff",
  "yellow-white": "#fff2b8",
  orange: "#ffd08a",
  red: "#ff9f87",
  unknown: "#e6f3ff",
};

const app = {
  catalog: null,
  stars: [],
  results: [],
  selectedIndex: 0,
  selectedKind: "precision",
  currentForm: null,
};

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", init);

async function init() {
  setDefaultBirthDate();
  bindControls();
  drawStarscape();
  await loadCatalog();
  $("birthForm").dispatchEvent(new Event("submit", { cancelable: true }));
}

function setDefaultBirthDate() {
  $("birthDate").value = "1990-01-01";
  $("birthTime").value = "12:00";
}

function bindControls() {
  $("locationPreset").addEventListener("change", () => {
    const preset = CITY_PRESETS[$("locationPreset").value] || CITY_PRESETS.hefei;
    $("latitude").value = preset.lat;
    $("longitude").value = preset.lon;
  });

  $("birthForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!app.catalog) return;
    const form = readForm();
    app.currentForm = form;
    app.results = computeResults(form);
    app.selectedIndex = 0;
    app.selectedKind = "precision";
    renderResults();
  });
}

async function loadCatalog() {
  const status = $("catalogStatus");
  try {
    const response = await fetch("data/star-catalog.json", { cache: "force-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    app.catalog = await response.json();
    app.stars = app.catalog.stars || [];
    const meta = app.catalog.meta || {};
    status.textContent = `${(meta.count || app.stars.length).toLocaleString()} 颗星已载入`;
  } catch (error) {
    status.textContent = "星表载入失败";
    $("summary").innerHTML = `无法读取 <code>data/star-catalog.json</code>。请通过本地服务器或 GitHub Pages 打开页面。`;
    console.error(error);
  }
}

function readForm() {
  const [birthYear, birthMonth, birthDay] = $("birthDate").value.split("-").map(Number);
  const [birthHour, birthMinute] = ($("birthTime").value || "12:00").split(":").map(Number);
  const offsetHours = Number($("timeZoneOffset").value);
  const presetKey = $("locationPreset").value;
  const preset = CITY_PRESETS[presetKey] || CITY_PRESETS.hefei;
  const lat = Number($("latitude").value);
  const lon = Number($("longitude").value);
  const equipment = EQUIPMENT[$("equipment").value] || EQUIPMENT.telephoto;
  const horizon = clamp(Number($("horizon").value) || 20, 5, 50);
  const birthMs = zonedDateMs(birthYear, birthMonth, birthDay, birthHour, birthMinute, offsetHours);
  return {
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute,
    offsetHours,
    birthMs,
    location: {
      name: presetKey === "custom" ? "自定义地点" : preset.name,
      lat,
      lon,
      bortle: presetKey === "custom" ? CITY_PRESETS.custom.bortle : preset.bortle,
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
      form.offsetHours,
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
      status: `星表覆盖约 ${minDistance.toFixed(1)}-${maxDistance.toFixed(0)} 光年；这个生日窗口需要 ${targetAgeYears.toFixed(1)} 光年。`,
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
    .sort((a, b) => brightScore(a, form) - brightScore(b, form))
    [0] || null;
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
      form.offsetHours,
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

function gmstDeg(ms) {
  const jd = ms / DAY_MS + 2440587.5;
  const days = jd - 2451545.0;
  return normalizeDeg(280.46061837 + 360.98564736629 * days);
}

function nextBirthdayYear(form) {
  const now = Date.now();
  const localNow = new Date(now + form.offsetHours * 3_600_000);
  let year = localNow.getUTCFullYear();
  const anniversary = anniversaryParts(year, form.birthMonth, form.birthDay);
  const thisYearMs = zonedDateMs(
    year,
    anniversary.month,
    anniversary.day,
    form.birthHour,
    form.birthMinute,
    form.offsetHours,
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

function zonedDateMs(year, month, day, hour, minute, offsetHours) {
  return Date.UTC(year, month - 1, day, hour, minute) - offsetHours * 3_600_000;
}

function renderResults() {
  const form = app.currentForm;
  const meta = app.catalog.meta || {};
  $("summary").innerHTML = [
    `星表：${(meta.count || app.stars.length).toLocaleString()} 颗 Gaia DR3 近邻恒星，约 ${meta.maxDistanceLy || 150} 光年内，G≤${meta.maxGMag || 14}。`,
    `观测地点：${form.location.name} (${form.location.lat.toFixed(3)}°, ${form.location.lon.toFixed(3)}°)，${form.location.bortle}。`,
    `设备档位：${form.equipment.label}，时间候选上限 G≤${form.equipment.maxMag}，亮星候选优先 G≤${form.equipment.easyMag}。`,
  ].join("<br>");

  const timeline = $("timeline");
  timeline.innerHTML = app.results.map((result, index) => renderYearRow(result, index)).join("");
  timeline.querySelectorAll(".year-button").forEach((button) => {
    button.addEventListener("click", () => {
      app.selectedIndex = Number(button.dataset.index);
      app.selectedKind = "precision";
      renderResults();
    });
  });

  renderCandidateTabs();
  renderDetail();
}

function renderYearRow(result, index) {
  const active = index === app.selectedIndex ? " active" : "";
  const precision = result.precision ? formatDelta(result.precision.deltaDays) : "无";
  const bright = result.bright ? `${displayName(result.bright.star)} / G${result.bright.star.gMag.toFixed(1)}` : "无";
  const dateLabel = `${result.anniversary.month}-${String(result.anniversary.day).padStart(2, "0")}`;
  return `
    <div class="year-row">
      <button class="year-button${active}" type="button" data-index="${index}">
        <div class="year-main">
          <div class="year-number">${result.year}</div>
          <div>
            <div class="year-title">${dateLabel} 生日夜</div>
            <div class="year-sub">目标距离 ${result.targetAgeYears.toFixed(3)} 光年 · 时间最准 ${precision} · 拍摄最稳 ${bright}</div>
          </div>
          <span class="pill">${result.precision || result.bright ? "可筛选" : "空窗"}</span>
        </div>
      </button>
    </div>
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
    return `<button class="tab-button${active}" type="button" data-kind="${item.key}"${disabled}>${item.label}<br><span>${item.record ? displayName(item.record.star) : "暂无候选"}</span></button>`;
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
    detail.innerHTML = `<p class="empty-state">${result.status}</p>`;
    drawSkyChart(null);
    return;
  }
  const star = record.star;
  const form = app.currentForm;
  const kindLabel = app.selectedKind === "bright" ? "拍摄最稳" : "时间最准";
  const simbadUrl = `https://simbad.u-strasbg.fr/simbad/sim-coo?Coord=${encodeURIComponent(`${star.ra} ${star.dec}`)}&Radius=5&Radius.unit=arcsec`;
  const aladinUrl = `https://aladin.cds.unistra.fr/AladinLite/?target=${encodeURIComponent(`${star.ra} ${star.dec}`)}&fov=0.1&survey=P%2FDSS2%2Fcolor`;
  const weatherNote = weatherText(record.targetMs);

  detail.innerHTML = `
    <div class="kind-label">${kindLabel}</div>
    <h3 class="star-name">${displayName(star)}</h3>
    <div class="metric-grid">
      <div class="metric"><span>抵达时刻</span><strong>${formatZoned(record.arrivalMs, form.offsetHours)}</strong></div>
      <div class="metric"><span>生日目标</span><strong>${formatZoned(record.targetMs, form.offsetHours)}</strong></div>
      <div class="metric"><span>时间偏差</span><strong>${formatDelta(record.deltaDays)}</strong></div>
      <div class="metric"><span>距离范围</span><strong>${star.distanceMinLy.toFixed(3)}-${star.distanceMaxLy.toFixed(3)} 光年</strong></div>
      <div class="metric"><span>亮度</span><strong>G ${star.gMag.toFixed(2)} · ${colorLabel(star.colorClass)}</strong></div>
      <div class="metric"><span>最佳窗口</span><strong>${formatZoned(record.visibility.timeMs, form.offsetHours)} · 高度 ${record.visibility.alt.toFixed(0)}°</strong></div>
      <div class="metric"><span>坐标</span><strong>RA ${star.ra.toFixed(5)}° · Dec ${star.dec.toFixed(5)}°</strong></div>
      <div class="metric"><span>方位</span><strong>${azLabel(record.visibility.az)} ${record.visibility.az.toFixed(0)}°</strong></div>
    </div>
    <ul class="note-list">
      <li>${form.equipment.note}</li>
      <li>${weatherNote}</li>
      <li>视差不确定性对应抵达范围：${formatZoned(record.arrivalMinMs, form.offsetHours)} 到 ${formatZoned(record.arrivalMaxMs, form.offsetHours)}。</li>
      <li>找星时建议先在 Stellarium 或 Aladin 中输入 Gaia source_id：${star.id}，再核对相机视场。</li>
    </ul>
    <div class="link-row">
      <a href="${simbadUrl}" target="_blank" rel="noreferrer">SIMBAD 坐标检索</a>
      <a href="${aladinUrl}" target="_blank" rel="noreferrer">Aladin 巡天图</a>
      <a href="https://gea.esac.esa.int/archive/" target="_blank" rel="noreferrer">Gaia Archive</a>
    </div>
  `;
  drawSkyChart(record);
}

function drawSkyChart(record) {
  const canvas = $("skyChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#03080d";
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2 + 12;
  const radius = Math.min(w, h) * 0.38;

  ctx.strokeStyle = "rgba(151, 205, 255, 0.26)";
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75, 1].forEach((scale) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * scale, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.fillStyle = "rgba(239, 247, 255, 0.76)";
  ctx.font = "16px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("N", cx, cy - radius - 16);
  ctx.fillText("S", cx, cy + radius + 28);
  ctx.fillText("E", cx + radius + 22, cy + 5);
  ctx.fillText("W", cx - radius - 22, cy + 5);

  ctx.fillStyle = "rgba(150, 169, 186, 0.86)";
  ctx.font = "13px Segoe UI, sans-serif";
  ctx.fillText("90°", cx, cy + 4);
  ctx.fillText("45°", cx, cy - radius * 0.5 - 6);
  ctx.fillText("0° horizon", cx, cy + radius + 14);

  if (!record) {
    ctx.fillStyle = "rgba(150, 169, 186, 0.9)";
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
  ctx.shadowBlur = 20;
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

  ctx.fillStyle = "#eff7ff";
  ctx.font = "14px Segoe UI, sans-serif";
  ctx.textAlign = x > cx ? "left" : "right";
  ctx.fillText(displayName(record.star), x + (x > cx ? 12 : -12), y - 10);
  ctx.fillStyle = "rgba(150, 169, 186, 0.95)";
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
    stars = Array.from({ length: Math.min(220, Math.floor(window.innerWidth / 6)) }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.25,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function frame(time) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const star of stars) {
      const pulse = 0.45 + Math.sin(time / 1200 + star.phase) * 0.25;
      ctx.fillStyle = `rgba(207, 238, 255, ${pulse})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
}

function displayName(star) {
  return star.designation || `Gaia DR3 ${star.id}`;
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

function weatherText(targetMs) {
  const daysAway = (targetMs - Date.now()) / DAY_MS;
  if (daysAway >= 0 && daysAway <= 16) {
    return "目标日期已进入常规天气预报窗口，可在拍摄前再查 Open-Meteo、云图、透明度和月相。";
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

function formatZoned(ms, offsetHours) {
  const date = new Date(ms + offsetHours * 3_600_000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm} UTC${offsetHours >= 0 ? "+" : ""}${offsetHours}`;
}

function azLabel(az) {
  const labels = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  return labels[Math.round(normalizeDeg(az) / 45) % 8];
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
