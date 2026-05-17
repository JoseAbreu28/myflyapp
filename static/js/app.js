const TAB_NAMES = ["dashboard", "flightplan"];

let activeTab = "dashboard";
let aerodromeMapReady = false;
let aerodromeMapFplReady = false;
let fplRouteMap = null;
let fplRouteLayer = null;
let lastPibRaw = null;
const RAW_CLOUD_BASE_RE = /\b(FEW|SCT|BKN|OVC|VV)(\d{3})\b/g;

function updateUtcClock() {
  const el = document.getElementById("utc-clock");
  if (!el) return;
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  el.textContent = `${hh}:${mm}:${ss}`;
}

function setCategoryBadge(elementId, category) {
  const badge = document.getElementById(elementId);
  if (!badge) return;
  const normalized = (category || "UNKNOWN").toUpperCase();
  const className = normalized.toLowerCase();

  badge.textContent = normalized;
  badge.className = "badge " + className;
  if (!["vfr", "mvfr", "ifr", "lifr"].includes(className)) {
    badge.className = "badge unknown";
  }
}

function setText(id, value, suffix = "") {
  const el = document.getElementById(id);
  if (!el) return;
  const empty = value === null || value === undefined || value === "";
  el.textContent = empty ? "--" : `${value}${suffix}`;
}

function renderMetarUnavailable(prefix, unavailableText) {
  setCategoryBadge(`${prefix}-category`, "UNKNOWN");
  const badge = document.getElementById(`${prefix}-category`);
  if (badge) badge.textContent = "DATA UNAVAILABLE";

  setText(`${prefix}-raw`, unavailableText);
  [
    `${prefix}-wind`,
    `${prefix}-visibility`,
    `${prefix}-ceiling`,
    `${prefix}-qnh`,
    `${prefix}-temp`,
    `${prefix}-dew`,
    `${prefix}-time`,
  ].forEach((id) => setText(id, "--"));
  if (prefix === "metar") {
    updateWindCompass(null, null);
    updateCeilingVisual(null);
  }
}

function updateWindCompass(directionDeg, speedKt) {
  const arrow = document.getElementById("metar-wind-arrow");
  const detail = document.getElementById("metar-wind-detail");
  if (!arrow || !detail) return;

  if (directionDeg === null || directionDeg === undefined || Number.isNaN(Number(directionDeg))) {
    arrow.style.transform = "translate(-50%, -90%) rotate(0deg)";
    detail.textContent = "Wind direction and speed unavailable";
    return;
  }

  const dir = Number(directionDeg);
  arrow.style.transform = `translate(-50%, -90%) rotate(${dir}deg)`;
  const spd = speedKt === null || speedKt === undefined ? "--" : speedKt;
  detail.textContent = `${dir} deg at ${spd} kt`;
}

function getCloudBaseFromRaw(rawMetar) {
  if (!rawMetar) return null;
  const matches = [...rawMetar.matchAll(RAW_CLOUD_BASE_RE)];
  if (!matches.length) return null;
  const values = matches.map((m) => Number(m[2]) * 100).filter((v) => Number.isFinite(v));
  if (!values.length) return null;
  return Math.min(...values);
}

function updateCeilingVisual(ceilingFt, rawMetar) {
  const layer = document.getElementById("metar-cloud-layer");
  const detail = document.getElementById("metar-ceiling-detail");
  if (!layer || !detail) return;

  let value = ceilingFt;
  let detailPrefix = "Estimated cloud ceiling";
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    value = getCloudBaseFromRaw(rawMetar);
    detailPrefix = "Lowest cloud base";
  }

  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    layer.style.top = "8px";
    detail.textContent = "Cloud ceiling unavailable";
    return;
  }

  value = Math.max(0, Math.min(3000, Number(value)));
  const scaleHeight = 104;
  const topPx = scaleHeight - (value / 3000) * scaleHeight;
  layer.style.top = `${Math.max(4, Math.min(104, topPx))}px`;
  detail.textContent = `${detailPrefix}: ${Math.round(value)} ft`;
}

