/*
 * Mass & Balance calculator.
 *
 * Station arms, weight limits and CG envelopes are taken from the official
 * Cessna POHs supplied by the club (C150 1975, C152 1979, C172M):
 *   - C152 (CS-ASP, D-ELFA): MTOW 1670 lb, ramp 1675 lb. CG fwd 31.0" up to
 *     1350 lb, straight line to 32.65" at 1670 lb; aft 36.5" at all weights.
 *     Fuel arm 42.0" (std tanks, 24.5 USG usable). Front seats arm 39"
 *     (range 33-41). Baggage area 1 arm 64" (120 lb), area 2 arm 84" (40 lb),
 *     combined max 120 lb.
 *   - C172M (CS-AUD): MTOW 2300 lb (normal). CG fwd 35.0", aft 47.3".
 *     Fuel arm 48.0" (std tanks, 38 USG usable). Front seats arm 37",
 *     rear seats arm 73". Baggage area 1 arm 95" (120 lb), area 2 arm 123"
 *     (50 lb).
 *   - C150 (CS-EAU): MTOW 1600 lb. CG fwd 31.5", aft 36.5". Fuel arm 42.0"
 *     (std tanks, 22.5 USG usable). Front seats arm 39" (range 33-41).
 *     Baggage area 1 arm 64" (120 lb), area 2 arm 84" (40 lb), combined 120 lb.
 *
 * The empty weights / arms below are the POH "sample airplane" values. They are
 * NOT the real values for each individual aircraft (those come from each
 * airplane's weighing record) so they are editable in the UI.
 *
 * Inputs follow the club convention: fuel in US gallons, people/baggage in kg.
 * Everything is converted to pounds / inches internally to check the POH
 * envelope, which is defined in those units.
 */

const MB_KG_TO_LB = 2.2046226;
const MB_LB_TO_KG = 0.45359237;
const MB_GAL_TO_L = 3.7854118;
const MB_FUEL_LB_PER_GAL = 6.0; // AVGAS, per POH

const MB_I18N = {
  pt: {
    pilot: "Piloto",
    pax_front: "Passageiro (frente)",
    pax_front_short: "Passageiro",
    pax_rear_l: "Passageiro trás (esq.)",
    pax_rear_r: "Passageiro trás (dir.)",
    child: "Banco criança (traseiro)",
    fuel: "Combustível",
    bag1: "Bagagem área 1",
    bag2: "Bagagem área 2",
    max_usable: "máx útil",
    max: "máx",
    empty_aircraft: "Aeronave vazia",
    weighing_data: "dados da ficha de pesagem - editável",
    empty_weight: "Peso vazio (BEW)",
    empty_arm: "Braço do peso vazio",
    load: "Carga",
    empty_item: "Vazio",
    ramp_weight: "peso máx. de rampa",
    overweight: "Peso {weight} lb excede o {limitLabel} de {limit} lb ({kg} kg) por {over} lb.",
    cg_forward: "CG {cg}\" à FRENTE do limite ({limit}\").",
    cg_aft: "CG {cg}\" ATRÁS do limite ({limit}\").",
    fuel_over: "Combustível {fuel} gal acima do utilizável ({max} gal).",
    station_over: "{label}: {weight} lb acima do máximo ({max} lb).",
    baggage_over: "Bagagem total {weight} lb acima do combinado ({max} lb).",
    no_load: "Sem carga",
    inside: "DENTRO DO ENVELOPE",
    outside: "FORA DO ENVELOPE",
    total_weight: "Peso total",
    cg_limits: "Limites CG",
    total_moment: "Momento total",
    envelope_aria: "Envelope de centro de gravidade",
    moment_axis: "Momento / 1000 (lb·in)",
    weight_axis: "Peso (lb)",
  },
  en: {
    pilot: "Pilot",
    pax_front: "Passenger (front)",
    pax_front_short: "Passenger",
    pax_rear_l: "Rear passenger (left)",
    pax_rear_r: "Rear passenger (right)",
    child: "Child seat (rear)",
    fuel: "Fuel",
    bag1: "Baggage area 1",
    bag2: "Baggage area 2",
    max_usable: "max usable",
    max: "max",
    empty_aircraft: "Empty aircraft",
    weighing_data: "weighing sheet data - editable",
    empty_weight: "Empty weight (BEW)",
    empty_arm: "Empty weight arm",
    load: "Load",
    empty_item: "Empty",
    ramp_weight: "max ramp weight",
    overweight: "Weight {weight} lb exceeds {limitLabel} of {limit} lb ({kg} kg) by {over} lb.",
    cg_forward: "CG {cg}\" is FORWARD of the limit ({limit}\").",
    cg_aft: "CG {cg}\" is AFT of the limit ({limit}\").",
    fuel_over: "Fuel {fuel} gal is above usable fuel ({max} gal).",
    station_over: "{label}: {weight} lb above maximum ({max} lb).",
    baggage_over: "Total baggage {weight} lb above combined limit ({max} lb).",
    no_load: "No load",
    inside: "INSIDE ENVELOPE",
    outside: "OUTSIDE ENVELOPE",
    total_weight: "Total weight",
    cg_limits: "CG limits",
    total_moment: "Total moment",
    envelope_aria: "Center of gravity envelope",
    moment_axis: "Moment / 1000 (lb·in)",
    weight_axis: "Weight (lb)",
  },
};

