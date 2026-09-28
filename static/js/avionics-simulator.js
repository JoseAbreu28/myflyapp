/* Garmin-style avionics trainer. Educational aid only; not certified avionics. */
(function (global) {
  "use strict";

  const WAYPOINTS = {
    LPPR: { name: "Porto", bearing: 35, distance: 18 },
    LPVL: { name: "Vila Real", bearing: 72, distance: 42 },
    LPBR: { name: "Braga", bearing: 12, distance: 27 },
    LPVZ: { name: "Viseu", bearing: 130, distance: 55 },
  };
  // NAV Portugal eAIP ENR 4.1, consulted 2026-09-28:
  // https://ais.nav.pt/wp-content/uploads/AIS_Files/eAIP_Current/eAIP_Online/eAIP/html/eAIP/LP-ENR-4.1-en-GB.html
  // WGS-84 VOR antenna coordinates (DME antenna for standalone sites).
  // Published variations have epoch 2020; map geometry remains approximate.
  // DME channels are not VOR frequencies.
  // DME-only sites are map/GPS references, never a simulated VOR signal.
  const NAV_AIDS = {
    VIS: { id: "VIS", name: "Viseu", type: "DVOR/DME", frequency: 113.10, channel: "78X", lat: 40 + 43 / 60 + 24 / 3600, lng: -(7 + 53 / 60 + 9 / 3600), variation: -2 },
    PRT: { id: "PRT", name: "Porto", type: "DVOR/DME", frequency: 114.10, channel: "88X", lat: 41 + 16 / 60 + 23 / 3600, lng: -(8 + 41 / 60 + 16 / 3600), variation: -2 },
    DAR: { id: "DAR", name: "Arouca", type: "DME", channel: "96X", lat: 40 + 56 / 60, lng: -(8 + 13 / 60 + 31 / 3600) },
    CAS: { id: "CAS", name: "Cascais", type: "DVOR/DME", frequency: 114.30, channel: "90X", lat: 38 + 44 / 60 + 54 / 3600, lng: -(9 + 21 / 60 + 43 / 3600), variation: -3 },
    VFA: { id: "VFA", name: "Faro", type: "DVOR/DME", frequency: 112.80, channel: "75X", lat: 37 + 49 / 3600, lng: -(7 + 58 / 60 + 30 / 3600), variation: -1 },
    FTM: { id: "FTM", name: "Fátima", type: "DVOR/DME", frequency: 113.50, channel: "82X", lat: 39 + 39 / 60 + 56 / 3600, lng: -(8 + 29 / 60 + 34 / 3600), variation: -2 },
    DMR: { id: "DMR", name: "Marão", type: "DME", channel: "93X", lat: 41 + 14 / 60 + 53 / 3600, lng: -(7 + 53 / 60 + 11 / 3600) },
    LIS: { id: "LIS", name: "Lisboa", type: "DVOR/DME", frequency: 114.80, channel: "95X", lat: 38 + 53 / 60 + 16 / 3600, lng: -(9 + 9 / 60 + 46 / 3600), variation: -2 },
  };
  const TUTORIAL_REFERENCES = {
    ...NAV_AIDS,
    LPPR: { id: "LPPR", name: "Porto airport", lat: 41.2481, lng: -8.6814 },
  };
  const TOFROM_INTRO_TUTORIAL_ID = "intro-vor";
  const TUTORIAL_EXAMPLES = [
    {
      id: "vis-to",
      titleKey: "av_tutorial_vis_to_title",
      briefingKey: "av_tutorial_vis_to_briefing",
      objectiveKey: "av_tutorial_vis_to_objective",
      steps: ["av_tutorial_vis_to_step1", "av_tutorial_vis_to_step2", "av_tutorial_vis_to_step3", "av_tutorial_vis_to_step4"],
      successKey: "av_tutorial_success",
      kind: "VLOC",
      reference: "VIS",
      start: { lat: 40.723333, lng: -8.235833 },
      expectedSource: "VLOC",
      expectedFrequency: 113.10,
      expectedCourse: 90,
      expectedHeading: 90,
      expectedWaypoint: null,
      expectedMode: "TO",
    },
    {
      id: "vis-from",
      titleKey: "av_tutorial_vis_from_title",
      briefingKey: "av_tutorial_vis_from_briefing",
      objectiveKey: "av_tutorial_vis_from_objective",
      steps: ["av_tutorial_vis_from_step1", "av_tutorial_vis_from_step2", "av_tutorial_vis_from_step3", "av_tutorial_vis_from_step4"],
      successKey: "av_tutorial_success",
      kind: "VLOC",
      reference: "VIS",
      start: { lat: 40.723333, lng: -7.535833 },
      expectedSource: "VLOC",
      expectedFrequency: 113.10,
      expectedCourse: 90,
      expectedHeading: 90,
      expectedWaypoint: null,
      expectedMode: "FROM",
    },
    {
      id: "prt-to",
      titleKey: "av_tutorial_prt_title",
      briefingKey: "av_tutorial_prt_briefing",
      objectiveKey: "av_tutorial_prt_objective",
      steps: ["av_tutorial_prt_step1", "av_tutorial_prt_step2", "av_tutorial_prt_step3", "av_tutorial_prt_step4"],
      successKey: "av_tutorial_success",
      kind: "VLOC",
      reference: "PRT",
      start: { lat: 40.973056, lng: -8.687778 },
      expectedSource: "VLOC",
      expectedFrequency: 114.10,
      expectedCourse: 0,
      expectedHeading: 0,
      expectedWaypoint: null,
      expectedMode: "TO",
    },
    {
      id: "gps-direct",
      titleKey: "av_tutorial_gps_title",
      briefingKey: "av_tutorial_gps_briefing",
      objectiveKey: "av_tutorial_gps_objective",
      steps: ["av_tutorial_gps_step1", "av_tutorial_gps_step2", "av_tutorial_gps_step3", "av_tutorial_gps_step4"],
      successKey: "av_tutorial_success",
      kind: "GPS",
      reference: "LPPR",
      start: { lat: 40.8981, lng: -8.6814 },
      expectedSource: "GPS",
      expectedFrequency: null,
      expectedCourse: 0,
      expectedHeading: 0,
      expectedWaypoint: "LPPR",
      expectedMode: "GPS",
    },
    {
      id: "map-page",
      titleKey: "av_tutorial_map_title",
      briefingKey: "av_tutorial_map_briefing",
      objectiveKey: "av_tutorial_map_objective",
      steps: ["av_tutorial_map_step1", "av_tutorial_map_step2", "av_tutorial_map_step3", "av_tutorial_map_step4"],
      successKey: "av_tutorial_success",
      kind: "MAP",
      reference: "LPPR",
      start: { lat: 40.8981, lng: -8.6814 },
      expectedSource: "GPS",
      expectedFrequency: null,
      expectedCourse: 35,
      expectedHeading: 35,
      expectedWaypoint: "LPPR",
      expectedMode: "GPS",
      expectedGnsPageIndex: 1,
      expectedMapRange: 20,
    },
  ];
  const FREE_TUTORIAL_EXAMPLE = {
    id: "free",
    titleKey: "av_tutorial_free_title",
    briefingKey: "av_tutorial_free_briefing",
    objectiveKey: "av_tutorial_free_objective",
    steps: ["av_tutorial_free_step1", "av_tutorial_free_step2", "av_tutorial_free_step3"],
    successKey: "av_tutorial_free_ready",
    kind: "FREE",
    reference: "VIS",
    start: { lat: 40.723333, lng: -8.235833 },
    expectedSource: null,
    expectedFrequency: null,
    expectedCourse: null,
    expectedHeading: null,
    expectedWaypoint: null,
    expectedMode: null,
  };
  const SETUP2_TUTORIAL_EXAMPLES = [
    { id: "identify", reference: "VIS", start: { lat: 40.723333, lng: -8.235833 }, frequency: 113.10, course: null, toFrom: null, initialActive: 114.10, initialStandby: 113.10 },
    { id: "vis-to", reference: "VIS", start: { lat: 40.723333, lng: -8.235833 }, frequency: 113.10, course: 90, toFrom: "TO", initialActive: 114.10, initialStandby: 113.10 },
    { id: "vis-from", reference: "VIS", start: { lat: 40.723333, lng: -7.535833 }, frequency: 113.10, course: 90, toFrom: "FROM", initialActive: 114.10, initialStandby: 113.10 },
    { id: "prt-to", reference: "PRT", start: { lat: 40.973056, lng: -8.687778 }, frequency: 114.10, course: 0, toFrom: "TO", initialActive: 113.10, initialStandby: 114.10 },
  ];
  const PAGE_GROUPS = ["NAV", "WPT", "AUX", "NRST"];
  const PAGES = {
    NAV: ["NAV 1", "MAP", "TERRAIN", "NAV/COM", "POSITION", "SATELLITE", "VNAV"],
    WPT: ["APT LOCATION", "APT RUNWAY", "APT FREQ", "APT APPROACH", "APT ARRIVAL", "APT DEPARTURE", "INTERSECTION", "NDB", "VOR", "USER WPT"],
    AUX: ["FLIGHT PLANNING", "UTILITY", "SETUP 1", "SETUP 2"],
    NRST: ["AIRPORTS", "INTERSECTIONS", "NDB", "VOR", "USER WPT", "FSS", "ARTCC", "AIRSPACE"],
  };
  const defaultG5Settings = () => ({ altitude: 2500, pitch: 0, pointers: ["GPS", "None"], menuLevel: "main", pointerIndex: 0 });
  const g5Settings = { pfd: defaultG5Settings(), hsi: defaultG5Settings() };
  const state = {
    ready: false,
    activeSetup: "av-setup-1",
    g5PfdPower: true,
    g5HsiPower: true,
    g5PfdPage: "PFD",
    g5HsiPage: "HSI",
    g5PfdMode: "HDG",
    g5HsiMode: "HDG",
    g5PfdMenu: false,
    g5HsiMenu: false,
    g5PfdMenuSelection: "HDG",
    g5HsiMenuSelection: "HDG",
    g5PfdHeadingBug: 270,
    g5HsiHeadingBug: 270,
    g5PfdCourse: 270,
    g5HsiCourse: 270,
    g5PfdBearingPointer: true,
    g5HsiBearingPointer: true,
    g5LastUnit: null,
    gnsPower: true,
    gnsModel: "430",
    gnsComSpacing: "25",
    gnsSpecialPage: null,
    gnsMenuIndex: 0,
    gnsFieldIndex: 0,
    gnsDetail: null,
    gnsDirectConfirm: false,
    gnsDirectPosition: 0,
    gnsWptIndex: 0,
    gnsFields: ["DIS", "DTK", "BRG", "GS", "TRK", "ETE"],
    gnsMapFields: ["DIS", "BRG", "TRK", "GS"],
    gnsMapData: true,
    gnsMapOrientation: "NORTH UP",
    gnsDeclutter: 0,
    gnsContrast: 80,
    gnsBrightness: 100,
    gnsDistanceUnit: "NM",
    gnsCdiScale: 1,
    gnsSbas: true,
    gnsVnavAltitude: 2500,
    gnsVnavRate: 500,
    gnsFlightPlan: ["LPPR"],
    gnsFlightPlanActive: false,
    gnsFlightPlanLeg: 0,
    heading: 260,
    source: "GPS",
    waypoint: "LPPR",
    obsMode: false,
    tuningTarget: "COM",
    comActive: 118.00,
    comStandby: 122.80,
    vlocActive: 110.30,
    vlocStandby: 114.10,
    gnsGroup: "NAV",
    gnsPageIndex: 1,
    gnsMenu: false,
    gnsCursor: false,
    directToArmed: false,
    directToActive: false,
    directEntry: "",
    mapRange: 20,
    scenario: "basic",
    message: "",
    setup2: {
      giPower: true,
      gncPower: true,
      course: 270,
      navMode: "VOR",
      navDisplay: "FREQ",
      heading: 90,
      navActive: 113.10,
      navStandby: 114.10,
      comActive: 118.000,
      comStandby: 122.800,
      tuningTarget: "NAV",
    },
    tutorialId: "free",
    tutorialReferenceId: null,
    tutorialResultKey: "av_tutorial_ready",
    setup2TutorialId: "free",
    setup2SelectedReferenceId: null,
    setup2TutorialResultKey: "av_setup2_tutorial_ready",
    setup2StatusKey: "av_setup2_tutorial_ready",
    setup2StatusText: "",
    challengeConfirmed: {},
  };

  let ready = false;
  const g5Contexts = new Map();
  let tutorialMap = null;
  let tutorialAircraftMarker = null;
  let tutorialReferenceMarkers = [];
  let tutorialLine = null;
  let tutorialPosition = null;
  let setup2TutorialPosition = null;
  let setup2TutorialMap = null;
  let setup2TutorialAircraftMarker = null;
  let setup2TutorialLine = null;
  let setup2TutorialReferenceMarkers = [];
  const setup2Flight = { running: false, intervalId: null };
  const tutorialFlight = {
    running: false,
    speedKts: 90,
    radialFrom: 140,
    distanceNm: 20,
    elapsedSeconds: 0,
    intervalId: null,
  };
  let avionicsHelperEnabled = false;

  const normalize = (value) => ((Number(value) % 360) + 360) % 360;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const angleDelta = (value, reference) => ((Number(value) - Number(reference) + 540) % 360) - 180;
  const formatHeading = (value) => String(Math.round(normalize(value))).padStart(3, "0");
  const formatCom = (value) => Number(value).toFixed(3);
  const formatVloc = (value) => Number(value).toFixed(2);

  function g5UnitConfig(unit) {
    return unit === "pfd"
      ? { powerKey: "g5PfdPower", pageKey: "g5PfdPage", modeKey: "g5PfdMode", menuKey: "g5PfdMenu", menuSelectionKey: "g5PfdMenuSelection", headingBugKey: "g5PfdHeadingBug", courseKey: "g5PfdCourse", bearingPointerKey: "g5PfdBearingPointer", canvasId: "av-g5-pfd-canvas", readoutId: "av-g5-pfd-readout", titleId: "av-g5-pfd-title", labelId: "av-g5-pfd-page-label", knobId: "av-g5-pfd-knob", optionsId: "av-g5-pfd-options" }
      : { powerKey: "g5HsiPower", pageKey: "g5HsiPage", modeKey: "g5HsiMode", menuKey: "g5HsiMenu", menuSelectionKey: "g5HsiMenuSelection", headingBugKey: "g5HsiHeadingBug", courseKey: "g5HsiCourse", bearingPointerKey: "g5HsiBearingPointer", canvasId: "av-g5-hsi-canvas", readoutId: "av-g5-hsi-readout", titleId: "av-g5-hsi-title", labelId: "av-g5-hsi-page-label", knobId: "av-g5-hsi-knob", optionsId: "av-g5-hsi-options" };
  }

  function g5Page(unit) {
    return state[g5UnitConfig(unit).pageKey];
  }

  function g5Powered(unit) {
    return Boolean(state[g5UnitConfig(unit).powerKey]);
  }

  function g5Mode(unit) {
    return state[g5UnitConfig(unit).modeKey];
  }

  function g5MenuOpen(unit) {
    return Boolean(state[g5UnitConfig(unit).menuKey]);
  }

  function g5MenuSelection(unit) {
    return state[g5UnitConfig(unit).menuSelectionKey];
  }

  function g5HeadingBug(unit) {
    return Number(state[g5UnitConfig(unit).headingBugKey]);
  }

  function g5Course(unit) {
    return Number(state[g5UnitConfig(unit).courseKey]);
  }

  function g5ReferenceUnit(page = null) {
    const units = ["pfd", "hsi"];
    if (state.g5LastUnit && g5Powered(state.g5LastUnit) && (!page || g5Page(state.g5LastUnit) === page)) return state.g5LastUnit;
    return units.find((unit) => g5Powered(unit) && (!page || g5Page(unit) === page)) || units.find((unit) => g5Powered(unit)) || null;
  }

  function g5ReferenceHeadingBug() {
    const unit = g5ReferenceUnit();
    return unit ? g5HeadingBug(unit) : 270;
  }

  function g5ReferenceCourse() {
    const unit = g5ReferenceUnit("HSI") || g5ReferenceUnit();
    return unit ? g5Course(unit) : 270;
  }

  function g5PageHasValue(page, valueName, expected, tolerance) {
    return ["pfd", "hsi"].some((unit) => {
      if (!g5Powered(unit) || g5Page(unit) !== page) return false;
      const value = valueName === "headingBug" ? g5HeadingBug(unit) : g5Course(unit);
      return Math.abs(angleDelta(value, expected)) <= tolerance;
    });
  }

  function g5HasPage(page) {
    return ["pfd", "hsi"].some((unit) => g5Powered(unit) && g5Page(unit) === page);
  }

  function activeG5HsiUnit() {
    if (state.g5LastUnit && g5Powered(state.g5LastUnit) && g5Page(state.g5LastUnit) === "HSI") return state.g5LastUnit;
    return ["pfd", "hsi"].find((unit) => g5Powered(unit) && g5Page(unit) === "HSI") || null;
  }

  function t(key) {
    return global.MyFlyI18n?.t?.(key) || key;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setStatus(message) {
    setText("av-training-status", message);
  }

  function avionicsButtonHelp(button) {
    const explicit = button.dataset.avHelp?.trim();
    if (explicit) return explicit;
    const title = button.getAttribute("title")?.trim();
    if (title) return title;
    const label = button.getAttribute("aria-label")?.trim();
    if (label) return label;
    const text = button.textContent.replace(/\s+/g, " ").trim();
    return text ? `${text} — controlo do instrumento.` : "Controlo do instrumento.";
  }

  function bindAvionicsHelper() {
    const trainer = document.getElementById("avionics-trainer");
    const toggle = document.getElementById("av-helper-toggle");
    if (!trainer || !toggle || trainer.dataset.helperBound === "true") return;
    trainer.dataset.helperBound = "true";
    const bubble = document.createElement("div");
    bubble.id = "avionics-helper-popover";
    bubble.className = "avionics-helper-popover";
    bubble.setAttribute("role", "tooltip");
    trainer.appendChild(bubble);
    let activeButton = null;

    const hide = () => {
      activeButton = null;
      bubble.classList.remove("is-visible");
    };

    const place = () => {
      if (!activeButton || !bubble.classList.contains("is-visible")) return;
      const rect = activeButton.getBoundingClientRect();
      const width = Math.min(270, Math.max(180, window.innerWidth - 16));
      const left = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8);
      const above = rect.top > 92;
      bubble.style.width = `${width}px`;
      bubble.style.left = `${left}px`;
      bubble.style.top = `${above ? rect.top - 8 : rect.bottom + 8}px`;
      bubble.style.transform = above ? "translateY(-100%)" : "none";
    };

    const show = (button) => {
      if (!avionicsHelperEnabled || !button.closest(".avionics-layout")) return;
      activeButton = button;
      bubble.textContent = avionicsButtonHelp(button);
      bubble.classList.add("is-visible");
      place();
    };

    toggle.addEventListener("click", () => {
      avionicsHelperEnabled = !avionicsHelperEnabled;
      toggle.setAttribute("aria-pressed", avionicsHelperEnabled ? "true" : "false");
      toggle.setAttribute("aria-label", avionicsHelperEnabled ? "Desativar ajuda dos instrumentos" : "Ativar ajuda dos instrumentos");
      trainer.classList.toggle("avionics-helper-enabled", avionicsHelperEnabled);
      if (!avionicsHelperEnabled) hide();
    });

    trainer.addEventListener("pointerover", (event) => {
      const button = event.target.closest("button");
      if (!button || !trainer.contains(button) || !button.closest(".avionics-layout")) return;
      if (event.relatedTarget && button.contains(event.relatedTarget)) return;
      show(button);
    });
    trainer.addEventListener("pointerout", (event) => {
      const button = event.target.closest("button");
      if (!button || (event.relatedTarget && button.contains(event.relatedTarget))) return;
      if (button === activeButton) hide();
    });
    trainer.addEventListener("focusin", (event) => {
      const button = event.target.closest("button");
      if (button) show(button);
    });
    trainer.addEventListener("focusout", (event) => {
      if (event.relatedTarget && event.target.contains(event.relatedTarget)) return;
      if (event.target === activeButton) hide();
    });
    global.addEventListener("resize", place);
  }

  function currentFrequency(target = state.tuningTarget) {
    return target === "VLOC" ? state.vlocStandby : state.comStandby;
  }

  function activeFrequency(target = state.tuningTarget) {
    return target === "VLOC" ? state.vlocActive : state.comActive;
  }

  function setCurrentFrequency(value) {
    if (state.tuningTarget === "VLOC") state.vlocStandby = clamp(Number(value), 108.00, 117.95);
    else state.comStandby = clamp(Number(value), 118.00, 136.975);
  }

  function normalizeGnsFrequencyInput(target, rawValue) {
    const config = target === "VLOC"
      ? { min: 108.00, max: 117.95, step: 0.05, precision: 2 }
      : { min: 118.000, max: state.gnsComSpacing === "8.33" ? 136.990 : 136.975, step: state.gnsComSpacing === "8.33" ? 0.005 : 0.025, precision: 3 };
    const numeric = Number(String(rawValue ?? "").trim().replace(",", "."));
    if (!String(rawValue ?? "").trim() || !Number.isFinite(numeric)) return null;
    const bounded = clamp(numeric, config.min, config.max);
    let stepped = config.min + Math.round((bounded - config.min) / config.step) * config.step;
    // 8.33 channel designators omit the fourth 5-kHz number in each 25-kHz block.
    if (target === "COM" && state.gnsComSpacing === "8.33" && Math.round(stepped * 1000) % 25 === 20) stepped -= 0.005;
    return Number(stepped.toFixed(config.precision));
  }

  function commitGnsFrequencyInput(input) {
    const target = input?.dataset.gnsFrequencyTarget;
    const role = input?.dataset.gnsFrequencyRole;
    if (!state.gnsPower || !input || !["COM", "VLOC"].includes(target) || !["active", "standby"].includes(role)) return;
    const value = normalizeGnsFrequencyInput(target, input.value);
    if (value === null) {
      setStatus(`Frequência ${target} inválida.`);
      render();
      return;
    }
    const property = `${target.toLowerCase()}${role === "active" ? "Active" : "Standby"}`;
    state[property] = value;
    state.tuningTarget = target;
    if (target === "VLOC") state.tutorialReferenceId = null;
    setStatus(`${target} ${role === "active" ? "ativa" : "standby"} ${target === "VLOC" ? formatVloc(value) : formatCom(value)}.`);
    render();
  }

  function findNavStation(frequency) {
    return Object.values(NAV_AIDS).find(station => Number.isFinite(station.frequency) && Math.abs(station.frequency - frequency) < 0.006) || null;
  }

  function findVlocStation() {
    return findNavStation(activeFrequency("VLOC"));
  }

  function syncFlightControls() {
    setText("av-instrument-summary", `HDG ${formatHeading(state.heading)} · BUG ${formatHeading(g5ReferenceHeadingBug())} · CRS ${formatHeading(g5ReferenceCourse())} · ${state.source} · ${state.waypoint}`);
  }

  function setup2NavId() {
    const station = findNavStation(state.setup2.navActive);
    return station ? `${station.id} · ID OK` : "NAV · ID OFF";
  }

  function setup2NavGeometry() {
    const reference = findNavStation(state.setup2.navActive);
    if (!state.setup2.gncPower || !reference || !setup2TutorialPosition || state.setup2.navMode !== "VOR") return null;
    if (tutorialDistanceNm(reference, setup2TutorialPosition) < 0.1) return null;
    const radialFrom = tutorialBearing(reference, setup2TutorialPosition);
    return { radialFrom, bearingTo: normalize(radialFrom + 180) };
  }

  function setup2NavFlag() {
    const geometry = setup2NavGeometry();
    if (!geometry) return "OFF";
    const alignment = Math.abs(angleDelta(state.setup2.course, geometry.bearingTo));
    if (Math.abs(alignment - 90) < 3) return "NAV";
    return alignment < 90 ? "TO" : "FROM";
  }

  function setup2CdiDeviation() {
    const geometry = setup2NavGeometry();
    if (!geometry) return null;
    // VOR CDI: signed displacement from the OBS course line, independent of
    // aircraft heading. Reciprocal OBS reverses both CDI and TO/FROM.
    // Educational true-bearing geometry; full-scale VOR deflection is 10°.
    const angle = tutorialToRadians(angleDelta(geometry.radialFrom, state.setup2.course));
    return -Math.asin(Math.sin(angle)) * 180 / Math.PI;
  }

  function setup2CdiValue() {
    const deviation = setup2CdiDeviation();
    if (deviation === null) return "OFF";
    if (Math.abs(deviation) <= 1) return "CENTER";
    return deviation < 0 ? "LEFT" : "RIGHT";
  }

  function setup2CdiDeflection() {
    const deviation = setup2CdiDeviation();
    if (deviation === null) return 0;
    return clamp(deviation / 10, -1, 1);
  }

  function setup2SetStatus(message) {
    state.setup2TutorialResultKey = "av_setup2_tutorial_ready";
    state.setup2StatusKey = null;
    state.setup2StatusText = message;
    setText("setup2-training-status", message);
  }

  function renderSetup2() {
    const setup = state.setup2;
    setText("setup2-training-status", state.setup2StatusKey ? t(state.setup2StatusKey) : state.setup2StatusText);
    const giFace = document.querySelector(".gi106a-face");
    const gncFace = document.querySelector(".gnc255-face");
    giFace?.classList.toggle("is-off", !setup.giPower);
    gncFace?.classList.toggle("is-off", !setup.gncPower);
    renderPowerByPrefix("setup2-gi", setup.giPower);
    renderPowerByPrefix("setup2-gnc", setup.gncPower);

    const flag = setup.giPower ? setup2NavFlag() : "OFF";
    const card = document.getElementById("setup2-gi-compass-card");
    if (card) card.setAttribute("transform", `rotate(${-setup.course} 160 160)`);
    const cdi = document.getElementById("setup2-gi-cdi-needle");
    if (cdi) {
      cdi.setAttribute("transform", `translate(${(setup2CdiDeflection() * 50).toFixed(2)} 0)`);
      cdi.style.visibility = setup.giPower && setup2NavGeometry() ? "visible" : "hidden";
    }
    setText("setup2-gi-course-value", `${formatHeading(setup.course)}°`);
    setText("setup2-gi-cdi-value", setup.giPower && setup.gncPower ? setup2CdiValue() : "OFF");
    setText("setup2-gi-tofrom", flag);
    setText("setup2-gi-loc", setup.giPower ? setup.navMode : "OFF");
    setText("setup2-gi-readout", setup.giPower ? `${formatVloc(setup.navActive)} · ${flag}` : "OFF");
    const giKnob = document.querySelector("#setup2-gi-course-knob small");
    if (giKnob) giKnob.textContent = `${formatHeading(setup.course)}°`;

    const displayIsNav = setup.tuningTarget === "NAV";
    const displayActive = displayIsNav ? formatVloc(setup.navActive) : formatCom(setup.comActive);
    const displayStandby = displayIsNav ? formatVloc(setup.navStandby) : formatCom(setup.comStandby);
    const referenceLabel = displayIsNav ? "COM" : "NAV";
    const referenceFrequency = displayIsNav ? formatCom(setup.comActive) : formatVloc(setup.navActive);
    setText("setup2-gnc-squelch", setup.gncPower ? (displayIsNav ? (setup.navMode === "LOC" ? "ID" : "ACT") : "SQ") : "--");
    setText("setup2-gnc-monitor", setup.gncPower ? "STB" : "--");
    setText("setup2-gnc-mode", setup.gncPower ? (displayIsNav ? setup.navMode : "COM") : "OFF");
    setText("setup2-gnc-active-frequency", setup.gncPower ? displayActive : "OFF");
    setText("setup2-gnc-standby-frequency", setup.gncPower ? displayStandby : "OFF");
    setText("setup2-gnc-id", setup.gncPower ? (displayIsNav ? setup2NavId() : "COM ACTIVE") : "OFF");
    setText("setup2-gnc-standby-id", setup.gncPower ? `${setup.tuningTarget} STBY` : "OFF");
    setText("setup2-gnc-reference-label", setup.gncPower ? referenceLabel : "--");
    setText("setup2-gnc-reference-frequency", setup.gncPower ? referenceFrequency : "OFF");
    const geometry = setup2NavGeometry();
    let navDetail = "";
    if (displayIsNav && setup.gncPower && setup.navDisplay !== "FREQ") {
      navDetail = setup.navDisplay === "OBS"
        ? `OBS ${formatHeading(setup.course)}° · ${setup2NavFlag()} · CDI ${setup2CdiValue()}`
        : `${setup.navDisplay} ${geometry ? `${formatHeading(setup.navDisplay === "TO" ? geometry.bearingTo : geometry.radialFrom)}°` : "OFF"}`;
    }
    setText("setup2-gnc-nav-detail", navDetail);
    const detail = document.getElementById("setup2-gnc-nav-detail");
    if (detail) detail.hidden = !navDetail;
    setText("setup2-gnc-readout", setup.gncPower ? `${setup.tuningTarget} · ${displayActive}` : "OFF");
    setText("setup2-instrument-summary", `HDG ${formatHeading(setup.heading)}° · OBS ${formatHeading(setup.course)} · NAV ${formatVloc(setup.navActive)} · ${flag} · CDI ${setup.giPower && setup.gncPower ? setup2CdiValue() : "OFF"}`);
    renderSetup2Tutorial();
    renderChallengeChecklist();
  }

  function gpsDeviation(course = g5ReferenceCourse()) {
    const target = WAYPOINTS[state.waypoint] || WAYPOINTS.LPPR;
    return clamp(angleDelta(target.bearing, course) / 5, -2.5, 2.5);
  }

  function vlocDeviation(course = g5ReferenceCourse()) {
    const station = findVlocStation();
    if (!station) return 0;
    const geometry = tutorialVlocGeometry();
    const selectedReference = geometry
      ? (Math.abs(angleDelta(course, geometry.bearingTo)) < 90 ? geometry.bearingTo : geometry.radialFrom)
      : course;
    return clamp(angleDelta(course, selectedReference) / 5, -2.5, 2.5);
  }

  function cdiDeviation(course = g5ReferenceCourse()) {
    return state.source === "VLOC" ? vlocDeviation(course) : gpsDeviation(course);
  }

  function tutorialVlocGeometry() {
    const station = findVlocStation();
    const reference = station;
    if (!reference || !tutorialPosition) return null;
    const radialFrom = tutorialBearing(reference, tutorialPosition);
    return {
      radialFrom,
      bearingTo: normalize(radialFrom + 180),
      distanceNm: tutorialDistanceNm(reference, tutorialPosition),
    };
  }

  function tutorialNavFlag() {
    if (state.source !== "VLOC") return "GPS";
    const geometry = tutorialVlocGeometry();
    if (!geometry) return "NAV OFF";
    const alignment = Math.abs(angleDelta(g5ReferenceCourse(), geometry.bearingTo));
    if (Math.abs(alignment - 90) < 3) return "NAV";
    return alignment < 90 ? "TO" : "FROM";
  }

  function currentNavLabel() {
    if (state.source === "VLOC") {
      const station = findVlocStation();
      return station ? `VLOC ${station.name}` : "VLOC ---";
    }
    return `GPS ${state.waypoint}`;
  }

  function tutorialExample() {
    if (state.tutorialId === "free") return FREE_TUTORIAL_EXAMPLE;
    return TUTORIAL_EXAMPLES.find((example) => example.id === state.tutorialId) || TUTORIAL_EXAMPLES[0];
  }

  function isFreeTutorial() {
    return state.tutorialId === FREE_TUTORIAL_EXAMPLE.id;
  }

  function syncToFromGuideVisibility() {
    const guide = document.getElementById("av-tofrom-guide");
    if (!guide) return;
    const slot = document.querySelector(`[data-av-tofrom-guide-slot="${state.activeSetup}"]`);
    if (slot && guide.parentElement !== slot) slot.appendChild(guide);
    const selectId = state.activeSetup === "av-setup-2" ? "setup2-tutorial-example" : "av-tutorial-example";
    const introSelected = document.getElementById(selectId)?.value === TOFROM_INTRO_TUTORIAL_ID;
    guide.hidden = !introSelected;
    const panelId = state.activeSetup === "av-setup-2" ? "av-setup-2" : "av-setup-1";
    document.querySelector(`#${panelId} .av-tutorial-layout`)?.toggleAttribute("hidden", introSelected);
  }

  function tutorialToRadians(value) {
    return Number(value) * Math.PI / 180;
  }

  function tutorialBearing(from, to) {
    const lat1 = tutorialToRadians(from.lat);
    const lat2 = tutorialToRadians(to.lat);
    const deltaLongitude = tutorialToRadians(to.lng - from.lng);
    const y = Math.sin(deltaLongitude) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLongitude);
    return normalize(Math.atan2(y, x) * 180 / Math.PI);
  }

  function tutorialDistanceNm(from, to) {
    const lat1 = tutorialToRadians(from.lat);
    const lat2 = tutorialToRadians(to.lat);
    const deltaLatitude = tutorialToRadians(to.lat - from.lat);
    const deltaLongitude = tutorialToRadians(to.lng - from.lng);
    const sinLatitude = Math.sin(deltaLatitude / 2);
    const sinLongitude = Math.sin(deltaLongitude / 2);
    const haversine = sinLatitude * sinLatitude + Math.cos(lat1) * Math.cos(lat2) * sinLongitude * sinLongitude;
    return 2 * 3440.065 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  function tutorialDestination(origin, bearing, distanceNm) {
    const angularDistance = Number(distanceNm) / 3440.065;
    const bearingRad = tutorialToRadians(bearing);
    const latitudeRad = tutorialToRadians(origin.lat);
    const longitudeRad = tutorialToRadians(origin.lng);
    const destinationLatitude = Math.asin(
      Math.sin(latitudeRad) * Math.cos(angularDistance)
      + Math.cos(latitudeRad) * Math.sin(angularDistance) * Math.cos(bearingRad),
    );
    const destinationLongitude = longitudeRad + Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latitudeRad),
      Math.cos(angularDistance) - Math.sin(latitudeRad) * Math.sin(destinationLatitude),
    );
    return {
      lat: destinationLatitude * 180 / Math.PI,
      lng: ((destinationLongitude * 180 / Math.PI + 540) % 360) - 180,
    };
  }

  function tutorialFlightTime() {
    const totalSeconds = Math.max(0, Math.floor(tutorialFlight.elapsedSeconds));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function updateTutorialFlightControls() {
    const toggle = document.getElementById("av-tutorial-flight-toggle");
    if (toggle) {
      toggle.textContent = t(tutorialFlight.running ? "av_tutorial_pause" : "av_tutorial_go");
      toggle.setAttribute("aria-pressed", tutorialFlight.running ? "true" : "false");
    }
    renderTouchFlightControls("av-setup-1", state.heading, tutorialFlight.running);
  }

  function syncTutorialFlightInputsFromPosition() {
    const reference = tutorialReference();
    if (!reference || !tutorialPosition) return;
    tutorialFlight.radialFrom = tutorialBearing(reference, tutorialPosition);
    tutorialFlight.distanceNm = tutorialDistanceNm(reference, tutorialPosition);
    updateTutorialFlightControls();
  }

  function updateTutorialCompletionVisuals(prefix, success) {
    const status = document.getElementById(`${prefix}tutorial-status`);
    const objectiveText = document.getElementById(`${prefix}tutorial-objective-text`);
    const brief = objectiveText?.closest(".av-tutorial-brief");
    const objective = objectiveText?.closest(".av-tutorial-objective");
    [status, brief, objective].forEach((element) => element?.classList.toggle("is-success", success));
  }

  // Null denotes a reading tip: understanding it cannot be automatically assessed.
  function tutorialStepResults() {
    if (isFreeTutorial()) return [];
    const example = tutorialExample();
    const frequency = state.gnsPower && Math.abs(state.vlocActive - example.expectedFrequency) < 0.006;
    const hsiAvailable = g5HasPage("HSI");
    const source = frequency && state.source === "VLOC" && hsiAvailable;
    const course = hsiAvailable && g5PageHasValue("HSI", "course", example.expectedCourse, 4);
    const heading = g5PageHasValue("PFD", "headingBug", example.expectedHeading, 6)
      || g5PageHasValue("HSI", "headingBug", example.expectedHeading, 6);
    const indication = source && tutorialNavFlag() === example.expectedMode && Math.abs(cdiDeviation()) <= 0.8;
    if (example.kind === "MAP") {
      const mapPage = state.gnsPower && state.gnsGroup === "NAV" && state.gnsPageIndex === example.expectedGnsPageIndex;
      const gps = mapPage && state.source === "GPS" && state.waypoint === example.expectedWaypoint;
      const range = mapPage && state.mapRange === example.expectedMapRange;
      return [mapPage, gps, range, heading];
    }
    if (example.kind === "GPS") {
      const gps = state.gnsPower && hsiAvailable && state.source === "GPS" && state.waypoint === example.expectedWaypoint;
      return [gps, gps && state.directToActive && state.gnsGroup === "NAV", course && state.obsMode, heading];
    }
    if (example.id === "vis-to") return [frequency, source, course, heading && indication];
    return [source, course, heading && indication, null];
  }

  function setup2StepResults() {
    if (state.setup2TutorialId === "free") return [];
    const example = setup2TutorialExample();
    const setup = state.setup2;
    const nav = setup.gncPower && setup.tuningTarget === "NAV" && setup.navMode === "VOR";
    const frequency = nav && Math.abs(setup.navActive - example.frequency) < 0.006;
    if (example.id === "identify") return [nav, frequency, frequency];
    const course = setup.giPower && Math.abs(angleDelta(setup.course, example.course)) <= 4;
    const indication = frequency && setup.giPower && setup2NavFlag() === example.toFrom && setup2CdiValue() === "CENTER";
    return [frequency, course, indication];
  }

  function renderTutorialSteps(id, keys, results) {
    const list = document.getElementById(id);
    if (!list) return;
    list.classList.remove("is-success");
    const markup = keys.map((key, index) => {
      const done = results[index] === true;
      const informational = results[index] === null;
      const label = done ? "av_tutorial_step_done" : informational ? "av_tutorial_step_note" : "av_tutorial_step_pending";
      const badge = done ? "✓" : informational ? "i" : "○";
      return `<li class="${done ? "is-complete" : ""}">${t(key)}${results.length ? ` <span class="av-step-state" role="img" aria-label="${t(label)}" title="${t(label)}">${badge}</span>` : ""}</li>`;
    }).join("");
    if (list.innerHTML !== markup) list.innerHTML = markup;
  }

  function tutorialStepsPassed(results, position, example) {
    const tasks = results.filter((result) => result !== null);
    return tasks.length > 0 && tasks.every(Boolean) && Boolean(position) && tutorialDistanceNm(position, example.start) <= 9;
  }

  function stopTutorialFlight(shouldRender = true) {
    if (tutorialFlight.intervalId !== null) {
      window.clearInterval(tutorialFlight.intervalId);
      tutorialFlight.intervalId = null;
    }
    tutorialFlight.running = false;
    if (shouldRender) render();
  }

  function advanceTutorialFlight() {
    if (!tutorialFlight.running || !tutorialPosition) return;
    const stepSeconds = 0.1;
    tutorialPosition = tutorialDestination(tutorialPosition, state.heading, tutorialFlight.speedKts * stepSeconds / 3600);
    tutorialFlight.elapsedSeconds += stepSeconds;
    if (state.gnsPower && state.gnsFlightPlanActive && !state.obsMode) {
      const target = gnsFindWaypoint(state.gnsFlightPlan[state.gnsFlightPlanLeg]);
      if (target && tutorialDistanceNm(tutorialPosition, target) < 0.3 && state.gnsFlightPlanLeg < state.gnsFlightPlan.length - 1) {
        state.gnsFlightPlanLeg += 1;
        gnsActivate(state.gnsFlightPlan[state.gnsFlightPlanLeg], true);
      }
    }
    syncTutorialFlightInputsFromPosition();
    render();
  }

  function toggleTutorialFlight() {
    if (tutorialFlight.running) {
      stopTutorialFlight();
      return;
    }
    if (!tutorialPosition) tutorialPosition = { ...tutorialExample().start };
    tutorialFlight.running = true;
    tutorialFlight.elapsedSeconds = 0;
    tutorialFlight.intervalId = window.setInterval(advanceTutorialFlight, 100);
    render();
  }

  function turnTutorial(direction) {
    state.heading = normalize(state.heading + Number(direction) * 5);
    render();
  }

  function moveSetup2TutorialByKeyboard(key) {
    state.setup2.heading = normalize(state.setup2.heading + (key === "ArrowLeft" ? -5 : 5));
    state.setup2TutorialResultKey = "av_setup2_tutorial_ready";
    state.setup2StatusKey = "av_setup2_tutorial_ready";
    state.setup2StatusText = "";
    renderSetup2();
  }

  function stopSetup2Flight(shouldRender = true) {
    if (setup2Flight.intervalId !== null) window.clearInterval(setup2Flight.intervalId);
    setup2Flight.intervalId = null;
    setup2Flight.running = false;
    if (shouldRender) renderSetup2();
  }

  function toggleSetup2Flight() {
    if (setup2Flight.running) {
      stopSetup2Flight();
      return;
    }
    setup2Flight.running = true;
    let lastTime = performance.now();
    setup2Flight.intervalId = window.setInterval(() => {
      const now = performance.now();
      const seconds = Math.min((now - lastTime) / 1000, 1);
      lastTime = now;
      if (!document.getElementById("avionics")?.classList.contains("active") || state.activeSetup !== "av-setup-2") {
        stopSetup2Flight();
        return;
      }
      setup2TutorialPosition = tutorialDestination(setup2TutorialPosition || setup2TutorialExample().start, state.setup2.heading, 90 * seconds / 3600);
      renderSetup2();
    }, 100);
    renderSetup2();
  }

  function handleTutorialFlightKey(event) {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!document.getElementById("avionics")?.classList.contains("active") || !["av-setup-1", "av-setup-2"].includes(state.activeSetup)) return;
    const setup2MapContainer = setup2TutorialMap?.getContainer?.();
    const setup1MapContainer = tutorialMap?.getContainer?.();
    const eventMap = event.target?.closest?.(".av-tutorial-map");
    const activeMap = document.activeElement?.closest?.(".av-tutorial-map");
    const mapTarget = eventMap || activeMap
      || (setup2MapContainer?.contains(event.target) ? setup2MapContainer : null)
      || (setup1MapContainer?.contains(event.target) ? setup1MapContainer : null);
    const protectedTarget = event.target?.closest?.("input, select, textarea, [contenteditable]:not([contenteditable='false']), [role='dialog'], [role='tablist']");
    if (protectedTarget || (event.target?.closest?.(".avionics-layout") && !mapTarget)) return;
    if (state.activeSetup === "av-setup-2") {
      event.preventDefault();
      event.stopPropagation();
      moveSetup2TutorialByKeyboard(event.key);
      return;
    }
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    // Capture before Leaflet handles the same arrows as map-panning commands.
    event.stopPropagation();
    turnTutorial(event.key === "ArrowLeft" ? -1 : 1);
  }

  function tutorialReference() {
    if (isFreeTutorial() && state.tutorialReferenceId) {
      return TUTORIAL_REFERENCES[state.tutorialReferenceId] || NAV_AIDS.VIS;
    }
    if (isFreeTutorial()) return findVlocStation() || NAV_AIDS.VIS;
    return TUTORIAL_REFERENCES[tutorialExample().reference] || TUTORIAL_REFERENCES.VIS;
  }

  function setup2TutorialReference() {
    if (state.setup2SelectedReferenceId) {
      return TUTORIAL_REFERENCES[state.setup2SelectedReferenceId] || NAV_AIDS.VIS;
    }
    return findNavStation(state.setup2.navActive) || TUTORIAL_REFERENCES[setup2TutorialExample().reference];
  }

  function navAidDescription(reference) {
    return [reference.type, reference.frequency ? `${formatVloc(reference.frequency)} MHz` : "", reference.channel ? `CH ${reference.channel}` : ""].filter(Boolean).join(" · ") || "GPS waypoint";
  }

  function navAidReferenceLabel(reference) {
    if (reference.frequency) return `${formatVloc(reference.frequency)} MHz`;
    if (reference.channel) return `CH ${reference.channel}`;
    return "GPS";
  }

  function renderNavAidCatalogs() {
    const stations = Object.values(NAV_AIDS).sort((a, b) => a.name.localeCompare(b.name, "pt"));
    const rows = stations.map(station => `<tr><td><button type="button" class="btn" data-av-navaid="${station.id}" title="${t("av_navaids_locate")}">${station.name}</button><br><small>${station.type}</small></td><td class="mono">${station.id}</td><td class="mono">${station.frequency ? `${formatVloc(station.frequency)} MHz` : "—"}<br><small>CH ${station.channel}</small></td></tr>`).join("");
    document.querySelectorAll("[data-av-navaids]").forEach(list => {
      if (list.innerHTML !== rows) list.innerHTML = rows;
    });
  }

  function locateNavAid(button) {
    const reference = NAV_AIDS[button.dataset.avNavaid];
    const map = button.closest("#av-setup-2") ? setup2TutorialMap : tutorialMap;
    if (!reference || !map) return;
    map.setView([reference.lat, reference.lng], 9);
    map.getContainer().focus({ preventScroll: true });
  }

  function selectTrainingNavAid(reference, setupId) {
    if (!reference || !NAV_AIDS[reference.id]) return;
    const hasVorSignal = Number.isFinite(reference.frequency);
    if (setupId === "av-setup-2") {
      const position = setup2TutorialPosition || setup2TutorialExample().start;
      state.setup2SelectedReferenceId = hasVorSignal ? null : reference.id;
      state.setup2.tuningTarget = "NAV";
      if (hasVorSignal) {
        const previousActive = state.setup2.navActive;
        state.setup2.navActive = reference.frequency;
        if (Math.abs(previousActive - reference.frequency) > 0.006) state.setup2.navStandby = previousActive;
        state.setup2.navMode = "VOR";
        state.setup2.navDisplay = "OBS";
        state.setup2.course = tutorialBearing(position, reference);
        setup2SetStatus(`${reference.id} ${navAidReferenceLabel(reference)} sintonizado · OBS ${formatHeading(state.setup2.course)}°.`);
      } else {
        // DME-only sites remain map/GPS references; they must not create a VOR signal.
        state.setup2.navDisplay = "FREQ";
        setup2SetStatus(`${reference.id} ${navAidReferenceLabel(reference)} · referência DME/GPS; sem sinal VOR.`);
      }
      renderSetup2();
      refreshSetup2TutorialMap(true);
      setup2TutorialMap?.getContainer().focus({ preventScroll: true });
      return;
    }

    const position = tutorialPosition || tutorialExample().start;
    state.tutorialReferenceId = hasVorSignal ? null : reference.id;
    if (hasVorSignal) {
      const previousActive = state.vlocActive;
      state.vlocActive = reference.frequency;
      if (Math.abs(previousActive - reference.frequency) > 0.006) state.vlocStandby = previousActive;
      state.tuningTarget = "VLOC";
      state.source = "VLOC";
      state.obsMode = false;
      state.waypoint = reference.id;
      const course = tutorialBearing(position, reference);
      state.g5PfdCourse = course;
      state.g5HsiCourse = course;
      gnsDefaultNav();
      setStatus(`${reference.id} ${navAidReferenceLabel(reference)} sintonizado · curso ${formatHeading(course)}°.`);
    } else {
      // DME-only sites can be followed in the educational GPS/map view only.
      gnsActivate(reference.id);
      setStatus(`${reference.id} ${navAidReferenceLabel(reference)} selecionado · rota GPS visual; sem sinal VOR.`);
    }
    render();
    refreshTutorialMap(true);
    tutorialMap?.getContainer().focus({ preventScroll: true });
  }

  function tutorialAircraftIcon(heading = 0) {
    return global.L.divIcon({
      className: "",
      html: `<div class="av-tutorial-aircraft-marker" role="img" aria-label="Avião do exercício"><svg class="av-tutorial-aircraft-direction" viewBox="0 0 32 32" aria-hidden="true" style="transform:rotate(${normalize(heading)}deg)"><path fill="currentColor" d="M16 2c-1 0-2 2-2 4v7L3 20v3l11-4v6l-4 3v2l6-2 6 2v-2l-4-3v-6l11 4v-3l-11-7V6c0-2-1-4-2-4z"/></svg></div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
  }

  function tutorialReferenceIcon(reference, active) {
    return global.L.divIcon({
      className: "",
      html: `<div class="av-tutorial-reference-marker${active ? " is-active" : ""}"><strong>${reference.id}</strong><span>${reference.frequency ? formatVloc(reference.frequency) : reference.channel ? `CH ${reference.channel}` : "GPS"}</span></div>`,
      iconSize: [72, 42],
      iconAnchor: [36, 21],
    });
  }

  function tutorialMapTarget() {
    const reference = tutorialReference();
    return { lat: reference.lat, lng: reference.lng };
  }

  function initTutorialMap() {
    if (tutorialMap || !global.L || !document.getElementById("av-tutorial-map")) return;
    tutorialMap = global.L.map("av-tutorial-map", { zoomControl: true }).setView([41.0, -8.25], 7.5);
    global.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(tutorialMap);

    tutorialReferenceMarkers = Object.values(TUTORIAL_REFERENCES).map((reference) => {
      const marker = global.L.marker([reference.lat, reference.lng], {
        icon: tutorialReferenceIcon(reference, false),
        zIndexOffset: 500,
      }).addTo(tutorialMap);
      marker.bindPopup(`<strong>${reference.name}</strong><br>${navAidDescription(reference)}`);
      if (NAV_AIDS[reference.id]) marker.on("click", () => selectTrainingNavAid(reference, "av-setup-1"));
      return { reference, marker };
    });

    tutorialLine = global.L.polyline([], { color: "#f59e0b", weight: 3, opacity: 0.9, dashArray: "8 7" }).addTo(tutorialMap);
    tutorialAircraftMarker = global.L.marker([tutorialPosition?.lat || 40.723333, tutorialPosition?.lng || -8.235833], {
      icon: tutorialAircraftIcon(state.heading),
      draggable: true,
      keyboard: true,
      zIndexOffset: 900,
      title: "Avião do exercício",
    }).addTo(tutorialMap);
    tutorialAircraftMarker.on("drag", (event) => {
      stopTutorialFlight(false);
      tutorialPosition = event.target.getLatLng();
      state.tutorialResultKey = isFreeTutorial() ? "av_tutorial_free_ready" : "av_tutorial_ready";
      syncTutorialFlightInputsFromPosition();
      render();
    });
    tutorialAircraftMarker.on("dragend", (event) => {
      stopTutorialFlight(false);
      tutorialPosition = event.target.getLatLng();
      state.tutorialResultKey = isFreeTutorial() ? "av_tutorial_free_ready" : "av_tutorial_ready";
      syncTutorialFlightInputsFromPosition();
      render();
      tutorialMap.getContainer().focus({ preventScroll: true });
    });
    tutorialMap.on("click", (event) => {
      stopTutorialFlight(false);
      tutorialPosition = event.latlng;
      tutorialAircraftMarker.setLatLng(event.latlng);
      state.tutorialResultKey = isFreeTutorial() ? "av_tutorial_free_ready" : "av_tutorial_ready";
      syncTutorialFlightInputsFromPosition();
      render();
      tutorialMap.getContainer().focus({ preventScroll: true });
    });
    renderTutorial();
    refreshTutorialMap();
  }

  function refreshTutorialMap(fitMap = false) {
    if (!tutorialMap) return;
    const refresh = () => {
      if (!tutorialMap) return;
      tutorialMap.invalidateSize({ pan: false });
      if (!fitMap) return;
      const example = tutorialExample();
      const position = tutorialPosition || example.start;
      tutorialMap.fitBounds([position, tutorialMapTarget()], { padding: [45, 45], maxZoom: 9 });
    };
    refresh();
    window.setTimeout(refresh, 120);
    window.setTimeout(refresh, 360);
  }

  function renderTutorial() {
    syncToFromGuideVisibility();
    const example = tutorialExample();
    const reference = tutorialReference();
    const position = tutorialPosition || example.start;
    const target = tutorialMapTarget();
    const bearingTo = tutorialBearing(position, target);
    const radialFrom = tutorialBearing(target, position);
    const distance = tutorialDistanceNm(position, target);
    tutorialFlight.radialFrom = radialFrom;
    tutorialFlight.distanceNm = distance;
    const stepResults = tutorialStepResults();
    const passed = tutorialStepsPassed(stepResults, tutorialPosition, example);
    if (passed) state.tutorialResultKey = "av_tutorial_success";
    else if (state.tutorialResultKey === "av_tutorial_success") state.tutorialResultKey = "av_tutorial_ready";
    renderTutorialSteps("av-tutorial-steps", example.steps, stepResults);
    updateTutorialCompletionVisuals("av-", passed);
    setText("av-tutorial-example-title", t(example.titleKey));
    setText("av-tutorial-briefing", t(example.briefingKey));
    setText("av-tutorial-objective-text", t(example.objectiveKey));
    setText("av-tutorial-aircraft", `${position.lat.toFixed(3)}°, ${position.lng.toFixed(3)}° · ${distance.toFixed(1)} NM`);
    setText("av-tutorial-reference", `${reference.name} · ${navAidReferenceLabel(reference)}`);
    setText("av-tutorial-bearing", `${formatHeading(bearingTo)}°`);
    setText("av-tutorial-radial-readout", `${formatHeading(radialFrom)}°`);
    setText("av-tutorial-status", t(state.tutorialResultKey));
    if (tutorialFlight.running && !passed) setText("av-tutorial-status", `${t("av_tutorial_flight_running")} · ${tutorialFlight.speedKts} KTS · HDG ${formatHeading(state.heading)}°`);
    const exampleIndex = TUTORIAL_EXAMPLES.findIndex((item) => item.id === example.id);
    const introSelected = document.getElementById("av-tutorial-example")?.value === TOFROM_INTRO_TUTORIAL_ID;
    setText("av-tutorial-progress", introSelected ? t("av_tutorial_intro_badge") : isFreeTutorial() ? t("av_tutorial_free_badge") : `${exampleIndex + 1} / ${TUTORIAL_EXAMPLES.length}`);
    setText("av-tutorial-load", t(isFreeTutorial() ? "av_tutorial_load_free" : "av_tutorial_load"));
    const checkButton = document.getElementById("av-tutorial-check");
    if (checkButton) checkButton.disabled = isFreeTutorial() || document.getElementById("av-tutorial-example")?.value === TOFROM_INTRO_TUTORIAL_ID;
    updateTutorialFlightControls();

    if (!tutorialMap || !tutorialAircraftMarker) return;
    tutorialAircraftMarker.setLatLng(position);
    const direction = tutorialAircraftMarker.getElement()?.querySelector(".av-tutorial-aircraft-direction");
    if (direction) direction.style.transform = `rotate(${normalize(state.heading)}deg)`;
    // Do not leave the exercise's orange guide pointing at Viseu after the
    // pilot tunes another VOR (for example FTM). Free mode follows the tuned
    // VOR through tutorialReference(); guided VLOC lines remain only while
    // their active station matches the exercise reference.
    const activeVloc = findVlocStation();
    const lineMatchesReference = !activeVloc || activeVloc.id === reference.id;
    tutorialLine?.setLatLngs(lineMatchesReference ? [position, target] : []);
    tutorialReferenceMarkers.forEach(({ reference: item, marker }) => {
      marker.setIcon(tutorialReferenceIcon(item, item.id === reference.id));
    });
  }

  function setup2TutorialExample() {
    if (state.setup2TutorialId === "free") return { id: "free", reference: "VIS", start: SETUP2_TUTORIAL_EXAMPLES[0].start, initialActive: 113.10, initialStandby: 114.10 };
    return SETUP2_TUTORIAL_EXAMPLES.find((item) => item.id === state.setup2TutorialId) || SETUP2_TUTORIAL_EXAMPLES[0];
  }

  function initSetup2TutorialMap() {
    if (setup2TutorialMap || !global.L || !document.getElementById("setup2-tutorial-map")) return;
    setup2TutorialMap = global.L.map("setup2-tutorial-map", { zoomControl: true }).setView([41.0, -8.25], 7.5);
    const setup2MapContainer = setup2TutorialMap.getContainer();
    // Capture aircraft turns before Leaflet pans the map.
    setup2MapContainer.tabIndex = 0;
    setup2MapContainer.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (state.activeSetup !== "av-setup-2") return;
      event.preventDefault();
      event.stopPropagation();
      moveSetup2TutorialByKeyboard(event.key);
    });
    global.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(setup2TutorialMap);
    setup2TutorialReferenceMarkers = Object.values(NAV_AIDS).map((reference) => {
      const marker = global.L.marker([reference.lat, reference.lng], {
        icon: tutorialReferenceIcon(reference, false), zIndexOffset: 500,
      }).addTo(setup2TutorialMap);
      marker.bindPopup(`<strong>${reference.name}</strong><br>${navAidDescription(reference)}`);
      marker.on("click", () => selectTrainingNavAid(reference, "av-setup-2"));
      return { reference, marker };
    });
    setup2TutorialLine = global.L.polyline([], { color: "#f59e0b", weight: 3, opacity: 0.9, dashArray: "8 7" }).addTo(setup2TutorialMap);
    const start = setup2TutorialPosition || SETUP2_TUTORIAL_EXAMPLES[0].start;
    setup2TutorialAircraftMarker = global.L.marker([start.lat, start.lng], {
      icon: tutorialAircraftIcon(state.setup2.heading), draggable: true, keyboard: true, zIndexOffset: 900,
      title: "Avião do exercício Setup 2",
    }).addTo(setup2TutorialMap);
    setup2TutorialAircraftMarker.on("dragstart", () => stopSetup2Flight(false));
    setup2TutorialAircraftMarker.on("drag", (event) => {
      setup2TutorialPosition = event.target.getLatLng();
      state.setup2TutorialResultKey = "av_setup2_tutorial_ready";
      state.setup2StatusKey = "av_setup2_tutorial_ready";
      renderSetup2();
    });
    setup2TutorialAircraftMarker.on("dragend", (event) => {
      setup2TutorialPosition = event.target.getLatLng();
      state.setup2TutorialResultKey = "av_setup2_tutorial_ready";
      state.setup2StatusKey = "av_setup2_tutorial_ready";
      renderSetup2();
      setup2TutorialMap.getContainer().focus({ preventScroll: true });
    });
    setup2TutorialAircraftMarker.on("click", () => {
      setup2TutorialMap.getContainer().focus({ preventScroll: true });
    });
    setup2TutorialMap.on("click", (event) => {
      stopSetup2Flight(false);
      setup2TutorialPosition = event.latlng;
      setup2TutorialAircraftMarker.setLatLng(event.latlng);
      state.setup2TutorialResultKey = "av_setup2_tutorial_ready";
      state.setup2StatusKey = "av_setup2_tutorial_ready";
      renderSetup2();
      setup2TutorialMap.getContainer().focus({ preventScroll: true });
    });
    renderSetup2Tutorial();
  }

  function renderSetup2Tutorial() {
    syncToFromGuideVisibility();
    const example = setup2TutorialExample();
    const free = example.id === "free";
    const index = SETUP2_TUTORIAL_EXAMPLES.indexOf(example) + 1;
    const prefix = free ? "av_setup2_free" : `av_setup2_level${index}`;
    const reference = setup2TutorialReference();
    const position = setup2TutorialPosition || example.start;
    const bearingTo = tutorialBearing(position, reference);
    const radialFrom = tutorialBearing(reference, position);
    const distance = tutorialDistanceNm(position, reference);
    const introSelected = document.getElementById("setup2-tutorial-example")?.value === TOFROM_INTRO_TUTORIAL_ID;
    setText("setup2-tutorial-progress", introSelected ? t("av_tutorial_intro_badge") : free ? t("av_tutorial_free_badge") : `${index} / ${SETUP2_TUTORIAL_EXAMPLES.length}`);
    setText("setup2-tutorial-example-title", t(`${prefix}_title`));
    setText("setup2-tutorial-briefing", t(`${prefix}_briefing`));
    setText("setup2-tutorial-objective-text", t(`${prefix}_objective`));
    setText("setup2-tutorial-aircraft", `${position.lat.toFixed(3)}°, ${position.lng.toFixed(3)}° · ${distance.toFixed(1)} NM`);
    setText("setup2-tutorial-reference", `${reference.name} · ${navAidReferenceLabel(reference)}`);
    setText("setup2-tutorial-bearing", `${formatHeading(bearingTo)}°`);
    setText("setup2-tutorial-radial", `${formatHeading(radialFrom)}°`);
    const stepResults = setup2StepResults();
    const passed = state.setup2.giPower && tutorialStepsPassed(stepResults, setup2TutorialPosition, example);
    if (passed) state.setup2TutorialResultKey = "av_setup2_tutorial_success";
    else if (state.setup2TutorialResultKey === "av_setup2_tutorial_success") state.setup2TutorialResultKey = "av_setup2_tutorial_ready";
    setText("setup2-tutorial-status", free ? t("av_setup2_free_ready") : t(state.setup2TutorialResultKey));
    if (setup2Flight.running) setText("setup2-tutorial-status", `${t("av_tutorial_flight_running")} · 90 KTS · HDG ${formatHeading(state.setup2.heading)}°`);
    const flightToggle = document.getElementById("setup2-tutorial-flight-toggle");
    if (flightToggle) {
      flightToggle.textContent = t(setup2Flight.running ? "av_tutorial_pause" : "av_tutorial_go");
      flightToggle.classList.toggle("is-running", setup2Flight.running);
      flightToggle.setAttribute("aria-pressed", String(setup2Flight.running));
    }
    const check = document.getElementById("setup2-tutorial-check");
    if (check) check.disabled = free || document.getElementById("setup2-tutorial-example")?.value === TOFROM_INTRO_TUTORIAL_ID;
    renderTouchFlightControls("av-setup-2", state.setup2.heading, setup2Flight.running);
    setText("setup2-tutorial-load", t(free ? "av_tutorial_load_free" : "av_tutorial_load"));
    renderTutorialSteps("setup2-tutorial-steps", [1, 2, 3].map((step) => `${prefix}_step${step}`), stepResults);
    updateTutorialCompletionVisuals("setup2-", passed);
    if (!setup2TutorialMap || !setup2TutorialAircraftMarker) return;
    setup2TutorialAircraftMarker.setLatLng(position);
    const direction = setup2TutorialAircraftMarker.getElement()?.querySelector(".av-tutorial-aircraft-direction");
    if (direction) direction.style.transform = `rotate(${normalize(state.setup2.heading)}deg)`;
    setup2TutorialLine?.setLatLngs([position, reference]);
    setup2TutorialReferenceMarkers.forEach(({ reference: item, marker }) => {
      marker.setIcon(tutorialReferenceIcon(item, item.id === reference.id));
    });
  }

  function loadSetup2TutorialExample(id, fitMap = true) {
    stopSetup2Flight(false);
    if (id === TOFROM_INTRO_TUTORIAL_ID) {
      const select = document.getElementById("setup2-tutorial-example");
      if (select) select.value = id;
      syncToFromGuideVisibility();
      renderSetup2();
      return;
    }
    state.setup2TutorialId = id === "free" ? "free" : (SETUP2_TUTORIAL_EXAMPLES.find((item) => item.id === id) || SETUP2_TUTORIAL_EXAMPLES[0]).id;
    state.setup2SelectedReferenceId = null;
    const example = setup2TutorialExample();
    state.setup2TutorialResultKey = "av_setup2_tutorial_ready";
    state.setup2StatusKey = "av_setup2_tutorial_ready";
    state.setup2StatusText = "";
    setup2TutorialPosition = { ...example.start };
    Object.assign(state.setup2, {
      giPower: true, gncPower: true, course: 270, navMode: "VOR", navDisplay: "FREQ", heading: example.course ?? 90,
      navActive: example.initialActive, navStandby: example.initialStandby,
      comActive: 118.000, comStandby: 122.800, tuningTarget: "NAV",
    });
    const select = document.getElementById("setup2-tutorial-example");
    if (select) select.value = example.id;
    setText("setup2-training-status", t("av_setup2_tutorial_ready"));
    renderSetup2();
    if (state.activeSetup === "av-setup-2") initSetup2TutorialMap();
    if (fitMap) refreshSetup2TutorialMap(true);
  }

  function refreshSetup2TutorialMap(fitMap = false) {
    const refresh = () => {
      const container = document.getElementById("setup2-tutorial-map");
      if (state.activeSetup !== "av-setup-2" || !container?.clientWidth || !container?.clientHeight || !setup2TutorialMap) return;
      setup2TutorialMap.invalidateSize();
      if (fitMap) setup2TutorialMap.fitBounds([setup2TutorialPosition || setup2TutorialExample().start, setup2TutorialReference()], { padding: [45, 45], maxZoom: 9 });
      renderSetup2Tutorial();
    };
    refresh();
    window.setTimeout(refresh, 120);
    window.setTimeout(refresh, 360);
  }

  function checkSetup2Tutorial() {
    if (state.setup2TutorialId === "free") return;
    const example = setup2TutorialExample();
    const setup = state.setup2;
    const positionOk = setup2TutorialPosition && tutorialDistanceNm(setup2TutorialPosition, example.start) <= 9;
    let result = "av_setup2_tutorial_success";
    if (!setup.giPower || !setup.gncPower) result = "av_setup2_tutorial_power";
    else if (!positionOk) result = "av_setup2_tutorial_position";
    else if (setup.tuningTarget !== "NAV" || setup.navMode !== "VOR" || Math.abs(setup.navActive - example.frequency) >= 0.006) result = "av_setup2_tutorial_frequency";
    else if (example.course !== null && Math.abs(angleDelta(setup.course, example.course)) > 4) result = "av_setup2_tutorial_course";
    else if (example.toFrom && setup2NavFlag() !== example.toFrom) result = "av_setup2_tutorial_tofrom";
    else if (example.course !== null && setup2CdiValue() !== "CENTER") result = "av_setup2_tutorial_cdi";
    state.setup2TutorialResultKey = result;
    state.setup2StatusKey = result;
    state.setup2StatusText = "";
    setText("setup2-training-status", t(result));
    renderSetup2Tutorial();
  }

  function nextSetup2TutorialExample() {
    if (document.getElementById("setup2-tutorial-example")?.value === TOFROM_INTRO_TUTORIAL_ID) {
      loadSetup2TutorialExample(SETUP2_TUTORIAL_EXAMPLES[0].id);
      return;
    }
    const index = SETUP2_TUTORIAL_EXAMPLES.indexOf(setup2TutorialExample());
    loadSetup2TutorialExample(SETUP2_TUTORIAL_EXAMPLES[(index + 1) % SETUP2_TUTORIAL_EXAMPLES.length].id);
  }

  function challengePassed(id) {
    const row = Array.from(document.querySelectorAll("[data-challenge-id]")).find((item) => item.dataset.challengeId === id);
    if (!row) return false;
    const exampleId = row.dataset.challengeExample;
    if (row.dataset.challengeSetup === "av-setup-1") {
      if (state.tutorialId !== exampleId || isFreeTutorial()) return false;
      const example = tutorialExample();
      return tutorialStepsPassed(tutorialStepResults(), tutorialPosition, example);
    }
    if (state.setup2TutorialId !== exampleId) return false;
    const example = setup2TutorialExample();
    return Boolean(state.setup2.giPower && tutorialStepsPassed(setup2StepResults(), setup2TutorialPosition, example));
  }

  function renderChallengeChecklist() {
    const rows = document.querySelectorAll("[data-challenge-id]");
    if (!rows.length) return;
    let confirmedCount = 0;
    rows.forEach((row) => {
      const id = row.dataset.challengeId;
      const confirmed = Boolean(state.challengeConfirmed[id]);
      const passed = challengePassed(id);
      const active = state.activeSetup === row.dataset.challengeSetup
        && ((row.dataset.challengeSetup === "av-setup-1" && state.tutorialId === row.dataset.challengeExample)
          || (row.dataset.challengeSetup === "av-setup-2" && state.setup2TutorialId === row.dataset.challengeExample));
      const status = row.querySelector("[data-challenge-status]");
      const confirmButton = row.querySelector(".av-challenge-confirm");
      const openButton = row.querySelector(".av-challenge-open");
      row.classList.toggle("is-active", active);
      row.classList.toggle("is-ready", passed && !confirmed);
      row.classList.toggle("is-complete", confirmed);
      if (status) status.textContent = t(confirmed ? "av_checklist_confirmed" : passed ? "av_checklist_ready" : active ? "av_checklist_in_progress" : "av_checklist_pending");
      if (confirmButton) {
        confirmButton.disabled = confirmed || !passed;
        confirmButton.textContent = t(confirmed ? "av_checklist_confirmed_button" : "av_checklist_confirm");
      }
      if (openButton) openButton.setAttribute("aria-pressed", active ? "true" : "false");
      if (confirmed) confirmedCount += 1;
    });
    setText("av-challenge-checklist-progress", `${confirmedCount} / ${rows.length}`);
  }

  function openChallenge(id) {
    const row = Array.from(document.querySelectorAll("[data-challenge-id]")).find((item) => item.dataset.challengeId === id);
    if (!row) return;
    const setup = row.dataset.challengeSetup;
    if (setup === "av-setup-2") {
      switchAvionicsSetup(setup);
      loadSetup2TutorialExample(row.dataset.challengeExample);
    } else {
      switchAvionicsSetup(setup);
      loadTutorialExample(row.dataset.challengeExample);
    }
    row.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }

  function confirmChallenge(id) {
    if (!challengePassed(id)) return;
    state.challengeConfirmed[id] = true;
    setStatus(t("av_checklist_confirmation_saved"));
    render();
  }

  function loadTutorialExample(id, fitMap = true) {
    if (id === TOFROM_INTRO_TUTORIAL_ID) {
      stopTutorialFlight(false);
      const select = document.getElementById("av-tutorial-example");
      if (select) select.value = id;
      syncToFromGuideVisibility();
      render();
      return;
    }
    resetGnsUi();
    stopTutorialFlight(false);
    const example = id === FREE_TUTORIAL_EXAMPLE.id
      ? FREE_TUTORIAL_EXAMPLE
      : TUTORIAL_EXAMPLES.find((item) => item.id === id) || TUTORIAL_EXAMPLES[0];
    state.tutorialId = example.id;
    state.tutorialReferenceId = null;
    state.tutorialResultKey = isFreeTutorial() ? "av_tutorial_free_ready" : "av_tutorial_ready";
    if (isFreeTutorial()) {
      tutorialFlight.elapsedSeconds = 0;
      tutorialPosition = tutorialPosition ? { ...tutorialPosition } : { ...example.start };
      syncTutorialFlightInputsFromPosition();
      const select = document.getElementById("av-tutorial-example");
      if (select) select.value = example.id;
      render();
      if (fitMap && tutorialMap) tutorialMap.setView([tutorialPosition.lat, tutorialPosition.lng], Math.max(tutorialMap.getZoom(), 8));
      return;
    }
    Object.values(g5Settings).forEach(settings => Object.assign(settings, defaultG5Settings()));
    Object.assign(state, {
      g5PfdPower: true,
      g5HsiPower: true,
      g5PfdPage: "PFD",
      g5HsiPage: "HSI",
      g5PfdMode: "HDG",
      g5HsiMode: "HDG",
      g5PfdMenu: false,
      g5HsiMenu: false,
      g5PfdMenuSelection: "HDG",
      g5HsiMenuSelection: "HDG",
      g5PfdHeadingBug: 270,
      g5HsiHeadingBug: 270,
      g5PfdCourse: 270,
      g5HsiCourse: 270,
      g5PfdBearingPointer: true,
      g5HsiBearingPointer: true,
      g5LastUnit: null,
      gnsPower: true,
      heading: 270,
      source: "GPS",
      waypoint: example.kind === "GPS" ? "LPVL" : example.kind === "MAP" ? example.expectedWaypoint : "LPPR",
      obsMode: false,
      tuningTarget: "COM",
      comActive: 118.00,
      comStandby: 122.80,
      vlocActive: 110.30,
      vlocStandby: 114.10,
      gnsGroup: "NAV",
      gnsPageIndex: 0,
      gnsMenu: false,
      gnsCursor: false,
      directToArmed: false,
      directToActive: false,
      directEntry: "",
      mapRange: example.kind === "MAP" ? 40 : 20,
      message: "",
    });
    tutorialPosition = { ...example.start };
    tutorialFlight.elapsedSeconds = 0;
    syncTutorialFlightInputsFromPosition();
    const select = document.getElementById("av-tutorial-example");
    if (select) select.value = example.id;
    setStatus(t("av_tutorial_ready"));
    render();
    if (fitMap && tutorialMap) {
      const target = tutorialMapTarget();
      tutorialMap.fitBounds([tutorialPosition, target], { padding: [45, 45], maxZoom: 9 });
    }
  }

  function tutorialCheck() {
    const example = tutorialExample();
    if (isFreeTutorial()) {
      state.tutorialResultKey = "av_tutorial_free_ready";
      setStatus(t(state.tutorialResultKey));
      renderTutorial();
      return;
    }
    const passed = tutorialStepsPassed(tutorialStepResults(), tutorialPosition, example);
    state.tutorialResultKey = passed ? example.successKey : "av_tutorial_not_yet";
    setStatus(t(state.tutorialResultKey));
    renderTutorial();
  }

  function nextTutorialExample() {
    if (document.getElementById("av-tutorial-example")?.value === TOFROM_INTRO_TUTORIAL_ID) {
      loadTutorialExample(TUTORIAL_EXAMPLES[0].id);
      return;
    }
    const currentIndex = TUTORIAL_EXAMPLES.findIndex((example) => example.id === state.tutorialId);
    const next = TUTORIAL_EXAMPLES[(Math.max(0, currentIndex) + 1) % TUTORIAL_EXAMPLES.length];
    loadTutorialExample(next.id);
  }

  function canvasText(ctx, text, x, y, options = {}) {
    ctx.save();
    ctx.fillStyle = options.color || "#f8fafc";
    ctx.font = options.font || "16px Consolas, monospace";
    ctx.textAlign = options.align || "left";
    ctx.textBaseline = options.baseline || "middle";
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawG5Off(ctx, width, height) {
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, width, height);
    canvasText(ctx, "G5", width / 2, height / 2 - 10, { font: "700 34px Segoe UI, sans-serif", align: "center" });
    canvasText(ctx, "OFF", width / 2, height / 2 + 30, { color: "#94a3b8", font: "700 20px Consolas, monospace", align: "center" });
  }

  // Visual reference: approved G5 mockups / Garmin 190-01112-12 Rev. A.
  // A fixed 800x600 drawing space preserves the 4:3 instrument geometry.
  // IAS/altitude are educational constants; navigation stays live.
  function drawG5Display(ctx, width, height, unit) {
    const white = "#f7fafc", cyan = "#65e4f1", magenta = "#d965e1";
    const green = "#55df66", yellow = "#fff034";
    const navColor = state.source === "GPS" ? magenta : green;
    const settings = g5Settings[unit];
    const heading = state.heading, course = g5Course(unit);
    const cdi = cdiDeviation(course);
    const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
    const line = (x, y, a, b, color = white, weight = 2) => {
      ctx.strokeStyle = color; ctx.lineWidth = weight;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(a, b); ctx.stroke();
    };
    const text = (value, x, y, size = 27, color = white, align = "left") => {
      ctx.fillStyle = color; ctx.font = `600 ${size}px Consolas, monospace`;
      ctx.textAlign = align; ctx.textBaseline = "alphabetic"; ctx.fillText(value, x, y);
    };
    const poly = (points, color) => {
      ctx.fillStyle = color; ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath(); ctx.fill();
    };
    const circle = (x, y, radius, color = white, fill = false) => {
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
      if (fill) ctx.fill(); else ctx.stroke();
    };
    const box = (x, y, w, h, label, color = cyan, size = 30) => {
      rect(x, y, w, h, "#050606"); ctx.strokeStyle = "#71767b"; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h); text(label, x + w / 2, y + h * .73, size, color, "center");
    };
    ctx.save();
    ctx.scale(width / 800, height / 600);
    if (g5Page(unit) === "PFD") {
      const horizon = 298 + settings.pitch * 7;
      rect(0, 0, 800, 600, "#355596"); rect(0, horizon, 800, 600 - horizon, "#82591d");
      line(0, horizon, 800, horizon);
      ctx.save(); ctx.beginPath(); ctx.rect(142, 54, 516, 460); ctx.clip();
      for (let pitch = -20; pitch <= 20; pitch += 5) {
        if (!pitch) continue;
        const y = horizon - pitch * 7, half = pitch % 10 ? 38 : 73;
        line(400 - half, y, 400 + half, y);
        if (pitch % 10 === 0) {
          text(Math.abs(pitch), 310, y + 7, 23, white, "right");
          text(Math.abs(pitch), 490, y + 7, 23);
        }
      }
      ctx.restore();
      ctx.strokeStyle = white; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(400, 310, 207, -Math.PI * .82, -Math.PI * .18); ctx.stroke();
      [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60].forEach(a => {
        const angle = (a - 90) * Math.PI / 180;
        line(400 + Math.cos(angle) * 190, 310 + Math.sin(angle) * 190,
          400 + Math.cos(angle) * 207, 310 + Math.sin(angle) * 207);
      });
      poly([[400, 98], [387, 122], [413, 122]], white);
      poly([[400, 303], [321, 344], [361, 340]], yellow);
      poly([[400, 303], [479, 344], [439, 340]], yellow);
      line(205, 303, 258, 303, yellow, 7); line(542, 303, 595, 303, yellow, 7);
      rect(0, 48, 141, 505, "#30487dcc"); rect(658, 48, 142, 505, "#30487dcc");
      rect(128, 48, 12, 62, yellow); rect(128, 110, 12, 385, green); rect(128, 495, 12, 58, white);
      for (let i = -2; i <= 3; i++) {
        const y = 303 + i * 80;
        text(90 - i * 10, 101, y + 10, 32, white, "right"); line(107, y, 124, y);
        text(2500 - i * 100, 680, y + 10, 30); line(658, y, 674, y);
      }
      poly([[0, 258], [111, 258], [137, 293], [111, 328], [0, 328]], "#000");
      text("90", 105, 311, 48, white, "right");
      poly([[800, 258], [681, 258], [656, 293], [681, 328], [800, 328]], "#000");
      text("2500", 792, 311, 42, white, "right");
      rect(149, 0, 500, 53, "#25334f");
      const base = Math.floor(heading / 10) * 10;
      for (let offset = -30; offset <= 30; offset += 10) {
        const x = 400 + (base + offset - heading) * 6.9;
        text(formatHeading(base + offset), x, 30, 23, white, "center"); line(x, 38, x, 51);
      }
      box(345, 0, 110, 48, formatHeading(heading) + "°", white);
      const bugX = 400 + Math.max(-34, Math.min(34, angleDelta(g5HeadingBug(unit), heading))) * 6.9;
      poly([[bugX - 9, 39], [bugX + 9, 39], [bugX, 52]], cyan);
      box(657, 0, 142, 48, settings.altitude, Math.abs(settings.altitude - 2500) > 200 ? yellow : cyan, 32);
      box(658, 553, 142, 45, "29.92", cyan, 32); box(0, 553, 140, 45, "GS 90", magenta, 25);
      text("HDG " + formatHeading(g5HeadingBug(unit)) + "°",400,589,27,cyan,"center");
      line(312, 534, 337, 534); line(463, 534, 488, 534);
      circle(400, 534, 18, white, true); line(373, 511, 373, 556, white, 4); line(427, 511, 427, 556, white, 4);
      rect(298, 476, 204, 25, "#1b2435");
      [-2, -1, 0, 1, 2].forEach(n => circle(400 + n * 40, 488, 6));
      const x = 400 + Math.max(-2, Math.min(2, cdi)) * 40;
      poly([[x, 476], [x + 8, 488], [x, 500], [x - 8, 488]], navColor);
      text("100% ▰", 8, 25, 22); text("0", 780, 435, 22);
    } else {
      rect(0, 0, 800, 600, "#000");
      const cx = 400, cy = 308, radius = 236;
      for (let degree = 0; degree < 360; degree += 5) {
        const angle = (degree - heading - 90) * Math.PI / 180;
        const length = degree % 30 === 0 ? 22 : degree % 10 === 0 ? 14 : 8;
        line(cx + Math.cos(angle) * (radius - length), cy + Math.sin(angle) * (radius - length),
          cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, white, 3);
        if (degree % 30 === 0) text(({0:"N",90:"E",180:"S",270:"W"})[degree] || degree / 10,
          cx + Math.cos(angle) * (radius - 44), cy + Math.sin(angle) * (radius - 44) + 10, 31, white, "center");
      }
      circle(cx, cy, 122, "#b5b5b5");
      // Rotate course/CDI once relative to heading, independent of the compass card.
      ctx.save(); ctx.translate(cx, cy); ctx.rotate((course - heading) * Math.PI / 180);
      [-2, -1, 1, 2].forEach(n => circle(n * 43, 0, 7));
      line(0, -219, 0, -89, navColor, 7); line(0, 89, 0, 221, navColor, 7);
      poly([[0, -232], [-21, -197], [21, -197]], navColor);
      line(-cdi * 43, -81, -cdi * 43, 81, navColor, 7);
      ctx.restore();
      settings.pointers.forEach((source, index) => {
        if (source === "None") return;
        const waypoint = WAYPOINTS[state.waypoint] || WAYPOINTS.LPPR;
        const bearing = source === "GPS" ? waypoint.bearing : tutorialVlocGeometry()?.bearingTo;
        if (bearing == null) return; // No valid tuned VOR: do not invent a bearing.
        ctx.save(); ctx.translate(cx, cy); ctx.rotate((bearing - heading) * Math.PI / 180);
        if (index === 0) line(0, 104, 0, -112, cyan, 4);
        else { line(-5,104,-5,-112,cyan,3); line(5,104,5,-112,cyan,3); }
        poly([[0, -123], [-10, -100], [10, -100]], cyan); ctx.restore();
        text((index + 1) + " " + source, index ? 782 : 12, 505, 22, cyan, index ? "right" : "left");
      });
      poly([[400,276],[405,301],[433,322],[432,330],[405,318],[405,337],[413,348],[400,342],[387,348],[395,337],[395,318],[368,330],[367,322],[395,301]],white);
      const bugAngle = (g5HeadingBug(unit) - heading) * Math.PI / 180;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(bugAngle);
      poly([[-13,-240],[13,-240],[13,-219],[0,-228],[-13,-219]],cyan); ctx.restore();
      box(345, 0, 110, 44, formatHeading(heading) + "°", white, 32);
      text("100% ▰",12,28,24);
      const waypoint = WAYPOINTS[state.waypoint] || WAYPOINTS.LPPR;
      const vlocGeometry = state.source === "VLOC" ? tutorialVlocGeometry() : null;
      const distance = state.source === "VLOC" ? vlocGeometry?.distanceNm : waypoint.distance;
      const distanceLabel = state.source === "VLOC" ? "DME NM" : "DIST NM";
      text(distanceLabel,782,25,21,white,"right");
      text(Number.isFinite(distance) ? distance.toFixed(1) : "---",782,59,34,navColor,"right");
      text(state.source === "GPS" ? "GPS" : "VOR",317,264,28,navColor,"center");
      text(state.source === "GPS" ? "ENR" : tutorialNavFlag(),485,264,27,navColor,"center");
      if (state.obsMode) text("OBS",485,373,26,navColor,"center");
      text("GS KT",12,554,22); text("90",12,588,32,magenta);
      box(651,550,147,48,formatHeading(g5HeadingBug(unit)) + "°",cyan,34);
    }
    // Value editors share the mockup's bottom-centered opaque panel.
    if (!g5MenuOpen(unit) && ["ALT", "PITCH", "CRS"].includes(g5Mode(unit))) {
      const mode = g5Mode(unit);
      const label = mode === "ALT" ? "Selected Altitude" : mode === "PITCH" ? "Pitch" : state.source === "GPS" ? "OBS Course" : "Course";
      const value = mode === "ALT" ? settings.altitude + " ft" : mode === "PITCH" ? settings.pitch.toFixed(1) + "°" : formatHeading(course) + "°";
      box(245,444,310,148,"",cyan); text(label,400,479,24,white,"center"); text(value,400,552,44,cyan,"center");
    }
    ctx.restore();
  }

  function renderG5ModeLabels() {
    ["pfd", "hsi"].forEach((unit) => {
      const config = g5UnitConfig(unit);
      const page = g5Page(unit);
      const label = page === "HSI" ? "HSI" : "PFD";
      const title = document.getElementById(config.titleId);
      const pageLabel = document.getElementById(config.labelId);
      const canvas = document.getElementById(config.canvasId);
      if (title) title.innerHTML = `G5 <small>${label}</small>`;
      if (pageLabel) pageLabel.textContent = label;
      if (canvas) canvas.setAttribute("aria-label", `Display Garmin G5 ${label} simulado`);
    });
  }

  function drawG5Canvas(unit) {
    const config = g5UnitConfig(unit);
    const page = g5Page(unit);
    const powered = g5Powered(unit);
    const canvas = document.getElementById(config.canvasId);
    if (!canvas) return;
    let context = g5Contexts.get(config.canvasId);
    if (!context) {
      context = canvas.getContext("2d");
      if (context) g5Contexts.set(config.canvasId, context);
    }
    if (!context) return;
    const width = canvas.width;
    const height = canvas.height;
    if (!powered) {
      drawG5Off(context, width, height);
    } else {
      drawG5Display(context, width, height, unit);
    }
    const readout = page === "HSI"
      ? `HSI · HDG ${formatHeading(state.heading)} · BUG ${formatHeading(g5HeadingBug(unit))} · CRS ${formatHeading(g5Course(unit))} · ${state.source} · ${tutorialNavFlag()}`
      : `PFD · HDG ${formatHeading(state.heading)} · BUG ${formatHeading(g5HeadingBug(unit))} · ${state.source}`;
    setText(config.readoutId, powered ? readout : `${page} · OFF`);
  }

  function drawG5() {
    drawG5Canvas("pfd");
    drawG5Canvas("hsi");
  }

  function gnsPageName() {
    return PAGES[state.gnsGroup][state.gnsPageIndex] || PAGES[state.gnsGroup][0];
  }

  function resetGnsUi() {
    Object.assign(state, { gnsSpecialPage: null, gnsMenu: false, gnsCursor: false,
      gnsMenuIndex: 0, gnsFieldIndex: 0, gnsDetail: null, gnsDirectConfirm: false,
      gnsDirectPosition: 0, gnsFlightPlan: ["LPPR"], gnsFlightPlanActive: false,
      gnsFlightPlanLeg: 0, gnsFields: ["DIS", "DTK", "BRG", "GS", "TRK", "ETE"],
      gnsMapFields: ["DIS", "BRG", "TRK", "GS"], gnsMapData: true,
      gnsMapOrientation: "NORTH UP", gnsDeclutter: 0, gnsWptIndex: 0 });
  }

  function gnsWaypoints() {
    return (global.AERODROMES || []).filter(point => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon)))
      .map(point => ({ id: point.icao, name: point.name, lat: Number(point.lat), lng: Number(point.lon), frequency: point.main_freq }));
  }

  function gnsFindWaypoint(id) {
    return gnsWaypoints().find(point => point.id === String(id).trim().toUpperCase())
      || Object.values(TUTORIAL_REFERENCES).find(point => point.id === String(id).trim().toUpperCase()) || null;
  }

  function syncGnsWaypoints() {
    const position = tutorialPosition || tutorialExample().start;
    [...gnsWaypoints(), ...Object.values(TUTORIAL_REFERENCES)].forEach(point => {
      WAYPOINTS[point.id] = { ...point, bearing: tutorialBearing(position, point), distance: tutorialDistanceNm(position, point) };
    });
  }

  function gnsNearest() {
    const page = gnsPageName();
    const points = page === "AIRPORTS" ? gnsWaypoints() : page === "VOR" ? Object.values(NAV_AIDS).filter(point => Number.isFinite(point.frequency)) : [];
    return points.map(point => ({ ...point, ...WAYPOINTS[point.id] })).sort((a, b) => a.distance - b.distance);
  }

  function gnsAuxItems() {
    const item = (label, action) => ({ label, action });
    return {
      "FLIGHT PLANNING": [item("Trip Planning", "TRIP"), item("Fuel Planning", "FUEL"), item("Density Alt / TAS", "DENSITY"), item("Crossfill", "CROSSFILL")],
      "UTILITY": [item("Checklists", "CHECKLISTS"), item("Flight Timers", "TIMERS"), item("RAIM Prediction", "RAIM"), item("Sunrise / Sunset", "SUNRISE")],
      "SETUP 1": [item("CDI / Alarms", "CDI"), item("Units / Position", "UNITS"), item("Date / Time", "DATE"), item("Airspace Alarms", "AIRSPACE")],
      "SETUP 2": [item("Display", "DISPLAY"), item("COM Configuration", "COM_CONFIG"), item("Nearest Airport Criteria", "CRITERIA"), ...(state.gnsModel === "430w" ? [item("SBAS Selection", "SBAS")] : [])],
    }[gnsPageName()] || [];
  }

  function gnsMenuItems() {
    if (state.gnsSpecialPage === "FPL") return [
      { label: "Add Waypoint?", action: "FPL_ADD" },
      { label: "Activate Leg?", action: "FPL_ACTIVATE", disabled: !state.gnsFlightPlan.length },
      { label: "Delete Waypoint?", action: "FPL_DELETE", disabled: !state.gnsFlightPlan.length },
      { label: "Invert Flight Plan?", action: "FPL_INVERT", disabled: state.gnsFlightPlan.length < 2 },
      { label: "Delete Flight Plan?", action: "FPL_CLEAR" },
    ];
    if (state.gnsSpecialPage === "DIRECT") return [{ label: "Cancel Direct-To?", action: "CANCEL_DIRECT" }];
    if (state.gnsGroup === "NAV" && gnsPageName() === "NAV 1") return [
      { label: "Change Fields?", action: "FIELDS" }, { label: "Restore Defaults?", action: "DEFAULTS" },
      { label: "Crossfill?", action: "CROSSFILL", disabled: true },
    ];
    if (gnsPageName() === "MAP") return [
      { label: state.gnsMapData ? "Data Fields Off?" : "Data Fields On?", action: "MAP_DATA" },
      { label: "Change Fields?", action: "MAP_FIELDS" }, { label: "Setup Map?", action: "MAP_SETUP" },
      { label: "Restore Defaults?", action: "MAP_DEFAULTS" },
    ];
    return [{ label: "Return to Default NAV?", action: "NAV_DEFAULT" }];
  }

  function gnsDefaultNav() {
    Object.assign(state, { gnsGroup: "NAV", gnsPageIndex: 0, gnsSpecialPage: null,
      gnsMenu: false, gnsCursor: false, gnsDetail: null, directToArmed: false });
  }

  function gnsOpenDirect(id = state.waypoint) {
    Object.assign(state, { gnsSpecialPage: "DIRECT", gnsMenu: false, gnsDetail: null,
      gnsCursor: true, directToArmed: true, directEntry: id, gnsDirectConfirm: false, gnsDirectPosition: 0 });
    setStatus("Direct-to: seleciona o identificador; ENT confirma e ENT ativa.");
  }

  function gnsActivate(id, fromPlan = false) {
    const point = gnsFindWaypoint(id);
    if (!point) { setStatus("Waypoint não disponível na base local."); return; }
    state.waypoint = point.id;
    state.directToActive = !fromPlan;
    state.gnsFlightPlanActive = fromPlan;
    state.source = "GPS";
    const course = tutorialBearing(tutorialPosition || tutorialExample().start, point);
    state.g5PfdCourse = course;
    state.g5HsiCourse = course;
    gnsDefaultNav();
    setStatus(`${fromPlan ? "Plano de voo" : "Direct-to"} ${point.id} ativo · GPS.`);
  }

  function gnsSelectMenu(index = state.gnsMenuIndex) {
    const item = gnsMenuItems()[index];
    if (!item || item.disabled) return;
    state.gnsMenu = false;
    state.gnsFieldIndex = 0;
    switch (item.action) {
      case "FIELDS": case "MAP_FIELDS": state.gnsDetail = item.action; state.gnsCursor = true; if (item.action === "MAP_FIELDS") state.gnsMapData = true; break;
      case "DEFAULTS": state.gnsFields = ["DIS", "DTK", "BRG", "GS", "TRK", "ETE"]; state.gnsCursor = false; break;
      case "MAP_DEFAULTS": state.gnsMapData = true; state.gnsMapOrientation = "NORTH UP"; state.gnsMapFields = ["DIS", "BRG", "TRK", "GS"]; break;
      case "MAP_DATA": state.gnsMapData = !state.gnsMapData; break;
      case "MAP_SETUP": state.gnsDetail = "MAP_SETUP"; state.gnsCursor = true; break;
      case "FPL_ADD": state.gnsDetail = "FPL ADD"; state.directEntry = state.waypoint; state.gnsCursor = true; state.gnsDirectPosition = 0; break;
      case "FPL_ACTIVATE": state.gnsFlightPlanLeg = Math.min(state.gnsFlightPlan.length - 1, state.gnsSelectedLeg || 0); gnsActivate(state.gnsFlightPlan[state.gnsFlightPlanLeg], true); break;
      case "FPL_DELETE": state.gnsFlightPlan.splice(state.gnsSelectedLeg || 0, 1); state.gnsFlightPlanActive = false; break;
      case "FPL_INVERT": state.gnsFlightPlan.reverse(); state.gnsFlightPlanActive = false; break;
      case "FPL_CLEAR": state.gnsFlightPlan = []; state.gnsFlightPlanActive = false; break;
      case "CANCEL_DIRECT": state.directToActive = false; gnsDefaultNav(); break;
      default: gnsDefaultNav();
    }
    render();
  }

  // Local, public-domain geography. Navigation values remain educational.
  function renderGnsPortugalMap() {
    const position = tutorialPosition || tutorialExample().start;
    const destination = gnsFindWaypoint(state.waypoint);
    const scale = 110 / state.mapRange;
    const rotation = state.gnsMapOrientation === "TRACK UP" ? tutorialToRadians(state.heading) : 0;
    const project = (lng, lat) => {
      const east = (lng - position.lng) * Math.cos(tutorialToRadians(position.lat)) * 60 * scale;
      const north = (lat - position.lat) * 60 * scale;
      return [240 + east * Math.cos(rotation) - north * Math.sin(rotation), 132 - north * Math.cos(rotation) - east * Math.sin(rotation)];
    };
    const outlines = (global.MyFlyGnsDisplay?.geography()?.features || []).map(feature => {
      const path = feature.rings.map(ring => ring.map(([lng, lat], index) => {
        const [x, y] = project(lng, lat);
        return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join("") + "Z").join("");
      return `<path class="gns-geography${feature.id === "PRT" ? " gns-geography-portugal" : ""}" d="${path}"/>`;
    }).join("");
    const points = [...gnsWaypoints(), ...Object.values(NAV_AIDS)];
    const symbols = points.map(point => {
      const [x, y] = project(point.lng, point.lat);
      if (x < 8 || x > 472 || y < 10 || y > 210) return "";
      const id = point.id.replace(/[^A-Z0-9]/g, "");
      if (state.gnsDeclutter >= 2 && !point.type && id !== state.waypoint) return "";
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle class="gns-map-place" r="${point.type ? 4 : 3}"/>${state.gnsDeclutter ? "" : `<text class="gns-map-place-label" x="7" y="-5">${id}</text>`}</g>`;
    }).join("");
    const route = destination ? (() => {
      const [x, y] = project(destination.lng, destination.lat);
      return `<path class="gns-map-route" d="M240 132L${x.toFixed(1)} ${y.toFixed(1)}"/>`;
    })() : "";
    return `<g class="gns-portugal-map"><rect width="480" height="220" fill="#030708"/>${outlines}${route}${symbols}${outlines ? "" : '<text x="130" y="30" fill="#fff" font-size="12">GEOGRAPHIC MAP UNAVAILABLE</text>'}
      <g class="gns-map-aircraft-svg" transform="translate(240 132) rotate(${state.gnsMapOrientation === "TRACK UP" ? 0 : normalize(state.heading)})"><path d="M0-12L4 7 0 4-4 7Z M-3-1L-13 6-3 4 M3-1L13 6 3 4"/></g>
      <text class="gns-map-range-label" x="12" y="205">${state.mapRange} NM${state.gnsDeclutter ? " -" + state.gnsDeclutter : ""}</text>
      <text class="gns-geography-label" x="340" y="18">${state.gnsMapOrientation}</text></g>`;
  }

  function renderGns() {
    const screen = document.getElementById("av-gns-screen");
    if (!screen) return;
    setText("av-gns-model-label", state.gnsModel === "430w" ? "GNS 430W" : "GNS 430");
    const modelSelect = document.getElementById("av-gns-model");
    if (modelSelect) modelSelect.value = state.gnsModel;
    const english = global.MyFlyI18n?.language === "en";
    setText("av-gns-model-caption", english ? "Model" : "Modelo");
    setText("av-gns-control-hint", english ? "Outer knob: group/field · inner: page/value · press: CRSR" : "Knob exterior: grupo/campo · interior: página/valor · pressionar: CRSR");
    setText("av-gns-live-note", english ? "Display and controls based on Garmin manuals · live simulated flight values. Map: Natural Earth." : "Display e comandos baseados no manual Garmin · valores ligados ao voo simulado. Mapa: Natural Earth.");
    const side = screen.closest(".gns-unit")?.querySelector(".gns-side-labels");
    if (side) side.innerHTML = `NAV<br><strong>PAGE</strong><span>GROUP</span>`;
    if (!state.gnsPower) {
      screen.innerHTML = `<div class="gns-off-screen">${state.gnsModel === "430w" ? "GNS 430W" : "GNS 430"}<br><span>OFF</span></div>`;
      return;
    }
    const position = tutorialPosition || tutorialExample().start;
    const target = WAYPOINTS[state.waypoint] || WAYPOINTS.LPPR;
    const airports = gnsWaypoints();
    const airport = state.gnsGroup === "WPT" ? airports[state.gnsWptIndex % airports.length] : gnsFindWaypoint(state.waypoint);
    const station = findVlocStation();
    const vlocGeometry = state.source === "VLOC" ? tutorialVlocGeometry() : null;
    const navDistance = state.source === "VLOC" ? vlocGeometry?.distanceNm : target.distance;
    const navBearing = state.source === "VLOC" ? vlocGeometry?.bearingTo : target.bearing;
    const distance = Number.isFinite(navDistance)
      ? navDistance * (state.gnsDistanceUnit === "KM" ? 1.852 : 1)
      : null;
    const eteSeconds = Math.round(target.distance / tutorialFlight.speedKts * 3600);
    const values = { DIS: Number.isFinite(distance) ? distance.toFixed(1) : "---", DTK: formatHeading(g5ReferenceCourse()) + "°", BRG: Number.isFinite(navBearing) ? formatHeading(navBearing) + "°" : "---",
      GS: String(tutorialFlight.speedKts), TRK: formatHeading(state.heading) + "°", ETE: `${Math.floor(eteSeconds / 60)}:${String(eteSeconds % 60).padStart(2, "0")}`,
      ALT: String(g5Settings.pfd.altitude), XTK: (Math.sin(tutorialToRadians(angleDelta(g5ReferenceCourse(), target.bearing))) * target.distance).toFixed(1) };
    const html = global.MyFlyGnsDisplay.render({ state, page: gnsPageName(), pages: PAGES[state.gnsGroup], heading: formatHeading,
      deviation: state.source === "GPS" ? clamp(Number(values.XTK) / state.gnsCdiScale, -1, 1) : clamp(cdiDeviation() / 2.5, -1, 1), values, position, airport: airport || { id: "----", name: "NOT AVAILABLE", lat: 0, lng: 0 },
      stationId: station?.id, stationName: station?.name || "NAV OFF", flag: tutorialNavFlag(), nearest: gnsNearest(),
      waypoints: WAYPOINTS, directAirport: gnsFindWaypoint(state.directEntry), elapsed: tutorialFlightTime(),
      auxItems: gnsAuxItems(), menu: gnsMenuItems(), mapSvg: gnsPageName() === "MAP" && !state.gnsSpecialPage ? renderGnsPortugalMap() : "" });
    // GO renders every 100 ms. Keep a native text editor focused until commit/cancel.
    if (screen.contains(document.activeElement) && document.activeElement.matches("input")) {
      const template = document.createElement("template");
      template.innerHTML = html;
      screen.querySelector(".gns-live-svg")?.replaceWith(template.content.querySelector(".gns-live-svg"));
    } else screen.innerHTML = html;
    screen.style.setProperty("--gns-backlight", state.gnsBrightness / 100);
    screen.style.setProperty("--gns-contrast", state.gnsContrast / 80);
    setText("av-gns-readout", `${state.gnsSpecialPage || state.gnsGroup} · ${state.source} · ${state.waypoint} · ${state.tuningTarget} STBY`);
  }

  function renderPowerByPrefix(prefix, on) {
    const led = document.getElementById(`${prefix}-status-led`);
    const status = document.getElementById(`${prefix}-status`);
    if (led) led.classList.toggle("is-on", on);
    if (led) led.classList.toggle("is-off", !on);
    if (status) status.textContent = on ? "ON" : "OFF";
  }

  function renderPower(unit, on) {
    renderPowerByPrefix(`av-${unit}`, on);
  }

  function renderScenario() {
    const instructionKey = {
      basic: "av_scenario_basic_instruction",
      vor: "av_scenario_vor_instruction",
      direct: "av_scenario_direct_instruction",
    }[state.scenario];
    setText("av-scenario-instruction", t(instructionKey));
  }

  function render() {
    if (!ready) return;
    syncGnsWaypoints();
    syncFlightControls();
    renderPower("g5-pfd", state.g5PfdPower);
    renderPower("g5-hsi", state.g5HsiPower);
    renderPower("gns", state.gnsPower);
    renderG5ModeLabels();
    renderG5HsiControls();
    document.getElementById("av-gns-tune-toggle")?.classList.toggle("is-vloc", state.tuningTarget === "VLOC");
    drawG5();
    renderGns();
    renderScenario();
    renderTutorial();
    renderSetup2();
    renderNavAidCatalogs();
    renderChallengeChecklist();
  }

  function togglePower(unit) {
    if (unit === "g5-pfd") state.g5PfdPower = !state.g5PfdPower;
    else if (unit === "g5-hsi") state.g5HsiPower = !state.g5HsiPower;
    else state.gnsPower = !state.gnsPower;
    const status = unit === "g5-pfd" ? state.g5PfdPower : unit === "g5-hsi" ? state.g5HsiPower : state.gnsPower;
    const label = unit === "g5-pfd" ? "G5 PFD" : unit === "g5-hsi" ? "G5 HSI" : "GNS 430";
    setStatus(`${label} ${status ? "ON" : "OFF"}.`);
    render();
  }

  function toggleSetup2Power(unit) {
    state.setup2[unit === "gi" ? "giPower" : "gncPower"] = !state.setup2[unit === "gi" ? "giPower" : "gncPower"];
    setup2SetStatus(`${unit === "gi" ? "GI-106A" : "GNC 255"} ${state.setup2[unit === "gi" ? "giPower" : "gncPower"] ? "ON" : "OFF"}.`);
    renderSetup2();
  }

  function setup2AdjustFrequency(target, direction) {
    if (!state.setup2.gncPower) return;
    if (target === "NAV") state.setup2SelectedReferenceId = null;
    const key = target === "NAV" ? "navStandby" : "comStandby";
    const step = target === "NAV" ? 0.05 : 0.025;
    const min = target === "NAV" ? 108.00 : 118.000;
    const max = target === "NAV" ? 117.95 : 136.975;
    state.setup2[key] = clamp(Number((state.setup2[key] + direction * step).toFixed(3)), min, max);
    state.setup2.tuningTarget = target;
    setup2SetStatus(`${target} standby ${target === "NAV" ? formatVloc(state.setup2[key]) : formatCom(state.setup2[key])}.`);
    renderSetup2();
  }

  function setup2Flip(target) {
    if (!state.setup2.gncPower) return;
    if (target === "NAV") state.setup2SelectedReferenceId = null;
    const activeKey = target === "NAV" ? "navActive" : "comActive";
    const standbyKey = target === "NAV" ? "navStandby" : "comStandby";
    [state.setup2[activeKey], state.setup2[standbyKey]] = [state.setup2[standbyKey], state.setup2[activeKey]];
    state.setup2.tuningTarget = target;
    setup2SetStatus(`${target} standby transferida para ativa.`);
    renderSetup2();
  }

  function resetSetup2() {
    state.challengeConfirmed[`setup2-${state.setup2TutorialId}`] = false;
    loadSetup2TutorialExample(state.setup2TutorialId);
  }

  function switchAvionicsSetup(setupId) {
    if (setupId !== "av-setup-2") stopSetup2Flight(false);
    state.activeSetup = setupId;
    document.querySelectorAll(".avionics-subtab").forEach((tab) => {
      const active = tab.getAttribute("aria-controls") === setupId;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll(".av-setup-panel").forEach((panel) => {
      const active = panel.id === setupId;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
    if (setupId === "av-setup-2") {
      initSetup2TutorialMap();
      renderSetup2();
      refreshSetup2TutorialMap(true);
    } else {
      setStatus(t("av_status_ready"));
      render();
      refreshTutorialMap(true);
    }
  }

  function adjustGnsFrequency(kind, direction) {
    if (state.tuningTarget === "VLOC") state.tutorialReferenceId = null;
    const step = kind === "left-large" ? 1 : state.tuningTarget === "VLOC" ? 0.05 : state.gnsComSpacing === "8.33" ? 0.005 : 0.025;
    let value = currentFrequency() + direction * step;
    if (state.tuningTarget === "COM" && state.gnsComSpacing === "8.33" && Math.round(value * 1000) % 25 === 20) value += direction * 0.005;
    if (state.tuningTarget === "COM") state.comStandby = normalizeGnsFrequencyInput("COM", value);
    else setCurrentFrequency(normalizeGnsFrequencyInput("VLOC", value));
    setStatus(`${state.tuningTarget} standby ${state.tuningTarget === "VLOC" ? formatVloc(currentFrequency()) : formatCom(currentFrequency())}.`);
  }

  function rotateGns(kind, direction) {
    if (!state.gnsPower) return;
    const wrap = (value, length) => (value + direction + length) % length;
    if (kind.startsWith("left-")) adjustGnsFrequency(kind, direction);
    else if (state.gnsMenu) state.gnsMenuIndex = wrap(state.gnsMenuIndex, gnsMenuItems().length);
    else if (state.gnsSpecialPage === "DIRECT" || state.gnsDetail === "FPL ADD") {
      state.gnsDirectConfirm = false;
      if (kind === "right-large") state.gnsDirectPosition = wrap(state.gnsDirectPosition, 4);
      else {
        const alphabet = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const chars = state.directEntry.padEnd(4, " ").split("");
        chars[state.gnsDirectPosition] = alphabet[wrap(Math.max(0, alphabet.indexOf(chars[state.gnsDirectPosition])), alphabet.length)];
        state.directEntry = chars.join("").trimEnd();
      }
    } else if (state.gnsCursor) {
      const page = gnsPageName();
      const count = state.gnsSpecialPage === "FPL" ? Math.max(1, state.gnsFlightPlan.length) : state.gnsSpecialPage === "PROC" ? 3
        : state.gnsGroup === "NRST" ? Math.max(1, gnsNearest().length) : state.gnsDetail === "DISPLAY" ? 2
        : state.gnsDetail === "MAP_FIELDS" ? 4 : page === "NAV 1" ? 6 : page === "VNAV" ? 2
        : state.gnsGroup === "AUX" && !state.gnsDetail ? Math.max(1, gnsAuxItems().length) : 1;
      if (kind === "right-large") state.gnsFieldIndex = wrap(state.gnsFieldIndex, count);
      else if (state.gnsDetail === "FIELDS" || state.gnsDetail === "MAP_FIELDS") {
        const fields = state.gnsDetail === "FIELDS" ? state.gnsFields : state.gnsMapFields;
        const choices = ["DIS", "DTK", "BRG", "GS", "TRK", "ETE", "ALT", "XTK"];
        fields[state.gnsFieldIndex] = choices[wrap(choices.indexOf(fields[state.gnsFieldIndex]), choices.length)];
      } else if (state.gnsDetail === "DISPLAY") {
        const key = state.gnsFieldIndex === 0 ? "gnsContrast" : "gnsBrightness";
        state[key] = clamp(state[key] + direction * 5, 30, 100);
      } else if (state.gnsDetail === "UNITS") state.gnsDistanceUnit = state.gnsDistanceUnit === "NM" ? "KM" : "NM";
      else if (state.gnsDetail === "COM_CONFIG") {
        state.gnsComSpacing = state.gnsComSpacing === "25" ? "8.33" : "25";
        state.comActive = normalizeGnsFrequencyInput("COM", state.comActive);
        state.comStandby = normalizeGnsFrequencyInput("COM", state.comStandby);
      }
      else if (state.gnsDetail === "CDI") {
        const scales = [0.3, 1, 2, 5];
        state.gnsCdiScale = scales[wrap(scales.indexOf(state.gnsCdiScale), scales.length)];
      } else if (state.gnsDetail === "SBAS" && state.gnsModel === "430w") state.gnsSbas = !state.gnsSbas;
      else if (state.gnsDetail === "MAP_SETUP") state.gnsMapOrientation = state.gnsMapOrientation === "NORTH UP" ? "TRACK UP" : "NORTH UP";
      else if (page === "VNAV") {
        const key = state.gnsFieldIndex === 0 ? "gnsVnavAltitude" : "gnsVnavRate";
        state[key] = clamp(state[key] + direction * 100, 0, key === "gnsVnavAltitude" ? 30000 : 3000);
      } else if (state.gnsGroup === "WPT") state.gnsWptIndex = wrap(state.gnsWptIndex, gnsWaypoints().length);
      else if (state.gnsGroup === "AUX" || state.gnsGroup === "NRST" || state.gnsSpecialPage) state.gnsFieldIndex = wrap(state.gnsFieldIndex, count);
    } else {
      state.gnsSpecialPage = null;
      state.gnsDetail = null;
      if (kind === "right-large") {
        state.gnsGroup = PAGE_GROUPS[wrap(PAGE_GROUPS.indexOf(state.gnsGroup), PAGE_GROUPS.length)];
        state.gnsPageIndex = 0;
      } else state.gnsPageIndex = wrap(state.gnsPageIndex, PAGES[state.gnsGroup].length);
    }
    render();
  }

  function flipFrequency(target) {
    if (!state.gnsPower) return;
    if (target === "VLOC") state.tutorialReferenceId = null;
    if (target === "COM") [state.comActive, state.comStandby] = [state.comStandby, state.comActive];
    else [state.vlocActive, state.vlocStandby] = [state.vlocStandby, state.vlocActive];
    setStatus(`${target} ${target === "COM" ? formatCom(activeFrequency(target)) : formatVloc(activeFrequency(target))} active.`);
    render();
  }

  function pressGnsKey(key) {
    if (!state.gnsPower) return;
    const editor = document.getElementById("av-gns-ident-input");
    if (editor && key === "ENT") state.directEntry = editor.value.trim().toUpperCase();
    if (key === "CLR_HOLD") gnsDefaultNav();
    else if (["MSG", "FPL", "PROC"].includes(key)) {
      const previous = state.gnsSpecialPage;
      state.gnsSpecialPage = previous === key ? null : key;
      state.gnsMenu = false;
      state.gnsDetail = null;
      state.gnsCursor = key !== "MSG" && previous !== key;
      state.gnsFieldIndex = 0;
      state.directToArmed = false;
    } else if (key === "CDI") {
      state.source = state.source === "GPS" ? "VLOC" : "GPS";
      if (state.source === "VLOC") state.tutorialReferenceId = null;
      setStatus(`CDI ${state.source}.`);
    } else if (key === "OBS") {
      state.obsMode = !state.obsMode;
      setStatus(state.obsMode ? "OBS ativo: sequencia automatica suspensa." : "OBS desligado.");
    } else if (key === "COM_FLIP") flipFrequency("COM");
    else if (key === "VLOC_FLIP") flipFrequency("VLOC");
    else if (key === "MENU") {
      state.gnsSelectedLeg = state.gnsFieldIndex;
      state.gnsMenu = !state.gnsMenu;
      state.gnsMenuIndex = 0;
    } else if (key === "CRSR") {
      state.gnsCursor = !state.gnsCursor;
      state.gnsFieldIndex = 0;
      if (!state.gnsCursor && state.gnsSpecialPage !== "DIRECT") state.gnsDetail = null;
    } else if (key === "RNG_UP") state.mapRange = clamp(state.mapRange * 2, 5, 160);
    else if (key === "RNG_DOWN") state.mapRange = clamp(state.mapRange / 2, 5, 160);
    else if (key === "DIRECT") {
      const selected = state.gnsGroup === "NRST" ? gnsNearest()[state.gnsFieldIndex]?.id
        : state.gnsSpecialPage === "FPL" ? state.gnsFlightPlan[state.gnsFieldIndex]
        : state.gnsGroup === "WPT" ? gnsWaypoints()[state.gnsWptIndex]?.id : state.waypoint;
      gnsOpenDirect(selected || state.waypoint);
    } else if (key === "CLR") {
      if (state.gnsMenu) state.gnsMenu = false;
      else if (state.gnsDirectConfirm) state.gnsDirectConfirm = false;
      else if (state.gnsDetail) state.gnsDetail = null;
      else if (state.gnsCursor) state.gnsCursor = false;
      else if (state.gnsSpecialPage) { state.gnsSpecialPage = null; state.directToArmed = false; }
      else if (gnsPageName() === "MAP") state.gnsDeclutter = (state.gnsDeclutter + 1) % 4;
    } else if (key === "ENT") {
      if (state.gnsMenu) { gnsSelectMenu(); return; }
      if (state.gnsSpecialPage === "DIRECT") {
        if (!gnsFindWaypoint(state.directEntry)) setStatus(t("av_waypoint_unavailable"));
        else if (state.gnsDirectConfirm) gnsActivate(state.directEntry);
        else { state.gnsDirectConfirm = true; state.gnsCursor = false; }
      } else if (state.gnsDetail === "FPL ADD") {
        const point = gnsFindWaypoint(state.directEntry);
        if (point) { state.gnsFlightPlan.push(point.id); state.gnsDetail = null; state.gnsFieldIndex = state.gnsFlightPlan.length - 1; }
        else setStatus("Waypoint nao disponivel.");
      } else if (state.gnsDetail) { state.gnsDetail = null; state.gnsCursor = false; }
      else if (state.gnsSpecialPage === "PROC") {
        state.message = "PROCEDURE DATABASE NOT AVAILABLE";
        state.gnsSpecialPage = "MSG";
        state.gnsCursor = false;
      } else if (state.gnsSpecialPage === "FPL") gnsOpenDirect(state.gnsFlightPlan[state.gnsFieldIndex] || state.waypoint);
      else if (state.gnsGroup === "AUX") {
        state.gnsDetail = gnsAuxItems()[state.gnsFieldIndex]?.action || null;
        state.gnsFieldIndex = 0;
        state.gnsCursor = true;
      } else if (state.gnsGroup === "NRST") {
        const point = gnsNearest()[state.gnsFieldIndex];
        if (point) gnsOpenDirect(point.id);
      } else if (state.gnsGroup === "WPT" && gnsPageName() === "APT FREQ") {
        const point = gnsWaypoints()[state.gnsWptIndex];
        if (point?.frequency) {
          const value = Number(point.frequency);
          const normalized = normalizeGnsFrequencyInput("COM", value);
          if (Math.abs(value - normalized) > 0.001) setStatus("Frequência 8.33: seleciona AUX > Setup 2 > COM Configuration.");
          else { state.comStandby = normalized; setStatus(`COM standby ${formatCom(normalized)}.`); }
        }
      } else state.gnsCursor = false;
    }
    render();
  }

  function syncHeading(unit) {
    if (!unit || !g5Powered(unit)) return;
    state[g5UnitConfig(unit).headingBugKey] = state.heading;
    state.g5LastUnit = unit;
    setStatus(`G5 ${unit.toUpperCase()} heading bug synchronized to current heading.`);
    render();
  }

  function g5HsiCourseAvailable() {
    return state.source === "VLOC" || state.obsMode;
  }

  function g5MenuOptions(unit) {
    const settings = g5Settings[unit];
    if (settings.menuLevel === "setup") return ["BACK", "BP1", "BP2"];
    if (settings.menuLevel === "source") return ["BACK", "NONE", "GPS", "VLOC"];
    // Garmin 190-01112-12 Rev. A §1.5: page changes are knob menu choices.
    if (g5Page(unit) === "PFD") return ["BACK", "HDG", "ALT", "HSI", "PITCH", "SETUP"];
    return g5HsiCourseAvailable()
      ? ["BACK", "HDG", "CRS", "BEARING", "ALT", "PFD", "SETUP"]
      : ["BACK", "HDG", "ALT", "PFD", "SETUP"];
  }

  function g5MenuLabel(unit, choice) {
    if (choice === "SETUP") return "Setup";
    if (choice === "BP1" || choice === "BP2") return `Bearing Pointer ${choice === "BP1" ? 1 : 2}: ${g5Settings[unit].pointers[choice === "BP1" ? 0 : 1]}`;
    if (["NONE", "GPS", "VLOC"].includes(choice)) return choice === "NONE" ? "None" : choice;
    if (choice === "BACK") return t("av_g5_menu_back");
    if (choice === "BEARING") return t("av_g5_menu_bearing");
    if (choice === "PFD" || choice === "HSI") return choice;
    if (g5Page(unit) === "PFD" || choice === "ALT") {
      if (choice === "ALT") return `Altitude ${g5Settings[unit].altitude} ft`;
      if (choice === "PITCH") return `Pitch ${g5Settings[unit].pitch.toFixed(1)}°`;
    }
    if (choice === "CRS") return `${state.source === "VLOC" ? t("av_g5_menu_course") : "OBS"} ${formatHeading(g5Course(unit))}°`;
    return `${t("av_g5_menu_heading")} ${formatHeading(g5HeadingBug(unit))}°`;
  }

  function g5MenuHint(unit) {
    return t(g5Page(unit) === "HSI"
      ? (g5HsiCourseAvailable() ? "av_g5_menu_hint" : "av_g5_course_unavailable")
      : "av_g5_pfd_menu_hint");
  }

  function renderG5HsiControls() {
    ["pfd", "hsi"].forEach((unit) => {
      const config = g5UnitConfig(unit);
      const powered = g5Powered(unit);
      const isMenuOpen = powered && g5MenuOpen(unit);
      const options = document.getElementById(config.optionsId);
      if (options) {
        options.hidden = !isMenuOpen;
        options.classList.toggle("g5-setup-options", g5Settings[unit].menuLevel !== "main");
        options.querySelector("strong").textContent = g5Settings[unit].menuLevel === "source"
          ? `Bearing Pointer ${g5Settings[unit].pointerIndex + 1}` : "Setup";
      }
      const knob = document.getElementById(config.knobId);
      if (knob) {
        knob.textContent = isMenuOpen ? "MENU" : g5Mode(unit);
        knob.title = t(isMenuOpen
          ? "av_g5_menu_hint"
          : g5Page(unit) === "HSI" && g5Mode(unit) === "CRS" ? "av_g5_course_help" : "av_g5_heading_help");
        if (!isMenuOpen && ["ALT", "PITCH"].includes(g5Mode(unit))) {
          knob.title = `${g5Mode(unit)} · ←/→ · Enter`;
        }
        knob.setAttribute("aria-label", `G5 ${g5Page(unit)} · ${knob.textContent}`);
        knob.setAttribute("aria-expanded", String(isMenuOpen));
        knob.disabled = !powered;
      }
    });
    document.querySelectorAll("[data-g5-menu-choice]").forEach((button) => {
      const unit = button.closest("[data-g5-menu-unit]")?.dataset.g5MenuUnit;
      if (!unit) return;
      const choice = button.dataset.g5MenuChoice;
      const choices = g5MenuOptions(unit);
      const selectionIndex = Math.max(0, choices.indexOf(g5MenuSelection(unit)));
      const start = Math.max(0, selectionIndex - 3);
      button.hidden = !choices.slice(start, start + 4).includes(choice);
      button.disabled = unit !== "pfd" && choice === "CRS" && !g5HsiCourseAvailable();
      button.classList.toggle("is-selected", choice === g5MenuSelection(unit));
      const label = g5MenuLabel(unit, choice);
      const parts = label.match(/^(Heading|Course|OBS|Altitude|Pitch) (.+)$/);
      button.replaceChildren();
      const name = document.createElement("span");
      name.textContent = parts ? parts[1] : label;
      button.append(name);
      if (parts) {
        const value = document.createElement("span");
        value.className = "g5-menu-value";
        value.textContent = parts[2];
        button.append(value);
      }
      button.style.order = g5MenuOptions(unit).indexOf(choice);
    });
    document.querySelectorAll(".g5-hsi-menu-hint").forEach((element) => {
      const unit = element.closest("[data-g5-menu-unit]")?.dataset.g5MenuUnit || "hsi";
      element.textContent = g5MenuHint(unit);
    });
  }

  function toggleG5Menu(unit) {
    if (!unit || !g5Powered(unit)) return;
    const config = g5UnitConfig(unit);
    const opening = !g5MenuOpen(unit);
    if (opening) g5Settings[unit].menuLevel = "main";
    state[config.menuKey] = opening;
    state.g5LastUnit = unit;
    if (opening) state[config.menuSelectionKey] = g5Page(unit) === "HSI" ? g5Mode(unit) : "HDG";
    render();
  }

  function selectG5MenuChoice(unit, choice) {
    if (!unit || !g5Powered(unit) || !g5MenuOpen(unit) || !g5MenuOptions(unit).includes(choice)) return;
    if (choice === "CRS" && !g5HsiCourseAvailable()) return;
    const config = g5UnitConfig(unit);
    const settings = g5Settings[unit];
    const showSubmenu = () => { render(); document.getElementById(config.knobId)?.focus({ preventScroll: true }); };
    if (choice === "SETUP" || choice === "BEARING") {
      settings.menuLevel = "setup";
      state[config.menuSelectionKey] = "BP1";
      showSubmenu(); return;
    }
    if (choice === "BP1" || choice === "BP2") {
      settings.pointerIndex = choice === "BP1" ? 0 : 1;
      settings.menuLevel = "source";
      state[config.menuSelectionKey] = settings.pointers[settings.pointerIndex].toUpperCase();
      showSubmenu(); return;
    }
    if (settings.menuLevel === "source") {
      if (choice !== "BACK") settings.pointers[settings.pointerIndex] = choice === "NONE" ? "None" : choice;
      settings.menuLevel = "setup";
      state[config.menuSelectionKey] = settings.pointerIndex ? "BP2" : "BP1";
      showSubmenu(); return;
    }
    if (settings.menuLevel === "setup" && choice === "BACK") {
      settings.menuLevel = "main";
      state[config.menuSelectionKey] = "SETUP";
      showSubmenu(); return;
    }
    state[config.menuSelectionKey] = choice;
    state[config.menuKey] = false;
    state.g5LastUnit = unit;
    if (choice === "BACK") {
      setStatus(`G5 ${unit.toUpperCase()} ${g5Page(unit)} menu fechado.`);
    } else if (choice === "PFD" || choice === "HSI") {
      toggleG5Page(unit);
    } else if (choice === "ALT") {
      state[config.modeKey] = "ALT";
    } else if (g5Page(unit) === "HSI") {
      state[config.modeKey] = choice === "CRS" ? "CRS" : "HDG";
      setStatus(t(state[config.modeKey] === "CRS" ? "av_g5_course_help" : "av_g5_heading_help"));
    } else {
      state[config.modeKey] = choice;
      setStatus(`G5 ${unit.toUpperCase()} ${g5MenuLabel(unit, choice)}.`);
    }
    render();
    document.getElementById(config.knobId)?.focus({ preventScroll: true });
  }

  function rotateG5Hsi(direction, unit = activeG5HsiUnit()) {
    if (!unit || !g5Powered(unit)) return;
    const config = g5UnitConfig(unit);
    state.g5LastUnit = unit;
    if (g5MenuOpen(unit)) {
      const options = g5MenuOptions(unit);
      const index = options.indexOf(g5MenuSelection(unit));
      state[config.menuSelectionKey] = options[(index + direction + options.length) % options.length];
    } else if (g5Mode(unit) === "ALT") {
      g5Settings[unit].altitude = Math.max(0, Math.min(20000, g5Settings[unit].altitude + direction * 100));
    } else if (g5Mode(unit) === "PITCH") {
      g5Settings[unit].pitch = Math.max(-10, Math.min(10, g5Settings[unit].pitch + direction * 0.5));
    } else if (g5Page(unit) === "HSI" && g5Mode(unit) === "CRS") {
      state[config.courseKey] = normalize(g5Course(unit) + direction * 5);
      setStatus(`G5 ${unit.toUpperCase()} CRS ${formatHeading(g5Course(unit))}°.`);
    } else {
      state[config.headingBugKey] = normalize(g5HeadingBug(unit) + direction * 5);
      setStatus(`G5 ${unit.toUpperCase()} HDG BUG ${formatHeading(g5HeadingBug(unit))}°.`);
    }
    render();
  }

  function pressG5HsiKnob(unit = activeG5HsiUnit()) {
    if (!unit || !g5Powered(unit)) return;
    state.g5LastUnit = unit;
    const config = g5UnitConfig(unit);
    if (g5MenuOpen(unit)) selectG5MenuChoice(unit, g5MenuSelection(unit));
    else if (["ALT", "PITCH", "CRS"].includes(g5Mode(unit))) {
      state[config.modeKey] = "HDG";
      render();
    }
    else toggleG5Menu(unit);
  }

  function toggleG5Page(unit) {
    if (!g5Powered(unit)) return;
    const config = g5UnitConfig(unit);
    state[config.pageKey] = g5Page(unit) === "HSI" ? "PFD" : "HSI";
    state[config.modeKey] = "HDG";
    state[config.menuKey] = false;
    g5Settings[unit].menuLevel = "main";
    state.g5LastUnit = unit;
    const label = g5Page(unit) === "HSI" ? "HSI" : "PFD";
    setStatus(`G5 ${unit.toUpperCase()} agora em ${label}.`);
    render();
  }

  function bindHorizontalRotary(control, onStep, onClick, onHold) {
    if (!control) return;
    control.classList.add("av-rotary-touch-target");
    if (onStep && control.id) addTouchRotaryControls(control, onStep);
    const drag = { active: false, moved: false, held: false, pointerId: null, remainder: 0, lastX: 0 };
    let suppressClick = false;
    let holdTimer = null;
    const cancelHold = () => {
      if (holdTimer !== null) window.clearTimeout(holdTimer);
      holdTimer = null;
    };
    const threshold = 14;

    control.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      if (drag.active || event.isPrimary === false) return;
      drag.active = true;
      drag.moved = false;
      drag.held = false;
      suppressClick = false;
      drag.pointerId = event.pointerId;
      drag.remainder = 0;
      drag.lastX = event.clientX;
      control.setPointerCapture?.(event.pointerId);
      if (onHold) holdTimer = window.setTimeout(() => {
        holdTimer = null;
        if (!drag.active || drag.moved) return;
        drag.held = true;
        onHold();
      }, 650);
    });
    control.addEventListener("pointermove", (event) => {
      if (!drag.active || event.pointerId !== drag.pointerId) return;
      drag.remainder += event.clientX - drag.lastX;
      drag.lastX = event.clientX;
      if (Math.abs(drag.remainder) > 5) drag.moved = true;
      if (drag.moved) cancelHold();
      while (drag.remainder >= threshold) {
        onStep?.(1);
        drag.remainder -= threshold;
      }
      while (drag.remainder <= -threshold) {
        onStep?.(-1);
        drag.remainder += threshold;
      }
      event.preventDefault();
    });
    const finishDrag = (event) => {
      if (!drag.active || event.pointerId !== drag.pointerId) return;
      cancelHold();
      suppressClick = drag.moved || drag.held || event.type === "pointercancel";
      drag.active = false;
      control.releasePointerCapture?.(event.pointerId);
    };
    control.addEventListener("pointerup", finishDrag);
    control.addEventListener("pointercancel", finishDrag);
    control.addEventListener("lostpointercapture", finishDrag);
    control.addEventListener("blur", () => {
      cancelHold();
      drag.active = false;
    });
    control.addEventListener("click", (event) => {
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      onClick?.(event);
    });
  }

  function bindTouchStep(button, onStep) {
    let delay = null;
    let repeat = null;
    let pointerId = null;
    let suppressClick = false;
    const stop = (cancelled = false) => {
      if (delay !== null) window.clearTimeout(delay);
      if (repeat !== null) window.clearInterval(repeat);
      delay = repeat = null;
      if (cancelled) suppressClick = true;
      const capturedId = pointerId;
      pointerId = null;
      if (capturedId !== null && button.hasPointerCapture?.(capturedId)) button.releasePointerCapture(capturedId);
    };
    const step = () => {
      if (button.closest(".av-setup-panel")?.hidden
        || !document.getElementById("avionics-trainer")?.classList.contains("av-mobile-mode")
        || !document.getElementById("avionics")?.classList.contains("active")) {
        stop(true);
        return;
      }
      onStep();
    };
    button.addEventListener("pointerdown", event => {
      if (event.button !== 0 || event.isPrimary === false || pointerId !== null) return;
      suppressClick = false;
      pointerId = event.pointerId;
      button.setPointerCapture?.(pointerId);
      delay = window.setTimeout(() => {
        delay = null;
        suppressClick = true;
        step();
        if (pointerId !== null) repeat = window.setInterval(step, 90);
      }, 400);
    });
    button.addEventListener("pointerup", () => stop());
    button.addEventListener("pointercancel", () => stop(true));
    button.addEventListener("lostpointercapture", () => { if (pointerId !== null) stop(true); });
    button.addEventListener("blur", () => { if (pointerId !== null) stop(true); });
    global.addEventListener("blur", () => { if (pointerId !== null) stop(true); });
    button.addEventListener("click", () => {
      if (suppressClick) { suppressClick = false; return; }
      step();
    });
    button.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") suppressClick = false;
    });
  }

  function addTouchRotaryControls(control, onStep) {
    if (control.closest(".av-touch-rotary")) return;
    const labels = {
      "av-g5-pfd-knob": "G5 PFD", "av-g5-hsi-knob": "G5 HSI",
      "av-gns-tune-outer": "MHz", "av-gns-tune-toggle": "kHz · C/V",
      "av-gns-nav-outer": "av_touch_group", "av-gns-crsr-knob": "av_touch_page",
      "setup2-gi-course-knob": "OBS", "setup2-gnc-nav-knob": "NAV", "setup2-gnc-com-knob": "COM",
    };
    const label = labels[control.id];
    if (!label) return;
    const wrapper = document.createElement("div");
    wrapper.className = "av-touch-rotary";
    wrapper.dataset.avTouchControl = control.id;
    wrapper.setAttribute("role", "group");
    const caption = document.createElement("span");
    caption.className = "av-touch-rotary-caption";
    caption.dataset.avTouchLabel = label;
    const buttons = [-1, 1].map(direction => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "av-key av-touch-step";
      button.dataset.avTouchStep = String(direction);
      button.textContent = direction < 0 ? "−" : "+";
      bindTouchStep(button, () => onStep(direction));
      return button;
    });
    control.before(wrapper);
    wrapper.append(caption, buttons[0], control, buttons[1]);
  }

  function updateTouchControlLabels() {
    const mobileToggle = document.getElementById("av-mobile-toggle");
    if (mobileToggle) {
      mobileToggle.textContent = t("av_mobile_button");
      mobileToggle.setAttribute("aria-label", t(mobileToggle.getAttribute("aria-pressed") === "true" ? "av_mobile_disable" : "av_mobile_enable"));
    }
    document.querySelectorAll(".av-touch-rotary").forEach(wrapper => {
      const caption = wrapper.querySelector("[data-av-touch-label]");
      const key = caption.dataset.avTouchLabel;
      const label = key.startsWith("av_") ? t(key) : key;
      caption.textContent = label;
      wrapper.setAttribute("aria-label", label);
      wrapper.querySelectorAll("[data-av-touch-step]").forEach(button => {
        button.setAttribute("aria-label", `${t(Number(button.dataset.avTouchStep) < 0 ? "av_touch_decrease" : "av_touch_increase")} · ${label}`);
      });
    });
    document.querySelectorAll("[data-av-aircraft-turn]").forEach(button => {
      button.setAttribute("aria-label", t(Number(button.dataset.avAircraftTurn) < 0 ? "av_touch_turn_left" : "av_touch_turn_right"));
    });
  }

  function renderTouchFlightControls(setupId, heading, running) {
    const controls = document.querySelector(`[data-av-touch-flight="${setupId}"]`);
    if (!controls) return;
    controls.querySelector("output").textContent = `HDG ${formatHeading(heading)}°`;
    const toggle = controls.querySelector("[data-av-map-flight]");
    toggle.textContent = t(running ? "av_tutorial_pause" : "av_tutorial_go");
    toggle.setAttribute("aria-pressed", String(running));
  }

  function bindTouchFlightControls() {
    document.getElementById("av-mobile-toggle")?.addEventListener("click", event => {
      const trainer = document.getElementById("avionics-trainer");
      const enabled = trainer.classList.toggle("av-mobile-mode");
      event.currentTarget.setAttribute("aria-pressed", String(enabled));
      updateTouchControlLabels();
      if (state.activeSetup === "av-setup-2") refreshSetup2TutorialMap();
      else refreshTutorialMap();
    });
    document.querySelectorAll("[data-av-touch-flight]").forEach(controls => {
      const setup2 = controls.dataset.avTouchFlight === "av-setup-2";
      controls.querySelectorAll("[data-av-aircraft-turn]").forEach(button => {
        bindTouchStep(button, () => {
          const direction = Number(button.dataset.avAircraftTurn);
          if (setup2) moveSetup2TutorialByKeyboard(direction < 0 ? "ArrowLeft" : "ArrowRight");
          else turnTutorial(direction);
        });
      });
      controls.querySelector("[data-av-map-flight]")?.addEventListener("click", setup2 ? toggleSetup2Flight : toggleTutorialFlight);
    });
    updateTouchControlLabels();
    global.addEventListener("myflyapp:language", updateTouchControlLabels);
  }

  function bindGnsCrsrKnob() {
    const bindings = [["av-gns-nav-outer", "right-large"], ["av-gns-crsr-knob", "right-small"],
      ["av-gns-tune-outer", "left-large"], ["av-gns-tune-toggle", "left-small"]];
    bindings.forEach(([id, kind]) => {
      const knob = document.getElementById(id);
      const press = id === "av-gns-crsr-knob" ? () => pressGnsKey("CRSR")
        : id === "av-gns-tune-toggle" ? () => {
          if (!state.gnsPower) return;
          state.tuningTarget = state.tuningTarget === "COM" ? "VLOC" : "COM";
          render();
        } : undefined;
      bindHorizontalRotary(knob, direction => rotateGns(kind, direction), press);
      knob?.addEventListener("keydown", event => {
        if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
          event.preventDefault();
          rotateGns(kind, event.key === "ArrowRight" ? 1 : -1);
        }
      });
      knob?.addEventListener("wheel", event => {
        event.preventDefault();
        rotateGns(kind, event.deltaY < 0 ? 1 : -1);
      }, { passive: false });
    });
  }

  function bindControls() {
    document.getElementById("avionics-trainer")?.addEventListener("click", event => {
      const button = event.target.closest("[data-av-navaid]");
      if (button) locateNavAid(button);
    });
    document.getElementById("av-setup-1-tab")?.addEventListener("click", () => switchAvionicsSetup("av-setup-1"));
    document.getElementById("av-setup-2-tab")?.addEventListener("click", () => switchAvionicsSetup("av-setup-2"));
    bindAvionicsHelper();
    document.getElementById("av-g5-pfd-power")?.addEventListener("click", () => togglePower("g5-pfd"));
    document.getElementById("av-g5-hsi-power")?.addEventListener("click", () => togglePower("g5-hsi"));
    document.getElementById("av-gns-power")?.addEventListener("click", () => togglePower("gns"));
    document.getElementById("setup2-gi-power")?.addEventListener("click", () => toggleSetup2Power("gi"));
    document.getElementById("setup2-gnc-power")?.addEventListener("click", () => toggleSetup2Power("gnc"));
    bindHorizontalRotary(document.getElementById("setup2-gi-course-knob"), (direction) => {
      if (!state.setup2.giPower) return;
      state.setup2.course = normalize(state.setup2.course + direction * 5);
      setup2SetStatus(`GI-106A OBS ${formatHeading(state.setup2.course)}°.`);
      renderSetup2();
    });
    document.getElementById("setup2-gi-course-knob")?.addEventListener("keydown", (event) => {
      if (!state.setup2.giPower) return;
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      state.setup2.course = normalize(state.setup2.course + (event.key === "ArrowRight" ? 5 : -5));
      setup2SetStatus(`GI-106A OBS ${formatHeading(state.setup2.course)}°.`);
      renderSetup2();
    });
    bindHorizontalRotary(document.getElementById("setup2-gnc-nav-knob"), (direction) => setup2AdjustFrequency("NAV", direction), () => {
      if (!state.setup2.gncPower) return;
      state.setup2.tuningTarget = "NAV";
      setup2SetStatus("GNC 255 NAV selecionado.");
      renderSetup2();
    });
    bindHorizontalRotary(document.getElementById("setup2-gnc-com-knob"), (direction) => setup2AdjustFrequency("COM", direction), () => {
      if (!state.setup2.gncPower) return;
      state.setup2.tuningTarget = "COM";
      setup2SetStatus("GNC 255 COM selecionado.");
      renderSetup2();
    });
    ["NAV", "COM"].forEach((target) => {
      const knob = document.getElementById(`setup2-gnc-${target.toLowerCase()}-knob`);
      knob?.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        setup2AdjustFrequency(target, ["ArrowRight", "ArrowUp"].includes(event.key) ? 1 : -1);
      });
      knob?.addEventListener("wheel", (event) => {
        event.preventDefault();
        setup2AdjustFrequency(target, event.deltaY < 0 ? 1 : -1);
      }, { passive: false });
    });
    document.getElementById("setup2-gnc-nav-flip")?.addEventListener("click", () => setup2Flip(state.setup2.tuningTarget));
    document.getElementById("setup2-gnc-com-flip")?.addEventListener("click", () => {
      if (!state.setup2.gncPower) return;
      state.setup2.tuningTarget = state.setup2.tuningTarget === "NAV" ? "COM" : "NAV";
      setup2SetStatus(`GNC 255 ${state.setup2.tuningTarget} selecionado.`);
      renderSetup2();
    });
    document.getElementById("setup2-gnc-cdi-button")?.addEventListener("click", () => {
      // GNC 255 Pilot's Guide 190-01182-01 Rev. E §§1.2.6–1.2.7:
      // OBS shows course/CDI; T/F reads bearing/radial, never forces a flag.
      if (!state.setup2.gncPower) return;
      state.setup2.tuningTarget = "NAV";
      state.setup2.navDisplay = state.setup2.navDisplay === "OBS" ? "FREQ" : "OBS";
      renderSetup2();
    });
    document.getElementById("setup2-gnc-tofrom-button")?.addEventListener("click", () => {
      if (!state.setup2.gncPower) return;
      state.setup2.tuningTarget = "NAV";
      state.setup2.navDisplay = state.setup2.navDisplay === "TO" ? "FROM" : "TO";
      renderSetup2();
    });
    document.querySelectorAll("[data-g5-menu-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        const unit = button.closest("[data-g5-menu-unit]")?.dataset.g5MenuUnit;
        selectG5MenuChoice(unit, button.dataset.g5MenuChoice);
      });
    });
    ["pfd", "hsi"].forEach((unit) => {
      const config = g5UnitConfig(unit);
      const knob = document.getElementById(config.knobId);
      bindHorizontalRotary(knob, (direction) => {
        if (!g5Powered(unit)) return;
        rotateG5Hsi(direction, unit);
      }, () => {
        if (!g5Powered(unit)) return;
        pressG5HsiKnob(unit);
      }, () => {
        if (!g5Powered(unit) || g5MenuOpen(unit) || g5Mode(unit) !== "HDG") return;
        syncHeading(unit);
      });
      knob?.addEventListener("keydown", (event) => {
        if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
          event.preventDefault();
          const direction = event.key === "ArrowRight" ? 1 : -1;
          rotateG5Hsi(direction, unit);
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          pressG5HsiKnob(unit);
        } else if (event.key === "Escape" && g5MenuOpen(unit)) {
          event.preventDefault();
          selectG5MenuChoice(unit, "BACK");
        }
      });
    });
    bindGnsCrsrKnob();
    document.querySelectorAll("[data-av-gns-volume]").forEach(knob => {
      const target = knob.dataset.avGnsVolume;
      const adjust = direction => {
        if (!state.gnsPower) return;
        const key = target === "COM" ? "gnsComVolume" : "gnsNavVolume";
        state[key] = clamp((state[key] ?? 50) + direction * 5, 0, 100);
        setStatus(`${target} volume ${state[key]}% (simulado).`);
      };
      bindHorizontalRotary(knob, adjust, () => {
        if (!state.gnsPower) return;
        const key = target === "COM" ? "gnsSquelch" : "gnsIdent";
        state[key] = !state[key];
        setStatus(`${target} ${target === "COM" ? "squelch" : "ID"} ${state[key] ? "ON" : "OFF"} (simulado).`);
      });
      knob.addEventListener("keydown", event => {
        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault(); adjust(event.key === "ArrowRight" ? 1 : -1);
      });
    });
    document.querySelectorAll("[data-av-gns-key]").forEach(button => {
      const key = button.dataset.avGnsKey;
      if (key === "CLR") bindHorizontalRotary(button, undefined, () => pressGnsKey("CLR"), () => pressGnsKey("CLR_HOLD"));
      else button.addEventListener("click", () => pressGnsKey(key));
    });
    document.getElementById("av-gns-model")?.addEventListener("change", event => {
      state.gnsModel = event.target.value;
      state.gnsDetail = null;
      render();
    });
    const display = document.getElementById("av-gns-screen");
    display?.addEventListener("click", event => {
      const choice = event.target.closest?.("[data-gns-menu-choice]");
      if (choice) gnsSelectMenu(Number(choice.dataset.gnsMenuChoice));
    });
    display?.addEventListener("input", event => {
      if (event.target.id !== "av-gns-ident-input") return;
      event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      state.directEntry = event.target.value;
      state.gnsDirectConfirm = false;
      renderGns();
    });
    display?.addEventListener("change", event => {
      const input = event.target.closest?.(".gns-frequency-input");
      if (input) {
        input.blur();
        commitGnsFrequencyInput(input);
      }
    });
    display?.addEventListener("keydown", event => {
      const input = event.target.closest?.("input");
      if (!input) return;
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
        if (input.id === "av-gns-ident-input") pressGnsKey("ENT");
        else commitGnsFrequencyInput(input);
      } else if (event.key === "Escape") {
        event.preventDefault();
        input.blur();
        if (input.id === "av-gns-ident-input") pressGnsKey("CLR");
        else render();
      }
    });
    document.getElementById("av-reset")?.addEventListener("click", () => {
      state.challengeConfirmed[`setup1-${state.tutorialId}`] = false;
      Object.assign(state, { g5PfdPower: true, g5HsiPower: true, g5PfdPage: "PFD", g5HsiPage: "HSI", g5PfdMode: "HDG", g5HsiMode: "HDG", g5PfdMenu: false, g5HsiMenu: false, g5PfdMenuSelection: "HDG", g5HsiMenuSelection: "HDG", g5PfdHeadingBug: 270, g5HsiHeadingBug: 270, g5PfdCourse: 270, g5HsiCourse: 270, g5PfdBearingPointer: true, g5HsiBearingPointer: true, g5LastUnit: null, gnsPower: true, heading: 260, source: "GPS", waypoint: "LPPR", obsMode: false, tuningTarget: "COM", comActive: 118.00, comStandby: 122.80, vlocActive: 110.30, vlocStandby: 114.10, gnsGroup: "NAV", gnsPageIndex: 1, gnsMenu: false, gnsCursor: false, directToArmed: false, directToActive: false, directEntry: "", mapRange: 20, message: "" });
      setStatus(t("av_status_ready"));
      loadTutorialExample("vis-to");
      render();
    });
    document.getElementById("setup2-reset")?.addEventListener("click", resetSetup2);
    document.getElementById("av-tutorial-example")?.addEventListener("change", () => {
      syncToFromGuideVisibility();
      render();
    });
    document.getElementById("av-tutorial-load")?.addEventListener("click", () => loadTutorialExample(document.getElementById("av-tutorial-example")?.value || "vis-to"));
    document.getElementById("av-tutorial-check")?.addEventListener("click", tutorialCheck);
    document.getElementById("av-tutorial-next")?.addEventListener("click", nextTutorialExample);
    document.getElementById("setup2-tutorial-load")?.addEventListener("click", () => loadSetup2TutorialExample(document.getElementById("setup2-tutorial-example")?.value || "identify"));
    document.getElementById("setup2-tutorial-check")?.addEventListener("click", checkSetup2Tutorial);
    document.getElementById("setup2-tutorial-next")?.addEventListener("click", nextSetup2TutorialExample);
    document.getElementById("setup2-tutorial-flight-toggle")?.addEventListener("click", toggleSetup2Flight);
    document.getElementById("setup2-tutorial-example")?.addEventListener("change", (event) => loadSetup2TutorialExample(event.target.value));
    document.querySelectorAll(".av-challenge-open").forEach((button) => {
      button.addEventListener("click", () => openChallenge(button.closest("[data-challenge-id]")?.dataset.challengeId));
    });
    document.querySelectorAll(".av-challenge-confirm").forEach((button) => {
      button.addEventListener("click", () => confirmChallenge(button.closest("[data-challenge-id]")?.dataset.challengeId));
    });
    document.getElementById("av-tutorial-flight-toggle")?.addEventListener("click", toggleTutorialFlight);
    document.addEventListener("keydown", handleTutorialFlightKey, true);
    bindTouchFlightControls();
    global.addEventListener("myflyapp:language", render);
  }

  function ensureReady() {
    if (ready) {
      render();
      refreshTutorialMap();
      return;
    }
    if (!document.getElementById("avionics-trainer")) return;
    bindControls();
    ready = true;
    state.ready = true;
    tutorialPosition = { ...FREE_TUTORIAL_EXAMPLE.start };
    setup2TutorialPosition = { ...SETUP2_TUTORIAL_EXAMPLES[0].start };
    initTutorialMap();
    loadTutorialExample("free", false);
    loadSetup2TutorialExample("free", false);
    global.MyFlyGnsDisplay?.init(render);
    render();
    refreshTutorialMap(true);
  }

  global.MyFlyAvionics = { ensureReady };
  document.addEventListener("DOMContentLoaded", ensureReady);
})(window);