function renderMetar(prefix, data) {
  setCategoryBadge(`${prefix}-category`, data.flight_category);
  setText(`${prefix}-raw`, data.raw || "Raw METAR unavailable");

  const windDir = data.wind_dir !== null && data.wind_dir !== undefined ? `${data.wind_dir} deg` : "VRB";
  const windSpd = data.wind_speed !== null && data.wind_speed !== undefined ? `${data.wind_speed} kt` : "--";
  setText(`${prefix}-wind`, `${windDir} / ${windSpd}`);
  setText(`${prefix}-visibility`, data.visibility, " sm");
  setText(`${prefix}-ceiling`, data.ceiling, " ft");
  setText(`${prefix}-qnh`, data.altimeter, " inHg");
  setText(`${prefix}-temp`, data.temp, " C");
  setText(`${prefix}-dew`, data.dewpoint, " C");
  setText(`${prefix}-time`, data.obs_time || data.cached_at || "--");
  if (prefix === "metar") {
    updateWindCompass(data.wind_dir, data.wind_speed);
    updateCeilingVisual(data.ceiling, data.raw);
  }
}

async function loadMetar(icao, prefix) {
  try {
    const response = await fetch(`/api/metar/${icao}`);
    const data = await response.json();

    if (data.error) {
      renderMetarUnavailable(prefix, "METAR unavailable");
      return;
    }

    renderMetar(prefix, data);
  } catch (_err) {
    renderMetarUnavailable(prefix, "METAR unavailable");
  }
}

async function loadTaf(icao, targetId = "taf-raw") {
  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    const response = await fetch(`/api/taf/${icao}`);
    const data = await response.json();

    if (data.error || !data.raw) {
      target.textContent = "TAF unavailable";
      return;
    }

    target.textContent = data.raw;
  } catch (_err) {
    target.textContent = "TAF unavailable";
  }
}

function setupEmbedFallbacks() {
  const containers = document.querySelectorAll("[data-embed-container]");
  containers.forEach((container) => {
    const frame = container.querySelector("[data-embed-frame]");
    const fallback = container.parentElement.querySelector("[data-embed-fallback]");
    if (!frame || !fallback) return;

    frame.addEventListener("error", () => {
      container.style.display = "none";
      fallback.classList.remove("fallback-hidden");
    });
  });
}

function lazyLoadWindy() {
  const frame = document.getElementById("windy-frame");
  if (!frame) return;
  if (frame.getAttribute("src")) return;

  const src = frame.getAttribute("data-windy-src");
  if (src) frame.setAttribute("src", src);
}