function mbLang() {
  return window.MyFlyI18n?.language === "en" ? "en" : "pt";
}

function mbT(key, vars = {}) {
  let text = (MB_I18N[mbLang()] && MB_I18N[mbLang()][key]) || MB_I18N.pt[key] || key;
  Object.entries(vars).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, value);
  });
  return text;
}

function mbStationLabel(station, ac) {
  if (station.id === "pax_front" && ac.type === "Cessna 150") return mbT("pax_front_short");
  return mbT(station.id);
}

// ---- CG limit helpers (arm in inches as a function of weight in lb) ----
function c152Fwd(w) {
  if (w <= 1350) return 31.0;
  return 31.0 + (32.65 - 31.0) * (w - 1350) / (1670 - 1350);
}

const MB_AIRCRAFT = {
  "CS-ASP": {
    type: "Cessna 152",
    emptyKg: 515.2, // 1136 lb POH sample
    emptyArm: 29.9, // 34.0/1.136
    maxTakeoffLb: 1670,
    maxRampLb: 1675,
    fwd: c152Fwd,
    aft: () => 36.5,
    chart: { wMin: 1000, wMax: 1700, mMin: 28, mMax: 66 },
    stations: [
      { id: "pilot", label: "Piloto", unit: "kg", arm: 39 },
      { id: "pax_front", label: "Passageiro (frente)", unit: "kg", arm: 39 },
      { id: "fuel", label: "Combustível", unit: "gal", arm: 42.0, maxGal: 24.5 },
      { id: "bag1", label: "Bagagem área 1", unit: "kg", arm: 64, maxLb: 120 },
      { id: "bag2", label: "Bagagem área 2", unit: "kg", arm: 84, maxLb: 40 },
    ],
    baggageCombinedMaxLb: 120,
  },
  "D-ELFA": {
    type: "Cessna 152",
    emptyKg: 515.2,
    emptyArm: 29.9,
    maxTakeoffLb: 1670,
    maxRampLb: 1675,
    fwd: c152Fwd,
    aft: () => 36.5,
    chart: { wMin: 1000, wMax: 1700, mMin: 28, mMax: 66 },
    stations: [
      { id: "pilot", label: "Piloto", unit: "kg", arm: 39 },
      { id: "pax_front", label: "Passageiro (frente)", unit: "kg", arm: 39 },
      { id: "fuel", label: "Combustível", unit: "gal", arm: 42.0, maxGal: 24.5 },
      { id: "bag1", label: "Bagagem área 1", unit: "kg", arm: 64, maxLb: 120 },
      { id: "bag2", label: "Bagagem área 2", unit: "kg", arm: 84, maxLb: 40 },
    ],
    baggageCombinedMaxLb: 120,
  },
  "CS-AUD": {
    type: "Cessna 172M",
    emptyKg: 618.7, // 1364 lb POH sample
    emptyArm: 37.9, // 51.7/1.364
    maxTakeoffLb: 2300,
    maxRampLb: 2300,
    fwd: () => 35.0,
    aft: () => 47.3,
    chart: { wMin: 1400, wMax: 2400, mMin: 48, mMax: 114 },
    stations: [
      { id: "pilot", label: "Piloto", unit: "kg", arm: 37 },
      { id: "pax_front", label: "Passageiro (frente)", unit: "kg", arm: 37 },
      { id: "pax_rear_l", label: "Passageiro trás (esq.)", unit: "kg", arm: 73 },
      { id: "pax_rear_r", label: "Passageiro trás (dir.)", unit: "kg", arm: 73 },
      { id: "fuel", label: "Combustível", unit: "gal", arm: 48.0, maxGal: 38 },
      { id: "bag1", label: "Bagagem área 1", unit: "kg", arm: 95, maxLb: 120 },
      { id: "bag2", label: "Bagagem área 2", unit: "kg", arm: 123, maxLb: 50 },
    ],
    baggageCombinedMaxLb: 120,
  },
  "CS-EAU": {
    type: "Cessna 150",
    emptyKg: 494.0, // 1089 lb POH sample
    emptyArm: 33.06, // 36.0/1.089
    maxTakeoffLb: 1600,
    maxRampLb: 1600,
    fwd: () => 31.5,
    aft: () => 36.5,
    chart: { wMin: 1000, wMax: 1650, mMin: 30, mMax: 62 },
    stations: [
      { id: "pilot", label: "Piloto", unit: "kg", arm: 39 },
      { id: "pax_front", label: "Passageiro", unit: "kg", arm: 39 },
      { id: "child", label: "Banco criança (traseiro)", unit: "kg", arm: 64, maxLb: 120 },
      { id: "fuel", label: "Combustível", unit: "gal", arm: 42.0, maxGal: 22.5 },
      { id: "bag1", label: "Bagagem área 1", unit: "kg", arm: 64, maxLb: 120 },
      { id: "bag2", label: "Bagagem área 2", unit: "kg", arm: 84, maxLb: 40 },
    ],
    baggageCombinedMaxLb: 120,
  },
};