function buildAerodromeMap(mapId) {
  const mapEl = document.getElementById(mapId);
  if (!mapEl || !window.L) return;

  const map = L.map(mapId);
  map.setView([38.4, -13.5], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  const aerodromes = Array.isArray(window.AERODROMES) ? window.AERODROMES : [];
  aerodromes.forEach((ad) => {
    const marker = L.marker([ad.lat, ad.lon]).addTo(map);
    marker.bindPopup(
      `<strong>${ad.icao} - ${ad.name}</strong><br>` +
      `Name&nbsp;&nbsp;Page<br>` +
      `Aerodrome Chart<br><button class="btn popup-btn" type="button" onclick="openChartPreview('${ad.adc_pdf_url}', '${ad.icao} ADC')">Preview ADC</button><br>` +
      `Visual Approach Chart<br><button class="btn popup-btn" type="button" onclick="openChartPreview('${ad.vac_pdf_url}', '${ad.icao} VAC')">Preview VAC</button><br>` +
      `<a href="${ad.aip_url}" target="_blank" rel="noopener noreferrer">Open eAIP Page</a>`
    );
  });
  setTimeout(() => map.invalidateSize(), 150);
}

function initAerodromeMap() {
  if (aerodromeMapReady) return;
  buildAerodromeMap("portugal-aerodromes-map");
  aerodromeMapReady = true;
}

function initAerodromeMapFpl() {
  if (aerodromeMapFplReady) return;
  buildAerodromeMap("portugal-aerodromes-map-fpl");
  aerodromeMapFplReady = true;
}

function openChartPreview(url, title) {
  const modal = document.getElementById("chart-preview-modal");
  const frame = document.getElementById("chart-preview-frame");
  const caption = document.getElementById("chart-preview-title");
  if (!modal || !frame || !caption) return;
  frame.src = url;
  caption.textContent = title;
  modal.classList.remove("hidden");
}
window.openChartPreview = openChartPreview;

function closeChartPreview() {
  const modal = document.getElementById("chart-preview-modal");
  const frame = document.getElementById("chart-preview-frame");
  if (!modal || !frame) return;
  modal.classList.add("hidden");
  frame.src = "";
}

function initChartModal() {
  document.querySelectorAll("[data-close-modal]").forEach((node) => {
    node.addEventListener("click", closeChartPreview);
  });
}

function initFrequencyBoard() {
  const aerodromes = Array.isArray(window.AERODROMES) ? window.AERODROMES : [];
  const byIcao = Object.fromEntries(aerodromes.map((ad) => [ad.icao, ad]));
  const selectedEl = document.getElementById("icao-select");
  const atisSelectedEl = document.getElementById("freq-atis-selected");
  const lpvlEl = document.getElementById("freq-lpvl");
  const lpprEl = document.getElementById("freq-lppr");
  const customOutEl = document.getElementById("freq-custom");
  const customInputEl = document.getElementById("freq-icao-input");
  const customBtn = document.getElementById("freq-icao-btn");
  if (!atisSelectedEl || !lpvlEl || !lpprEl || !customOutEl || !customInputEl || !customBtn) return;

  const lpvl = byIcao.LPVL;
  const lppr = byIcao.LPPR;
  lpvlEl.textContent = lpvl ? lpvl.main_freq : "N/A";
  lpprEl.textContent = lppr ? lppr.main_freq : "N/A";

  const renderSelectedAtis = () => {
    const icao = (selectedEl?.value || "LPPR").toUpperCase();
    const ad = byIcao[icao];
    atisSelectedEl.textContent = ad ? `${icao}: ${ad.atis || "N/A"}` : `${icao}: N/A`;
  };

  const renderCustom = () => {
    const icao = (customInputEl.value || "").trim().toUpperCase();
    if (!icao) {
      customOutEl.textContent = "--";
      return;
    }
    const ad = byIcao[icao];
    customOutEl.textContent = ad ? `${icao}: ${ad.main_freq || "N/A"}` : `${icao}: N/A`;
  };

  if (selectedEl) selectedEl.addEventListener("change", renderSelectedAtis);
  customBtn.addEventListener("click", renderCustom);
  customInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") renderCustom();
  });
  renderSelectedAtis();
}

function initQuickBox() {
  const select = document.getElementById("icao-select");
  if (!select) return;

  const loadSelected = () => {
    const icao = (select.value || "LPPR").toUpperCase();
    loadMetar(icao, "quick-metar");
    loadTaf(icao, "quick-taf-raw");
  };

  select.addEventListener("change", loadSelected);
  loadSelected();
  setInterval(loadSelected, 5 * 60 * 1000);
}

function initFlightPlanBuilder() {
  const planeEl = document.getElementById("fpl-plane");
  const missionTypeEl = document.getElementById("fpl-mission-type");
  const circuitEl = document.getElementById("fpl-circuit");
  const quickDepWrapEl = document.getElementById("fpl-quick-dep-wrap");
  const quickDestWrapEl = document.getElementById("fpl-quick-dest-wrap");
  const quickDepEl = document.getElementById("fpl-quick-dep");
  const quickDestEl = document.getElementById("fpl-quick-dest");
  const wantsNotamEl = document.getElementById("fpl-wants-notam");
  const notamHelperEl = document.getElementById("fpl-notam-helper");
  const quickDateEl = document.getElementById("fpl-quick-date");
  const quickTimeEl = document.getElementById("fpl-quick-time");
  const instructorWrapEl = document.getElementById("fpl-instructor-wrap");
  const instructorEl = document.getElementById("fpl-instructor");
  const aircraftIdEl = document.getElementById("fpl-aircraft-id");
  if (!planeEl || !aircraftIdEl) return;

  const presets = {
    "CS-EAU": {
      aircraftId: "CSEAU",
      typeAircraft: "C150",
      eobt: "1100",
      speed: "N0090",
      level: "A015",
      route: "DCT",
      ades: "LPVL",
      eet: "0100",
      alt1: "LPBR",
      alt2: "",
      other: "DOF/260428 LOCAL FLIGHT RMK/INSTRUCTION",
      endurance: "0430",
      pob: "2",
      emergencyRadio: "VE",
      aircraftColor: "WHITE",
      pic: "",
      missionType: "instruction",
      circuit: "yes",
    },
    "D-ELFA": {
      aircraftId: "DELFA",
      typeAircraft: "C152",
      eobt: "1645",
      speed: "N0090",
      level: "A030",
      route: "DCT PFERR DCT",
      ades: "LPVL",
      eet: "0100",
      alt1: "LPBR",
      alt2: "",
      other: "DOF/251012 RMK/INSTRUCTION FLIGHT",
      endurance: "0430",
      pob: "2",
      emergencyRadio: "VE",
      aircraftColor: "WHITE",
      pic: "",
      missionType: "instruction",
      circuit: "no",
    },
    "CS-ASP": {
      aircraftId: "CSASP",
      typeAircraft: "C152",
      eobt: "1700",
      speed: "N0090",
      level: "A015",
      route: "DCT",
      ades: "LPVL",
      eet: "0100",
      alt1: "LPBR",
      alt2: "LPVR",
      other: "DOF/260517 RMK/LOCAL INSTRUCTION FLIGHT",
      endurance: "0430",
      pob: "2",
      emergencyRadio: "VE",
      aircraftColor: "WHITE",
      pic: "",
      missionType: "instruction",
      circuit: "no",
    },
    "CS-AUD": {
      aircraftId: "CSAUD",
      typeAircraft: "C152",
      eobt: "1700",
      speed: "N0090",
      level: "A015",
      route: "DCT",
      ades: "LPVL",
      eet: "0100",
      alt1: "LPBR",
      alt2: "",
      other: "DOF/260517 RMK/LOCAL FLIGHT",
      endurance: "0430",
      pob: "2",
      emergencyRadio: "VE",
      aircraftColor: "WHITE",
      pic: "",
      missionType: "normal",
      circuit: "no",
    },
  };

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? "";
  };

  const buildDofTag = () => {
    const src = quickDateEl?.value;
    const d = src ? new Date(`${src}T00:00:00Z`) : new Date();
    const yy = String(d.getUTCFullYear()).slice(-2);
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
  };

  const syncRouteAndOtherInformation = () => {
    const routeEl = document.getElementById("fpl-route");
    const otherEl = document.getElementById("fpl-other");
    const eobtEl = document.getElementById("fpl-eobt");
    if (!routeEl || !otherEl) return;

    const isCircuit = circuitEl && circuitEl.value === "yes";
    const isInstruction = missionTypeEl && missionTypeEl.value === "instruction";

    if (isCircuit) routeEl.value = "DCT";

    const dof = `DOF/${buildDofTag()}`;
    otherEl.value = isInstruction
      ? `${dof} RMK/LOCAL INSTRUCTION FLIGHT`
      : `${dof} RMK/LOCAL FLIGHT`;

    if (eobtEl && quickTimeEl?.value) {
      eobtEl.value = quickTimeEl.value.replace(":", "");
    }
  };

  const syncDepDestFromQuick = () => {
    const adepEl = document.getElementById("fpl-adep");
    const adesEl = document.getElementById("fpl-ades");
    const isCircuit = circuitEl && circuitEl.value === "yes";
    if (!adepEl || !adesEl) return;

    if (isCircuit) {
      adepEl.value = "LPVL";
      adesEl.value = "LPBR";
      if (quickDepEl) quickDepEl.value = "LPVL";
      if (quickDestEl) quickDestEl.value = "LPBR";
      if (quickDepWrapEl) quickDepWrapEl.classList.add("is-hidden");
      if (quickDestWrapEl) quickDestWrapEl.classList.add("is-hidden");
      return;
    }

    if (quickDepWrapEl) quickDepWrapEl.classList.remove("is-hidden");
    if (quickDestWrapEl) quickDestWrapEl.classList.remove("is-hidden");
    if (quickDepEl) adepEl.value = (quickDepEl.value || "LPVL").trim().toUpperCase();
    if (quickDestEl) adesEl.value = (quickDestEl.value || "LPBR").trim().toUpperCase();
  };

  const syncInstructorVisibility = () => {
    if (!missionTypeEl || !instructorWrapEl || !instructorEl) return;
    const instruction = missionTypeEl.value === "instruction";
    instructorWrapEl.classList.toggle("is-hidden", !instruction);
    instructorEl.required = instruction;
  };

  const syncPicWithInstructor = () => {
    const picEl = document.getElementById("fpl-pic");
    if (!picEl || !missionTypeEl || !instructorEl) return;
    if (missionTypeEl.value === "instruction") {
      picEl.value = (instructorEl.value || "").trim();
    }
  };

  const syncNotamChoice = () => {
    if (!wantsNotamEl || !notamHelperEl) return;
    notamHelperEl.classList.toggle("is-hidden", wantsNotamEl.value !== "yes");
  };

  const applyPlanePreset = () => {
    const selected = planeEl.value;
    const p = presets[selected];
    if (!p) return;

    setValue("fpl-aircraft-id", p.aircraftId);
    setValue("fpl-type-aircraft", p.typeAircraft);
    setValue("fpl-eobt", p.eobt);
    setValue("fpl-speed", p.speed);
    setValue("fpl-level", p.level);
    setValue("fpl-route", p.route);
    setValue("fpl-ades", p.ades);
    setValue("fpl-eet", p.eet);
    setValue("fpl-alt1", p.alt1);
    setValue("fpl-alt2", p.alt2);
    setValue("fpl-other", p.other);
    setValue("fpl-endurance", p.endurance);
    setValue("fpl-pob", p.pob);
    setValue("fpl-emergency-radio", p.emergencyRadio);
    setValue("fpl-aircraft-color", p.aircraftColor);
    setValue("fpl-pic", p.pic);
    if (missionTypeEl) missionTypeEl.value = p.missionType;
    if (circuitEl) circuitEl.value = p.circuit;
    if (instructorEl) instructorEl.value = "";
    if (p.circuit === "yes") {
      setValue("fpl-adep", "LPVL");
      setValue("fpl-ades", "LPBR");
      setValue("fpl-alt1", "LPBR");
    }
    syncDepDestFromQuick();
    syncInstructorVisibility();
    syncPicWithInstructor();
    syncRouteAndOtherInformation();
  };

  planeEl.addEventListener("change", applyPlanePreset);
  if (missionTypeEl) missionTypeEl.addEventListener("change", () => {
    syncInstructorVisibility();
    syncPicWithInstructor();
    syncRouteAndOtherInformation();
  });
  if (instructorEl) instructorEl.addEventListener("input", syncPicWithInstructor);
  if (circuitEl) circuitEl.addEventListener("change", () => {
    syncDepDestFromQuick();
    syncRouteAndOtherInformation();
  });
  if (quickDepEl) quickDepEl.addEventListener("input", syncDepDestFromQuick);
  if (quickDestEl) quickDestEl.addEventListener("input", syncDepDestFromQuick);
  if (quickDateEl) quickDateEl.addEventListener("change", syncRouteAndOtherInformation);
  if (quickTimeEl) quickTimeEl.addEventListener("change", syncRouteAndOtherInformation);
  if (wantsNotamEl) wantsNotamEl.addEventListener("change", syncNotamChoice);

  if (quickDateEl && !quickDateEl.value) {
    quickDateEl.value = new Date().toISOString().slice(0, 10);
  }
  if (quickTimeEl && !quickTimeEl.value) {
    quickTimeEl.value = "17:00";
  }
  if (quickDepEl && !quickDepEl.value) quickDepEl.value = "LPVL";
  if (quickDestEl && !quickDestEl.value) quickDestEl.value = "LPBR";
  syncNotamChoice();
  applyPlanePreset();
}