const MB_SVG_NS = "http://www.w3.org/2000/svg";

function mbNum(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : 0;
}

function mbFmt(n, d = 1) {
  return Number(n).toLocaleString("pt-PT", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

// Build the input form for the selected aircraft.
function mbRenderForm(reg) {
  const ac = MB_AIRCRAFT[reg];
  const form = document.getElementById("mb-form");
  if (!ac || !form) return;

  const stationRows = ac.stations
    .map((s) => {
      const unitLabel = s.unit === "gal" ? "gal" : "kg";
      let hint = "";
      if (s.unit === "gal") {
        hint = `${mbT("max_usable")} ${s.maxGal} gal (≈ ${mbFmt(s.maxGal * MB_GAL_TO_L, 0)} L)`;
      } else if (s.maxLb) {
        hint = `${mbT("max")} ${mbFmt(s.maxLb * MB_LB_TO_KG, 0)} kg (${s.maxLb} lb)`;
      }
      return `
        <label class="mb-field">
          <span>${mbStationLabel(s, ac)} <small class="note">${s.arm}"</small></span>
          <span class="mb-input-wrap">
            <input id="mb-st-${s.id}" class="select" type="number" min="0" step="0.1" value="0">
            <em class="mb-unit">${unitLabel}</em>
          </span>
          ${hint ? `<small class="note">${hint}</small>` : ""}
        </label>`;
    })
    .join("");

  form.innerHTML = `
    <div class="mb-empty card-inset">
      <h4>${mbT("empty_aircraft")} <small class="note">(${mbT("weighing_data")})</small></h4>
      <div class="mb-grid">
        <label class="mb-field">
          <span>${mbT("empty_weight")}</span>
          <span class="mb-input-wrap">
            <input id="mb-empty-kg" class="select" type="number" min="0" step="0.1" value="${ac.emptyKg}">
            <em class="mb-unit">kg</em>
          </span>
        </label>
        <label class="mb-field">
          <span>${mbT("empty_arm")}</span>
          <span class="mb-input-wrap">
            <input id="mb-empty-arm" class="select" type="number" min="0" step="0.01" value="${ac.emptyArm}">
            <em class="mb-unit">in</em>
          </span>
        </label>
      </div>
    </div>
    <div class="mb-loads card-inset">
      <h4>${mbT("load")}</h4>
      <div class="mb-grid">${stationRows}</div>
    </div>`;

  form.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => mbCompute(reg));
  });
}