function collectFplPayload() {
  const get = (id) => (document.getElementById(id)?.value || "").trim();
  const parseHm = (raw) => {
    const v = (raw || "").replace(":", "");
    const hh = Number(v.slice(0, 2) || "0");
    const mm = Number(v.slice(2, 4) || "0");
    return { TimeHour: hh, TimeMinute: mm };
  };

  const adep = get("fpl-adep") || "LPVL";
  const ades = get("fpl-ades") || "LPBR";
  const route = get("fpl-route") || "DCT";
  const alt1 = get("fpl-alt1");
  const alt2 = get("fpl-alt2");
  const routeWidth = Math.max(1, Number(get("fpl-route-width") || "20"));
  const nowUtc = new Date();
  const tomorrowUtc = new Date(nowUtc.getTime() + 24 * 60 * 60 * 1000);

  const isDirectOnly = !route || route.toUpperCase() === "DCT";
  const routeDescription = isDirectOnly
    ? `${adep}  ${ades}`
    : `${adep} ${route} ${ades}`;

  return {
    ValidFrom: nowUtc.toISOString().slice(0, 16),
    ValidTo: tomorrowUtc.toISOString().slice(0, 16),
    MessageTypeList: ["NOTAM", "SNOWTAM", "METEO"],
    Traffic: "IV",
    Purpose: "M",
    BriefingType: "INM",
    FirstFlightLevel: { LowerFL: 0, UpperFL: 999 },
    OtherFlightLevel: { LowerFL: 0, UpperFL: 999 },
    LastFlightLevel: { LowerFL: 0, UpperFL: 999 },
    NarrowRouteGeoFilter: {
      customFIRList: null,
      FIRList: null,
      AlternateADList: null,
      RouteDescription: routeDescription,
      RouteWidth: routeWidth,
      RouteRadiusAD: 5,
    },
    SortOrder: "1",
    Scope: "AEW",
    FlightPlanDraft: {
      AircraftId: get("fpl-aircraft-id"),
      FlightRule: get("fpl-flight-rules") || "V",
      TypeOfFlight: get("fpl-type-of-flight") || "X",
      Number: Number(get("fpl-number") || "1"),
      TypeOfAircraft: get("fpl-type-aircraft"),
      WakeTurbulenceCat: get("fpl-wtc") || "L",
      Equipment: `${get("fpl-radio-equipment") || "SY"}/${get("fpl-surveillance-equipment") || "S"}`,
      ADEP: adep,
      EOBT: parseHm(get("fpl-eobt")),
      CruisingSpeed: get("fpl-speed"),
      Route: route,
      Level: get("fpl-level"),
      ADES: ades,
      TotalEET: parseHm(get("fpl-eet")),
      Alternate: alt1,
      SecondAlternate: alt2,
      OtherInformation: get("fpl-other"),
      Endurance: parseHm(get("fpl-endurance")),
      PersonsOnBoard: get("fpl-pob"),
      EmergencyRadio: get("fpl-emergency-radio"),
      AircraftColorMarkings: get("fpl-aircraft-color"),
      PilotInCommand: get("fpl-pic"),
    },
  };
}

function initFplBriefingHelper() {
  const wantsNotamEl = document.getElementById("fpl-wants-notam");
  const tokenEl = document.getElementById("fpl-token");
  const runPibBtn = document.getElementById("fpl-run-pib");
  const runRouteBtn = document.getElementById("fpl-run-route");
  const openNotamBtn = document.getElementById("fpl-open-notam-popup");
  const statusEl = document.getElementById("fpl-helper-status");
  const routeMapEl = document.getElementById("fpl-route-map");
  const notamContentEl = document.getElementById("notam-modal-content");
  if (!tokenEl || !runPibBtn || !runRouteBtn || !openNotamBtn || !statusEl || !routeMapEl) return;

  const shouldUseNotam = () => !wantsNotamEl || wantsNotamEl.value === "yes";

  runPibBtn.addEventListener("click", async () => {
    if (!shouldUseNotam()) {
      statusEl.textContent = "NOTAM desativado para este plano.";
      return;
    }
    const token = tokenEl.value.trim();
    if (!token) {
      statusEl.textContent = "Falta token fplbriefing.";
      return;
    }
    statusEl.textContent = "A executar request PIB...";
    const payload = collectFplPayload();
    if (notamContentEl) {
      notamContentEl.textContent = `Request payload sent to /rest/api/create-narrow-route-pib:\n${JSON.stringify(payload, null, 2)}`;
    }
    try {
      const response = await fetch("/api/fplbriefing/narrow-pib", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, payload }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        statusEl.textContent = `Erro PIB: ${data.error || response.status}`;
        if (notamContentEl) {
          notamContentEl.textContent = `PIB error debug:\n${JSON.stringify(data?.debug || data, null, 2)}`;
        }
        return;
      }
      statusEl.textContent = `PIB OK: ${data.pib_uid || "-"}`;
      lastPibRaw = data.raw || null;
      if (notamContentEl) {
        notamContentEl.textContent = `PIB request/response debug:\n${JSON.stringify(data.debug || {}, null, 2)}`;
      }
      openNotamModal();
    } catch (_err) {
      statusEl.textContent = "Erro de rede no pedido PIB.";
    }
  });

  runRouteBtn.addEventListener("click", async () => {
    const token = tokenEl.value.trim();
    if (!token) {
      statusEl.textContent = "Falta token fplbriefing.";
      return;
    }
    const adep = (document.getElementById("fpl-adep")?.value || "LPVL").trim();
    const route = (document.getElementById("fpl-route")?.value || "DCT").trim();
    const ades = (document.getElementById("fpl-ades")?.value || "LPBR").trim();
    statusEl.textContent = "A carregar route map...";
    try {
      const response = await fetch("/api/fplbriefing/route-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, dep: adep, route, dest: ades }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        const dbg = data?.debug?.route_id ? ` (${data.debug.route_id})` : "";
        statusEl.textContent = `Erro Route Map: ${data.error || response.status}${dbg}`;
        return;
      }
      const dbg = data?.debug?.route_id ? ` ${data.debug.route_id}` : "";
      statusEl.textContent = `Route Map OK.${dbg}`;
      renderRouteMap(data.geojson);
    } catch (_err) {
      statusEl.textContent = "Erro de rede no route map.";
    }
  });

  openNotamBtn.addEventListener("click", () => {
    openNotamModal();
  });
}