function mbCompute(reg) {
  const ac = MB_AIRCRAFT[reg];
  if (!ac) return;

  const items = [];

  const emptyLb = mbNum("mb-empty-kg") * MB_KG_TO_LB;
  const emptyArm = mbNum("mb-empty-arm");
  items.push({ label: mbT("empty_item"), weightLb: emptyLb, arm: emptyArm });

  let baggageLb = 0;
  let fuelGal = 0;
  ac.stations.forEach((s) => {
    const raw = mbNum(`mb-st-${s.id}`);
    let weightLb;
    if (s.unit === "gal") {
      fuelGal = raw;
      weightLb = raw * MB_FUEL_LB_PER_GAL;
    } else {
      weightLb = raw * MB_KG_TO_LB;
    }
    if (s.id.startsWith("bag")) baggageLb += weightLb;
    items.push({ label: mbStationLabel(s, ac), weightLb, arm: s.arm, station: s });
  });

  let totalLb = 0;
  let totalMoment = 0; // lb-in
  items.forEach((it) => {
    totalLb += it.weightLb;
    totalMoment += it.weightLb * it.arm;
  });
  const cg = totalLb > 0 ? totalMoment / totalLb : 0;

  // ---- Validation against POH limits ----
  const warnings = [];
  const fwdLimit = ac.fwd(totalLb);
  const aftLimit = ac.aft(totalLb);

  const overWeight = totalLb > ac.maxRampLb + 0.5;
  const tooFwd = totalLb > 0 && cg < fwdLimit - 0.001;
  const tooAft = totalLb > 0 && cg > aftLimit + 0.001;

  if (overWeight) {
    const limLb = ac.maxRampLb;
    const limLabel = ac.maxRampLb > ac.maxTakeoffLb ? mbT("ramp_weight") : "MTOW";
    warnings.push(
      mbT("overweight", {
        weight: mbFmt(totalLb, 0),
        limitLabel: limLabel,
        limit: limLb,
        kg: mbFmt(limLb * MB_LB_TO_KG, 0),
        over: mbFmt(totalLb - limLb, 0),
      })
    );
  }
  if (tooFwd) warnings.push(mbT("cg_forward", { cg: mbFmt(cg, 2), limit: mbFmt(fwdLimit, 2) }));
  if (tooAft) warnings.push(mbT("cg_aft", { cg: mbFmt(cg, 2), limit: mbFmt(aftLimit, 2) }));

  ac.stations.forEach((s) => {
    if (s.unit === "gal" && fuelGal > s.maxGal + 0.01) {
      warnings.push(
        mbT("fuel_over", { fuel: mbFmt(fuelGal, 1), max: s.maxGal })
      );
    }
    if (s.maxLb) {
      const wLb = mbNum(`mb-st-${s.id}`) * MB_KG_TO_LB;
      if (wLb > s.maxLb + 0.5) {
        warnings.push(
          mbT("station_over", { label: mbStationLabel(s, ac), weight: mbFmt(wLb, 0), max: s.maxLb })
        );
      }
    }
  });
  if (ac.baggageCombinedMaxLb && baggageLb > ac.baggageCombinedMaxLb + 0.5) {
    warnings.push(
      mbT("baggage_over", { weight: mbFmt(baggageLb, 0), max: ac.baggageCombinedMaxLb })
    );
  }

  const withinEnvelope = !overWeight && !tooFwd && !tooAft && totalLb > 0;

  mbRenderResults(ac, {
    totalLb,
    totalMoment,
    cg,
    fwdLimit,
    aftLimit,
    fuelGal,
    withinEnvelope,
    warnings,
  });
  mbRenderChart(ac, totalLb, totalMoment / 1000, withinEnvelope);
}

function mbRenderResults(ac, r) {
  const box = document.getElementById("mb-results");
  if (!box) return;

  const statusClass = r.withinEnvelope ? "ok" : "bad";
  const statusText = r.totalLb <= 0
    ? mbT("no_load")
    : r.withinEnvelope
    ? mbT("inside")
    : mbT("outside");

  const fuelKg = r.fuelGal * MB_FUEL_LB_PER_GAL * MB_LB_TO_KG;

  const warnHtml = r.warnings.length
    ? `<ul class="mb-warnings">${r.warnings.map((w) => `<li>⚠️ ${w}</li>`).join("")}</ul>`
    : "";

  box.innerHTML = `
    <p><span class="badge mb-${statusClass}">${statusText}</span></p>
    <table class="mb-table">
      <tr><th>${mbT("total_weight")}</th><td>${mbFmt(r.totalLb * MB_LB_TO_KG, 1)} kg <span class="note">(${mbFmt(r.totalLb, 0)} lb)</span></td></tr>
      <tr><th>MTOW</th><td>${mbFmt(ac.maxTakeoffLb * MB_LB_TO_KG, 0)} kg <span class="note">(${ac.maxTakeoffLb} lb)</span></td></tr>
      <tr><th>${mbT("fuel")}</th><td>${mbFmt(r.fuelGal, 1)} gal <span class="note">(≈ ${mbFmt(r.fuelGal * MB_GAL_TO_L, 0)} L · ${mbFmt(fuelKg, 0)} kg)</span></td></tr>
      <tr><th>CG</th><td>${mbFmt(r.cg, 2)} in</td></tr>
      <tr><th>${mbT("cg_limits")} @ ${mbFmt(r.totalLb, 0)} lb</th><td>${mbFmt(r.fwdLimit, 2)}" – ${mbFmt(r.aftLimit, 2)}"</td></tr>
      <tr><th>${mbT("total_moment")}</th><td>${mbFmt(r.totalMoment / 1000, 2)} <span class="note">(lb·in/1000)</span></td></tr>
    </table>
    ${warnHtml}`;
}