function initFlightPlanProgressiveView() {
  const showBtn = document.getElementById("fpl-show-advanced");
  const advancedEl = document.getElementById("fpl-advanced");
  if (!showBtn || !advancedEl) return;

  showBtn.addEventListener("click", () => {
    advancedEl.classList.remove("is-hidden");
    showBtn.classList.add("is-hidden");
  });
}

function initFlightPlanSubtabs() {
  const buttons = document.querySelectorAll("[data-fpl-tab]");
  const sections = {
    preflight: document.getElementById("fpl-tab-preflight"),
    createplan: document.getElementById("fpl-tab-createplan"),
  };
  if (!buttons.length || !sections.preflight || !sections.createplan) return;

  const activate = (name) => {
    buttons.forEach((btn) => btn.classList.toggle("active", btn.getAttribute("data-fpl-tab") === name));
    Object.entries(sections).forEach(([key, section]) => {
      section.classList.toggle("active", key === name);
    });
    if (name === "preflight") initAerodromeMapFpl();
    if (name === "createplan" && fplRouteMap) {
      setTimeout(() => fplRouteMap.invalidateSize(), 120);
    }
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => activate(btn.getAttribute("data-fpl-tab")));
  });
  activate("preflight");
}

function renderRouteMap(geojson) {
  const mapEl = document.getElementById("fpl-route-map");
  if (!mapEl || !window.L || !geojson) return;

  if (!fplRouteMap) {
    fplRouteMap = L.map("fpl-route-map");
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(fplRouteMap);
  }
  if (fplRouteLayer) {
    fplRouteMap.removeLayer(fplRouteLayer);
  }

  fplRouteLayer = L.geoJSON(geojson, {
    style: () => ({ color: "#f59e0b", weight: 4 }),
    pointToLayer: (feature, latlng) => {
      const color = feature?.properties?.tag === "ADEP" ? "#22c55e" : "#3b82f6";
      return L.circleMarker(latlng, { radius: 7, color, fillColor: color, fillOpacity: 0.8 });
    },
    onEachFeature: (feature, layer) => {
      const id = feature?.properties?.id || feature?.id || "Route point";
      const tag = feature?.properties?.tag || feature?.geometry?.type || "";
      layer.bindPopup(`<strong>${id}</strong><br>${tag}`);
    },
  }).addTo(fplRouteMap);

  const bounds = fplRouteLayer.getBounds();
  if (bounds.isValid()) fplRouteMap.fitBounds(bounds.pad(0.25));
  setTimeout(() => fplRouteMap.invalidateSize(), 120);
}