// Draw the CG moment envelope (x = moment/1000, y = weight) with the load point.
function mbRenderChart(ac, weightLb, momentK, within) {
  const box = document.getElementById("mb-chart");
  if (!box) return;

  const W = 360;
  const H = 320;
  const padL = 48;
  const padR = 14;
  const padT = 14;
  const padB = 40;
  const c = ac.chart;

  const sx = (m) => padL + ((m - c.mMin) / (c.mMax - c.mMin)) * (W - padL - padR);
  const sy = (w) => H - padB - ((w - c.wMin) / (c.wMax - c.wMin)) * (H - padT - padB);

  // Build envelope polygon by sampling the fwd line up and the aft line down.
  const wTop = ac.maxTakeoffLb;
  const wBot = c.wMin;
  const steps = 20;
  const fwdPts = [];
  const aftPts = [];
  for (let i = 0; i <= steps; i++) {
    const w = wBot + ((wTop - wBot) * i) / steps;
    fwdPts.push([(ac.fwd(w) * w) / 1000, w]);
    aftPts.push([(ac.aft(w) * w) / 1000, w]);
  }
  const polyPts = fwdPts.concat(aftPts.reverse());
  const polyStr = polyPts.map(([m, w]) => `${sx(m).toFixed(1)},${sy(w).toFixed(1)}`).join(" ");

  // Axis ticks
  const xticks = [];
  for (let m = Math.ceil(c.mMin / 5) * 5; m <= c.mMax; m += 5) xticks.push(m);
  const yticks = [];
  for (let w = Math.ceil(c.wMin / 100) * 100; w <= c.wMax; w += 100) yticks.push(w);

  const ptInside = within;
  const px = sx(momentK);
  const py = sy(weightLb);
  const showPt = weightLb > 0;

  let svg = `<svg viewBox="0 0 ${W} ${H}" class="mb-svg" role="img" aria-label="${mbT("envelope_aria")}">`;
  // grid + ticks
  xticks.forEach((m) => {
    const x = sx(m);
    svg += `<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${H - padB}" class="mb-grid"/>`;
    svg += `<text x="${x.toFixed(1)}" y="${H - padB + 14}" class="mb-axis-lbl" text-anchor="middle">${m}</text>`;
  });
  yticks.forEach((w) => {
    const y = sy(w);
    svg += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" class="mb-grid"/>`;
    svg += `<text x="${padL - 5}" y="${(y + 3).toFixed(1)}" class="mb-axis-lbl" text-anchor="end">${w}</text>`;
  });
  // envelope
  svg += `<polygon points="${polyStr}" class="mb-envelope"/>`;
  // point
  if (showPt) {
    const cls = ptInside ? "mb-pt-ok" : "mb-pt-bad";
    svg += `<line x1="${px.toFixed(1)}" y1="${padT}" x2="${px.toFixed(1)}" y2="${H - padB}" class="mb-cross"/>`;
    svg += `<line x1="${padL}" y1="${py.toFixed(1)}" x2="${W - padR}" y2="${py.toFixed(1)}" class="mb-cross"/>`;
    svg += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5" class="${cls}"/>`;
  }
  // axis titles
  svg += `<text x="${(W / 2).toFixed(1)}" y="${H - 4}" class="mb-axis-title" text-anchor="middle">${mbT("moment_axis")}</text>`;
  svg += `<text x="12" y="${(H / 2).toFixed(1)}" class="mb-axis-title" text-anchor="middle" transform="rotate(-90 12 ${(H / 2).toFixed(1)})">${mbT("weight_axis")}</text>`;
  svg += `</svg>`;
  box.innerHTML = svg;
}

function initMassBalance() {
  const select = document.getElementById("mb-aircraft");
  if (!select) return;
  const apply = () => {
    const reg = select.value;
    mbRenderForm(reg);
    mbCompute(reg);
  };
  select.addEventListener("change", apply);
  window.addEventListener("myflyapp:language", apply);
  apply();
}

document.addEventListener("DOMContentLoaded", initMassBalance);