function formatNotamBlocks(raw) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parseNotamTs = (value) => {
    const v = (value || "").trim().toUpperCase();
    if (!/^\d{10}$/.test(v)) return v || "-";
    const yy = Number(v.slice(0, 2));
    const year = 2000 + yy;
    const month = Number(v.slice(2, 4));
    const day = Number(v.slice(4, 6));
    const hh = v.slice(6, 8);
    const mm = v.slice(8, 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return v;
    return `${String(day).padStart(2, "0")} ${monthNames[month - 1]} ${year} ${hh}:${mm} UTC`;
  };

  const blocks = [];
  const pushNotams = (title, list) => {
    (list || []).forEach((n) => {
      const qline = n?.QLine
        ? `${n.QLine.FIR || ""} ${n.QLine.Code23 || ""}${n.QLine.Code45 ? "/" + n.QLine.Code45 : ""} ${n.QLine.Traffic || ""} ${n.QLine.Purpose || ""} ${n.QLine.Scope || ""} ${n.QLine.Lower ?? ""}/${n.QLine.Upper ?? ""}`.trim()
        : "";
      const validFrom = parseNotamTs(n.StartValidity);
      const validTo = parseNotamTs(n.EndValidity);
      blocks.push(
        `<div class="notam-item"><strong>${title} ${n.Series || ""}${n.Number || ""}/${n.Year || ""}</strong>\n` +
        `A: ${(n.ItemA || []).join(", ")}\n` +
        `Q: ${qline}\n` +
        `VALID: ${validFrom} -> ${validTo}\n` +
        `E:\n${n.ItemE || ""}</div>`
      );
    });
  };

  pushNotams("ADEP", (((raw?.Adep || {}).NotamList || {}).Notam));
  pushNotams("ADES", (((raw?.Ades || {}).NotamList || {}).Notam));
  (raw?.RouteFIRSection || []).forEach((sec) => pushNotams(`FIR ${sec.ICAO || ""}`, (((sec || {}).NotamList || {}).Notam)));
  (raw?.Warnings || []).forEach((sec) => pushNotams(`WARNING ${sec.ICAO || ""}`, (((sec || {}).NotamList || {}).Notam)));
  return blocks.length ? blocks.join("") : "<p>No NOTAM text available.</p>";
}

function openNotamModal() {
  const modal = document.getElementById("notam-modal");
  const content = document.getElementById("notam-modal-content");
  if (!modal || !content) return;
  content.innerHTML = formatNotamBlocks(lastPibRaw || {});
  modal.classList.remove("hidden");
}

function initNotamModal() {
  const modal = document.getElementById("notam-modal");
  if (!modal) return;
  document.querySelectorAll("[data-close-notam-modal]").forEach((node) => {
    node.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  });
}

function normalizeTab(hashValue) {
  const raw = (hashValue || "").replace("#", "").toLowerCase();
  return TAB_NAMES.includes(raw) ? raw : "dashboard";
}

function activateTab(tabName, updateHash = false) {
  const name = normalizeTab(tabName);
  activeTab = name;

  document.querySelectorAll(".tab-section").forEach((section) => {
    section.classList.toggle("active", section.id === name);
  });

  document.querySelectorAll("[data-tab]").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("data-tab") === name);
  });

  if (updateHash && window.location.hash !== `#${name}`) {
    window.location.hash = name;
  }
}

function initTabs() {
  document.querySelectorAll("[data-tab]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const tab = link.getAttribute("data-tab");
      if (!tab) return;
      event.preventDefault();
      activateTab(tab, true);
    });
  });

  window.addEventListener("hashchange", () => {
    activateTab(window.location.hash, false);
  });

  activateTab(window.location.hash, false);
}

document.addEventListener("DOMContentLoaded", () => {
  updateUtcClock();
  setInterval(updateUtcClock, 1000);
  setupEmbedFallbacks();
  initTabs();
  lazyLoadWindy();
  initAerodromeMap();
  initAerodromeMapFpl();
  initChartModal();
  initNotamModal();
  initQuickBox();
  initFrequencyBoard();
  initFlightPlanBuilder();
  initFplBriefingHelper();
  initFlightPlanProgressiveView();
  initFlightPlanSubtabs();

  const icao = window.HOME_ICAO || "LPPR";
  loadMetar(icao, "metar");
  setInterval(() => loadMetar(icao, "metar"), 5 * 60 * 1000);
});
