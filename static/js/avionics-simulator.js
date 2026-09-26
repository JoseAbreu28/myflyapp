/* Garmin-style avionics trainer. Educational aid only; not certified avionics. */
(function (global) {
  "use strict";

  const WAYPOINTS = {
    LPPR: { name: "Porto", bearing: 35, distance: 18 },
    LPVL: { name: "Vila Real", bearing: 72, distance: 42 },
    LPBR: { name: "Braga", bearing: 12, distance: 27 },
    LPVZ: { name: "Viseu", bearing: 130, distance: 55 },
  };
  const VLOC_STATIONS = {
    PRT: { name: "Porto", frequency: 114.10, radial: 270 },
    VIS: { name: "Viseu", frequency: 113.10, radial: 160 },
  };
  const TUTORIAL_REFERENCES = {
    VIS: { id: "VIS", name: "Viseu VOR", frequency: 113.10, lat: 40.723333, lng: -7.885833 },
    PRT: { id: "PRT", name: "Porto VOR", frequency: 114.10, lat: 41.273056, lng: -8.687778 },
    LPPR: { id: "LPPR", name: "Porto airport", lat: 41.2481, lng: -8.6814 },
  };
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
    NAV: ["NAV 1", "MAP", "NAV/COM"],
    WPT: ["APT", "VOR", "DIRECT-TO"],
    AUX: ["FPLN", "UTILITY", "SETUP"],
    NRST: ["APT", "VOR", "FSS"],
  };
  const state = {
    ready: false,
    activeSetup: "av-setup-1",
    g5PfdPower: true,
    g5HsiPower: true,
    gnsPower: true,
    g5Menu: false,
    g5HsiMode: "HDG",
    g5MenuSelection: "HDG",
    heading: 260,
    headingBug: 270,
    course: 270,
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
      toFrom: "TO",
      navMode: "VOR",
      navActive: 113.10,
      navStandby: 114.10,
      comActive: 118.000,
      comStandby: 122.800,
      tuningTarget: "NAV",
    },
    tutorialId: "vis-to",
    tutorialResultKey: "av_tutorial_ready",
    setup2TutorialId: "identify",
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

  function findVlocStation() {
    const active = activeFrequency("VLOC");
    return Object.values(VLOC_STATIONS).find((station) => Math.abs(station.frequency - active) < 0.006) || null;
  }

  function syncFlightControls() {
    setText("av-instrument-summary", `HDG ${formatHeading(state.heading)} · BUG ${formatHeading(state.headingBug)} · CRS ${formatHeading(state.course)} · ${state.source} · ${state.waypoint}`);
  }

  function setup2NavId() {
    if (Math.abs(state.setup2.navActive - 113.10) < 0.006) return "VIS · ID OK";
    if (Math.abs(state.setup2.navActive - 114.10) < 0.006) return "PRT · ID OK";
    return "NAV · ID OFF";
  }

  function setup2CdiValue() {
    const reference = Object.values(TUTORIAL_REFERENCES).find((item) => item.frequency && Math.abs(item.frequency - state.setup2.navActive) < 0.006);
    if (!reference || !setup2TutorialPosition || state.setup2.navMode !== "VOR") return "OFF";
    const radialFrom = tutorialBearing(reference, setup2TutorialPosition);
    const selectedCourse = state.setup2.toFrom === "TO" ? normalize(radialFrom + 180) : radialFrom;
    const deviation = angleDelta(state.setup2.course, selectedCourse);
    if (Math.abs(deviation) <= 4) return "CENTER";
    return deviation < 0 ? "LEFT" : "RIGHT";
  }

  function setup2SetStatus(message) {
    state.setup2TutorialResultKey = "av_setup2_tutorial_ready";
    state.setup2StatusKey = null;
    state.setup2StatusText = message;
    setText("setup2-training-status", message);
    setStatus(message);
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

    const needle = document.getElementById("setup2-gi-course-needle");
    if (needle) needle.setAttribute("transform", `rotate(${setup.course} 160 160)`);
    setText("setup2-gi-course-value", `${formatHeading(setup.course)}°`);
    setText("setup2-gi-cdi-value", setup.giPower && setup.gncPower ? setup2CdiValue() : "OFF");
    setText("setup2-gi-tofrom", setup.giPower ? setup.toFrom : "OFF");
    setText("setup2-gi-loc", setup.giPower ? setup.navMode : "OFF");
    setText("setup2-gi-readout", setup.giPower ? `${formatVloc(setup.navActive)} · ${setup.toFrom}` : "OFF");
    const giKnob = document.querySelector("#setup2-gi-course-knob small");
    if (giKnob) giKnob.textContent = `${formatHeading(setup.course)}°`;

    const displayIsNav = setup.tuningTarget === "NAV";
    const displayActive = displayIsNav ? formatVloc(setup.navActive) : formatCom(setup.comActive);
    const displayStandby = displayIsNav ? formatVloc(setup.navStandby) : formatCom(setup.comStandby);
    setText("setup2-gnc-mode", setup.gncPower ? (displayIsNav ? setup.navMode : "COM") : "OFF");
    setText("setup2-gnc-active-frequency", setup.gncPower ? displayActive : "OFF");
    setText("setup2-gnc-standby-frequency", setup.gncPower ? displayStandby : "OFF");
    setText("setup2-gnc-id", setup.gncPower ? (displayIsNav ? setup2NavId() : "COM ACTIVE") : "OFF");
    setText("setup2-gnc-standby-id", setup.gncPower ? `${setup.tuningTarget} STBY` : "OFF");
    setText("setup2-gnc-readout", setup.gncPower ? `${setup.tuningTarget} · ${displayActive}` : "OFF");
    setText("setup2-instrument-summary", `OBS ${formatHeading(setup.course)} · NAV ${formatVloc(setup.navActive)} · ${setup.toFrom} · CDI ${setup.giPower && setup.gncPower ? setup2CdiValue() : "OFF"}`);
    renderSetup2Tutorial();
  }

  function gpsDeviation() {
    const target = WAYPOINTS[state.waypoint] || WAYPOINTS.LPPR;
    return clamp(angleDelta(target.bearing, state.course) / 5, -2.5, 2.5);
  }

  function vlocDeviation() {
    const station = findVlocStation();
    if (!station) return 0;
    const geometry = tutorialVlocGeometry();
    const selectedReference = geometry
      ? (Math.abs(angleDelta(state.course, geometry.bearingTo)) < 90 ? geometry.bearingTo : geometry.radialFrom)
      : station.radial;
    return clamp(angleDelta(state.course, selectedReference) / 5, -2.5, 2.5);
  }

  function cdiDeviation() {
    return state.source === "VLOC" ? vlocDeviation() : gpsDeviation();
  }

  function tutorialVlocGeometry() {
    const example = tutorialExample();
    const reference = TUTORIAL_REFERENCES[example.reference];
    const station = findVlocStation();
    if (!reference || !station || Math.abs(reference.frequency - station.frequency) > 0.006 || !tutorialPosition) return null;
    const radialFrom = tutorialBearing(reference, tutorialPosition);
    return { radialFrom, bearingTo: normalize(radialFrom + 180) };
  }

  function tutorialNavFlag() {
    if (state.source !== "VLOC") return "GPS";
    const geometry = tutorialVlocGeometry();
    if (!geometry) return "NAV OFF";
    const alignment = Math.abs(angleDelta(state.course, geometry.bearingTo));
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
    const radialInput = document.getElementById("av-tutorial-radial");
    const distanceInput = document.getElementById("av-tutorial-distance");
    const toggle = document.getElementById("av-tutorial-flight-toggle");
    if (radialInput) {
      radialInput.value = String(Math.round(normalize(tutorialFlight.radialFrom)));
      radialInput.disabled = tutorialFlight.running;
    }
    if (distanceInput) {
      distanceInput.value = String(Math.max(0.1, Number(tutorialFlight.distanceNm).toFixed(1)));
      distanceInput.disabled = tutorialFlight.running;
    }
    setText("av-tutorial-radial-value", `${formatHeading(tutorialFlight.radialFrom)}°`);
    setText("av-tutorial-distance-value", Number(tutorialFlight.distanceNm).toFixed(1));
    setText("av-tutorial-speed", `${tutorialFlight.speedKts} KTS`);
    setText("av-tutorial-flight-heading", `${formatHeading(state.heading)}°`);
    setText("av-tutorial-flight-time", tutorialFlightTime());
    if (toggle) {
      toggle.textContent = t(tutorialFlight.running ? "av_tutorial_pause" : "av_tutorial_go");
      toggle.setAttribute("aria-pressed", tutorialFlight.running ? "true" : "false");
    }
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
    const source = frequency && state.source === "VLOC" && state.g5HsiPower;
    const course = state.g5HsiPower && Math.abs(angleDelta(state.course, example.expectedCourse)) <= 4;
    const heading = (state.g5PfdPower || state.g5HsiPower) && Math.abs(angleDelta(state.headingBug, example.expectedHeading)) <= 6;
    const indication = source && tutorialNavFlag() === example.expectedMode && Math.abs(cdiDeviation()) <= 0.8;
    if (example.kind === "MAP") {
      const mapPage = state.gnsPower && state.gnsGroup === "NAV" && state.gnsPageIndex === example.expectedGnsPageIndex;
      const gps = mapPage && state.source === "GPS" && state.waypoint === example.expectedWaypoint;
      const range = mapPage && state.mapRange === example.expectedMapRange;
      return [mapPage, gps, range, heading];
    }
    if (example.kind === "GPS") {
      const gps = state.gnsPower && state.g5HsiPower && state.source === "GPS" && state.waypoint === example.expectedWaypoint;
      return [gps, gps && state.directToActive && state.gnsGroup === "NAV", course && state.obsMode, heading];
    }
    if (example.id === "vis-to") return [frequency, source, course, heading && indication];
    return [source, course, heading && indication, null];
  }

  function setup2StepResults() {
    const example = setup2TutorialExample();
    const setup = state.setup2;
    const nav = setup.gncPower && setup.tuningTarget === "NAV" && setup.navMode === "VOR";
    const frequency = nav && Math.abs(setup.navActive - example.frequency) < 0.006;
    if (example.id === "identify") return [nav, frequency, frequency];
    const course = setup.giPower && Math.abs(angleDelta(setup.course, example.course)) <= 4;
    const indication = frequency && setup.giPower && setup.toFrom === example.toFrom && setup2CdiValue() === "CENTER";
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

  function setTutorialPositionFromFlightInputs() {
    const reference = tutorialReference();
    const radialInput = document.getElementById("av-tutorial-radial");
    const distanceInput = document.getElementById("av-tutorial-distance");
    const radial = clamp(Number(radialInput?.value ?? tutorialFlight.radialFrom), 0, 359);
    const distance = clamp(Number(distanceInput?.value ?? tutorialFlight.distanceNm), 5, 80);
    tutorialFlight.radialFrom = radial;
    tutorialFlight.distanceNm = distance;
    tutorialFlight.elapsedSeconds = 0;
    tutorialPosition = tutorialDestination(reference, radial, distance);
    state.tutorialResultKey = isFreeTutorial() ? "av_tutorial_free_ready" : "av_tutorial_ready";
    render();
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
    syncTutorialFlightInputsFromPosition();
    render();
  }

  function toggleTutorialFlight() {
    if (tutorialFlight.running) {
      stopTutorialFlight();
      return;
    }
    if (!tutorialPosition) setTutorialPositionFromFlightInputs();
    tutorialFlight.running = true;
    tutorialFlight.elapsedSeconds = 0;
    tutorialFlight.intervalId = window.setInterval(advanceTutorialFlight, 100);
    render();
  }

  function turnTutorial(direction) {
    state.heading = normalize(state.heading + Number(direction) * 5);
    render();
  }

  function handleTutorialFlightKey(event) {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!document.getElementById("avionics")?.classList.contains("active") || state.activeSetup !== "av-setup-1") return;
    if (event.target?.closest?.("input, select, textarea, [contenteditable]:not([contenteditable='false']), [role='dialog'], .avionics-layout, [role='tablist']")) return;
    event.preventDefault();
    // Capture before Leaflet handles the same arrows as map-panning commands.
    event.stopPropagation();
    turnTutorial(event.key === "ArrowLeft" ? -1 : 1);
  }

  function tutorialReference() {
    return TUTORIAL_REFERENCES[tutorialExample().reference] || TUTORIAL_REFERENCES.VIS;
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
      html: `<div class="av-tutorial-reference-marker${active ? " is-active" : ""}"><strong>${reference.id}</strong><span>${reference.frequency ? formatVloc(reference.frequency) : "GPS"}</span></div>`,
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
      marker.bindPopup(`<strong>${reference.name}</strong><br>${reference.frequency ? `${formatVloc(reference.frequency)} MHz` : "GPS waypoint"}`);
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
      renderTutorial();
    });
    tutorialAircraftMarker.on("dragend", (event) => {
      stopTutorialFlight(false);
      tutorialPosition = event.target.getLatLng();
      state.tutorialResultKey = isFreeTutorial() ? "av_tutorial_free_ready" : "av_tutorial_ready";
      syncTutorialFlightInputsFromPosition();
      renderTutorial();
      tutorialMap.getContainer().focus({ preventScroll: true });
    });
    tutorialMap.on("click", (event) => {
      stopTutorialFlight(false);
      tutorialPosition = event.latlng;
      tutorialAircraftMarker.setLatLng(event.latlng);
      state.tutorialResultKey = isFreeTutorial() ? "av_tutorial_free_ready" : "av_tutorial_ready";
      syncTutorialFlightInputsFromPosition();
      renderTutorial();
      tutorialMap.getContainer().focus({ preventScroll: true });
    });
    renderTutorial();
    window.setTimeout(() => tutorialMap?.invalidateSize(), 120);
  }

  function renderTutorial() {
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
    setText("av-tutorial-reference", `${reference.name}${reference.frequency ? ` · ${formatVloc(reference.frequency)} MHz` : ""}`);
    setText("av-tutorial-bearing", `${formatHeading(bearingTo)}°`);
    setText("av-tutorial-radial-readout", `${formatHeading(radialFrom)}°`);
    setText("av-tutorial-status", t(state.tutorialResultKey));
    if (tutorialFlight.running && !passed) setText("av-tutorial-status", `${t("av_tutorial_flight_running")} · ${tutorialFlight.speedKts} KTS · HDG ${formatHeading(state.heading)}°`);
    const exampleIndex = TUTORIAL_EXAMPLES.findIndex((item) => item.id === example.id);
    setText("av-tutorial-progress", isFreeTutorial() ? t("av_tutorial_free_badge") : `${exampleIndex + 1} / ${TUTORIAL_EXAMPLES.length}`);
    setText("av-tutorial-load", t(isFreeTutorial() ? "av_tutorial_load_free" : "av_tutorial_load"));
    const checkButton = document.getElementById("av-tutorial-check");
    if (checkButton) checkButton.disabled = isFreeTutorial();
    updateTutorialFlightControls();

    if (!tutorialMap || !tutorialAircraftMarker) return;
    tutorialAircraftMarker.setLatLng(position);
    const direction = tutorialAircraftMarker.getElement()?.querySelector(".av-tutorial-aircraft-direction");
    if (direction) direction.style.transform = `rotate(${normalize(state.heading)}deg)`;
    tutorialLine?.setLatLngs([position, target]);
    tutorialReferenceMarkers.forEach(({ reference: item, marker }) => {
      marker.setIcon(tutorialReferenceIcon(item, item.id === reference.id));
    });
  }

  function setup2TutorialExample() {
    return SETUP2_TUTORIAL_EXAMPLES.find((item) => item.id === state.setup2TutorialId) || SETUP2_TUTORIAL_EXAMPLES[0];
  }

  function initSetup2TutorialMap() {
    if (setup2TutorialMap || !global.L || !document.getElementById("setup2-tutorial-map")) return;
    setup2TutorialMap = global.L.map("setup2-tutorial-map", { zoomControl: true }).setView([41.0, -8.25], 7.5);
    global.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(setup2TutorialMap);
    setup2TutorialReferenceMarkers = [TUTORIAL_REFERENCES.VIS, TUTORIAL_REFERENCES.PRT].map((reference) => {
      const marker = global.L.marker([reference.lat, reference.lng], {
        icon: tutorialReferenceIcon(reference, false), zIndexOffset: 500,
      }).addTo(setup2TutorialMap);
      marker.bindPopup(`<strong>${reference.name}</strong><br>${formatVloc(reference.frequency)} MHz`);
      return { reference, marker };
    });
    setup2TutorialLine = global.L.polyline([], { color: "#f59e0b", weight: 3, opacity: 0.9, dashArray: "8 7" }).addTo(setup2TutorialMap);
    const start = setup2TutorialPosition || SETUP2_TUTORIAL_EXAMPLES[0].start;
    setup2TutorialAircraftMarker = global.L.marker([start.lat, start.lng], {
      icon: tutorialAircraftIcon(), draggable: true, keyboard: true, zIndexOffset: 900,
      title: "Avião do exercício Setup 2",
    }).addTo(setup2TutorialMap);
    setup2TutorialAircraftMarker.on("drag", (event) => {
      setup2TutorialPosition = event.target.getLatLng();
      state.setup2TutorialResultKey = "av_setup2_tutorial_ready";
      state.setup2StatusKey = "av_setup2_tutorial_ready";
      renderSetup2();
    });
    setup2TutorialMap.on("click", (event) => {
      setup2TutorialPosition = event.latlng;
      setup2TutorialAircraftMarker.setLatLng(event.latlng);
      state.setup2TutorialResultKey = "av_setup2_tutorial_ready";
      state.setup2StatusKey = "av_setup2_tutorial_ready";
      renderSetup2();
    });
    renderSetup2Tutorial();
  }

  function renderSetup2Tutorial() {
    const example = setup2TutorialExample();
    const index = SETUP2_TUTORIAL_EXAMPLES.indexOf(example) + 1;
    const prefix = `av_setup2_level${index}`;
    const reference = TUTORIAL_REFERENCES[example.reference];
    const position = setup2TutorialPosition || example.start;
    const bearingTo = tutorialBearing(position, reference);
    const radialFrom = tutorialBearing(reference, position);
    const distance = tutorialDistanceNm(position, reference);
    setText("setup2-tutorial-progress", `${index} / ${SETUP2_TUTORIAL_EXAMPLES.length}`);
    setText("setup2-tutorial-example-title", t(`${prefix}_title`));
    setText("setup2-tutorial-briefing", t(`${prefix}_briefing`));
    setText("setup2-tutorial-objective-text", t(`${prefix}_objective`));
    setText("setup2-tutorial-aircraft", `${position.lat.toFixed(3)}°, ${position.lng.toFixed(3)}° · ${distance.toFixed(1)} NM`);
    setText("setup2-tutorial-reference", `${reference.name} · ${formatVloc(reference.frequency)} MHz`);
    setText("setup2-tutorial-bearing", `${formatHeading(bearingTo)}°`);
    setText("setup2-tutorial-radial", `${formatHeading(radialFrom)}°`);
    const stepResults = setup2StepResults();
    const passed = state.setup2.giPower && tutorialStepsPassed(stepResults, setup2TutorialPosition, example);
    if (passed) state.setup2TutorialResultKey = "av_setup2_tutorial_success";
    else if (state.setup2TutorialResultKey === "av_setup2_tutorial_success") state.setup2TutorialResultKey = "av_setup2_tutorial_ready";
    setText("setup2-tutorial-status", t(state.setup2TutorialResultKey));
    renderTutorialSteps("setup2-tutorial-steps", [1, 2, 3].map((step) => `${prefix}_step${step}`), stepResults);
    updateTutorialCompletionVisuals("setup2-", passed);
    if (!setup2TutorialMap || !setup2TutorialAircraftMarker) return;
    setup2TutorialAircraftMarker.setLatLng(position);
    setup2TutorialLine?.setLatLngs([position, reference]);
    setup2TutorialReferenceMarkers.forEach(({ reference: item, marker }) => {
      marker.setIcon(tutorialReferenceIcon(item, item.id === reference.id));
    });
  }

  function loadSetup2TutorialExample(id, fitMap = true) {
    const example = SETUP2_TUTORIAL_EXAMPLES.find((item) => item.id === id) || SETUP2_TUTORIAL_EXAMPLES[0];
    state.setup2TutorialId = example.id;
    state.setup2TutorialResultKey = "av_setup2_tutorial_ready";
    state.setup2StatusKey = "av_setup2_tutorial_ready";
    state.setup2StatusText = "";
    setup2TutorialPosition = { ...example.start };
    Object.assign(state.setup2, {
      giPower: true, gncPower: true, course: 270, toFrom: "TO", navMode: "VOR",
      navActive: example.initialActive, navStandby: example.initialStandby,
      comActive: 118.000, comStandby: 122.800, tuningTarget: "NAV",
    });
    const select = document.getElementById("setup2-tutorial-example");
    if (select) select.value = example.id;
    setText("setup2-training-status", t("av_setup2_tutorial_ready"));
    renderSetup2();
    if (state.activeSetup === "av-setup-2") initSetup2TutorialMap();
    if (fitMap && setup2TutorialMap) {
      setup2TutorialMap.invalidateSize();
      setup2TutorialMap.fitBounds([setup2TutorialPosition, TUTORIAL_REFERENCES[example.reference]], { padding: [45, 45], maxZoom: 9 });
    }
  }

  function checkSetup2Tutorial() {
    const example = setup2TutorialExample();
    const setup = state.setup2;
    const positionOk = setup2TutorialPosition && tutorialDistanceNm(setup2TutorialPosition, example.start) <= 9;
    let result = "av_setup2_tutorial_success";
    if (!setup.giPower || !setup.gncPower) result = "av_setup2_tutorial_power";
    else if (!positionOk) result = "av_setup2_tutorial_position";
    else if (setup.tuningTarget !== "NAV" || setup.navMode !== "VOR" || Math.abs(setup.navActive - example.frequency) >= 0.006) result = "av_setup2_tutorial_frequency";
    else if (example.course !== null && Math.abs(angleDelta(setup.course, example.course)) > 4) result = "av_setup2_tutorial_course";
    else if (example.toFrom && setup.toFrom !== example.toFrom) result = "av_setup2_tutorial_tofrom";
    else if (example.course !== null && setup2CdiValue() !== "CENTER") result = "av_setup2_tutorial_cdi";
    state.setup2TutorialResultKey = result;
    state.setup2StatusKey = result;
    state.setup2StatusText = "";
    setText("setup2-training-status", t(result));
    renderSetup2Tutorial();
  }

  function nextSetup2TutorialExample() {
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
    stopTutorialFlight(false);
    const example = id === FREE_TUTORIAL_EXAMPLE.id
      ? FREE_TUTORIAL_EXAMPLE
      : TUTORIAL_EXAMPLES.find((item) => item.id === id) || TUTORIAL_EXAMPLES[0];
    state.tutorialId = example.id;
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
    Object.assign(state, {
      g5PfdPower: true,
      g5HsiPower: true,
      gnsPower: true,
      g5Menu: false,
      g5HsiMode: "HDG",
      g5MenuSelection: "HDG",
      heading: 270,
      headingBug: 270,
      course: 270,
      source: "GPS",
      waypoint: example.kind === "GPS" ? "LPVL" : example.kind === "MAP" ? example.expectedWaypoint : "LPPR",
      obsMode: false,
      tuningTarget: "COM",
      comActive: 118.00,
      comStandby: 122.80,
      vlocActive: 110.30,
      vlocStandby: 114.10,
      gnsGroup: "NAV",
      gnsPageIndex: example.kind === "MAP" ? 0 : 1,
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

  function drawG5Tape(ctx, x, y, width, height, value, unit, side) {
    ctx.fillStyle = "rgba(2, 6, 23, 0.78)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    const labelX = side === "left" ? x + width - 8 : x + 8;
    canvasText(ctx, unit, labelX, y + 18, { color: "#facc15", font: "700 14px Consolas, monospace", align: side === "left" ? "right" : "left" });
    canvasText(ctx, String(value), labelX, y + height / 2, { font: "700 27px Consolas, monospace", align: side === "left" ? "right" : "left" });
    canvasText(ctx, side === "left" ? "▲" : "◀", side === "left" ? x + width + 8 : x - 8, y + height / 2, { color: "#facc15", font: "700 18px sans-serif", align: side === "left" ? "left" : "right" });
  }

  function drawHeadingTape(ctx, width) {
    const x = 125;
    const y = 17;
    const tapeWidth = width - 250;
    ctx.fillStyle = "rgba(2, 6, 23, 0.9)";
    ctx.fillRect(x, y, tapeWidth, 56);
    for (let offset = -60; offset <= 60; offset += 10) {
      const heading = normalize(state.heading + offset);
      const px = x + tapeWidth / 2 + (offset * 2.25);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = offset % 30 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(px, y + 38);
      ctx.lineTo(px, y + (offset % 30 === 0 ? 19 : 27));
      ctx.stroke();
      if (offset % 30 === 0) canvasText(ctx, formatHeading(heading), px, y + 11, { color: "#e2e8f0", font: "700 13px Consolas, monospace", align: "center" });
    }
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(width / 2, y + 56);
    ctx.lineTo(width / 2 - 8, y + 44);
    ctx.lineTo(width / 2 + 8, y + 44);
    ctx.closePath();
    ctx.fill();
    canvasText(ctx, formatHeading(state.heading), width / 2, y + 72, { color: "#facc15", font: "700 20px Consolas, monospace", align: "center" });
  }

  function drawPfd(ctx, width, height) {
    const horizon = height * 0.48;
    ctx.fillStyle = "#23618a";
    ctx.fillRect(0, 0, width, horizon);
    ctx.fillStyle = "#80633d";
    ctx.fillRect(0, horizon, width, height - horizon);
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 2;
    for (let offset = -80; offset <= 80; offset += 20) {
      const y = horizon + offset;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 42, y);
      ctx.lineTo(width / 2 - 10, y);
      ctx.moveTo(width / 2 + 10, y);
      ctx.lineTo(width / 2 + 42, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 65, height / 2);
    ctx.lineTo(width / 2 - 16, height / 2);
    ctx.moveTo(width / 2 + 16, height / 2);
    ctx.lineTo(width / 2 + 65, height / 2);
    ctx.stroke();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(width / 2, height / 2 - 12);
    ctx.lineTo(width / 2 - 9, height / 2 + 10);
    ctx.lineTo(width / 2 + 9, height / 2 + 10);
    ctx.closePath();
    ctx.fill();
    drawHeadingTape(ctx, width);
    drawG5Tape(ctx, 12, 105, 86, 215, Math.round(90), "IAS", "left");
    drawG5Tape(ctx, width - 98, 105, 86, 215, "2500", "ALT", "right");
    canvasText(ctx, "VS", width - 45, 350, { color: "#facc15", font: "700 13px Consolas, monospace", align: "center" });
    canvasText(ctx, "+020", width - 45, 374, { font: "700 17px Consolas, monospace", align: "center" });
    canvasText(ctx, currentNavLabel(), 22, height - 32, { color: "#dbeafe", font: "700 16px Consolas, monospace" });
    canvasText(ctx, state.obsMode ? "OBS" : "GPS", width - 22, height - 32, { color: "#f0abfc", font: "700 16px Consolas, monospace", align: "right" });
  }

  function drawCompass(ctx, width, height) {
    const cx = width / 2;
    const cy = height * 0.54;
    const radius = Math.min(width * 0.37, height * 0.4);
    ctx.fillStyle = "#07131c";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-state.heading * Math.PI / 180);
    ctx.strokeStyle = "#dbeafe";
    ctx.lineWidth = 2;
    for (let degree = 0; degree < 360; degree += 5) {
      const length = degree % 30 === 0 ? 17 : degree % 10 === 0 ? 11 : 6;
      const angle = degree * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(Math.sin(angle) * (radius - length), -Math.cos(angle) * (radius - length));
      ctx.lineTo(Math.sin(angle) * radius, -Math.cos(angle) * radius);
      ctx.stroke();
      if (degree % 30 === 0) {
        ctx.save();
        ctx.translate(Math.sin(angle) * (radius - 30), -Math.cos(angle) * (radius - 30));
        // The card rotates with heading, but its labels remain upright.
        ctx.rotate(state.heading * Math.PI / 180);
        canvasText(ctx, degree === 0 ? "N" : degree === 90 ? "E" : degree === 180 ? "S" : degree === 270 ? "W" : String(degree / 10).padStart(2, "0"), 0, 0, { color: "#e2e8f0", font: "700 18px Consolas, monospace", align: "center" });
        ctx.restore();
      }
    }
    ctx.restore();
    // Heading-up HSI: map heading rotates the card once. CRS is an absolute
    // selection, so draw it in its own (course - heading) frame, not the card's.
    const courseAngle = (state.course - state.heading) * Math.PI / 180;
    const cdi = cdiDeviation();
    const cdiOffset = cdi * 23;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(courseAngle);
    ctx.strokeStyle = "#f0abfc";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -radius + 16);
    ctx.lineTo(0, -radius * 0.42);
    ctx.moveTo(0, radius * 0.42);
    ctx.lineTo(0, radius - 16);
    ctx.stroke();
    ctx.fillStyle = "#f0abfc";
    ctx.beginPath();
    ctx.moveTo(0, -radius + 4);
    ctx.lineTo(-10, -radius + 23);
    ctx.lineTo(10, -radius + 23);
    ctx.closePath();
    ctx.fill();
    // Deviation moves sideways in the selected course frame, not the card frame.
    ctx.beginPath();
    ctx.moveTo(-cdiOffset, -radius * 0.38);
    ctx.lineTo(-cdiOffset, radius * 0.38);
    ctx.stroke();
    ctx.fillStyle = "#e2e8f0";
    [-2, -1, 1, 2].forEach((dot) => {
      ctx.beginPath();
      ctx.arc(dot * 23, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    // Fixed lubber mark and actual heading (independent of the selected bug).
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius + 4);
    ctx.lineTo(cx - 8, cy - radius - 10);
    ctx.lineTo(cx + 8, cy - radius - 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#020617";
    ctx.fillRect(cx - 40, cy - radius - 43, 80, 29);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 40, cy - radius - 43, 80, 29);
    canvasText(ctx, `${formatHeading(state.heading)}°`, cx, cy - radius - 28, { font: "700 23px Consolas, monospace", align: "center" });
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 54, cy);
    ctx.lineTo(cx - 12, cy);
    ctx.moveTo(cx + 12, cy);
    ctx.lineTo(cx + 54, cy);
    ctx.stroke();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx - 9, cy + 11);
    ctx.lineTo(cx + 9, cy + 11);
    ctx.closePath();
    ctx.fill();
    const bugAngle = (state.headingBug - state.heading) * Math.PI / 180;
    ctx.save();
    ctx.translate(cx + Math.sin(bugAngle) * (radius + 4), cy - Math.cos(bugAngle) * (radius + 4));
    ctx.rotate(bugAngle);
    ctx.fillStyle = "#7dd3fc";
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(-9, -5);
    ctx.lineTo(9, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    canvasText(ctx, "HSI", 20, 26, { color: "#e2e8f0", font: "700 17px Consolas, monospace" });
    canvasText(ctx, currentNavLabel(), 20, 52, { color: "#f0abfc", font: "700 15px Consolas, monospace" });
    canvasText(ctx, `CRS ${formatHeading(state.course)}`, width - 20, 26, { color: "#f0abfc", font: "700 17px Consolas, monospace", align: "right" });
    canvasText(ctx, `CDI ${cdiDeviation() >= 0 ? "+" : ""}${cdiDeviation().toFixed(1)}`, width - 20, 52, { color: "#f8fafc", font: "700 15px Consolas, monospace", align: "right" });
    canvasText(ctx, `${state.source}${state.obsMode ? " · OBS" : ""} · ${tutorialNavFlag()}`, 20, height - 26, { color: "#facc15", font: "700 16px Consolas, monospace" });
    canvasText(ctx, `BUG ${formatHeading(state.headingBug)}`, width - 20, 80, { color: "#7dd3fc", font: "700 19px Consolas, monospace", align: "right" });
  }

  function drawG5Canvas(canvasId, page, powered, readoutId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    let context = g5Contexts.get(canvasId);
    if (!context) {
      context = canvas.getContext("2d");
      if (context) g5Contexts.set(canvasId, context);
    }
    if (!context) return;
    const width = canvas.width;
    const height = canvas.height;
    if (!powered) {
      drawG5Off(context, width, height);
    } else {
      if (page === "HSI") drawCompass(context, width, height);
      else drawPfd(context, width, height);
    }
    const readout = page === "HSI"
      ? `HSI · HDG ${formatHeading(state.heading)} · BUG ${formatHeading(state.headingBug)} · CRS ${formatHeading(state.course)} · ${state.source} · ${tutorialNavFlag()}`
      : `PFD · HDG ${formatHeading(state.heading)} · BUG ${formatHeading(state.headingBug)} · ${state.source}`;
    setText(readoutId, powered ? readout : `${page} · OFF`);
  }

  function drawG5() {
    drawG5Canvas("av-g5-pfd-canvas", "PFD", state.g5PfdPower, "av-g5-pfd-readout");
    drawG5Canvas("av-g5-hsi-canvas", "HSI", state.g5HsiPower, "av-g5-hsi-readout");
  }

  function gnsPageName() {
    return PAGES[state.gnsGroup][state.gnsPageIndex] || PAGES[state.gnsGroup][0];
  }

  function renderGnsNav(page) {
    const target = WAYPOINTS[state.waypoint] || WAYPOINTS.LPPR;
    if (page === "MAP") {
      return `<div class="gns-map-page"><div class="gns-map-view" role="img" aria-label="Mapa GNS com terreno, rota e waypoint ${state.waypoint}">
        <svg class="gns-map-svg" viewBox="0 0 640 180" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="gns-map-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#07182a" />
              <stop offset="1" stop-color="#02070d" />
            </linearGradient>
            <linearGradient id="gns-map-relief" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#65722b" />
              <stop offset="0.45" stop-color="#b08727" />
              <stop offset="0.72" stop-color="#77422c" />
              <stop offset="1" stop-color="#302634" />
            </linearGradient>
            <filter id="gns-map-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <rect width="640" height="180" fill="url(#gns-map-sky)" />
          <path class="gns-map-grid" d="M0 42H640 M0 88H640 M0 134H640 M80 0V180 M190 0V180 M300 0V180 M410 0V180 M520 0V180" />
          <path class="gns-map-relief" d="M0 122L74 93 132 106 181 72 246 88 305 46 367 68 421 35 495 59 554 21 640 47V180H0Z" opacity=".88" />
          <path class="gns-map-terrain terrain-yellow" d="M20 122L75 94 132 107 181 74 245 89 207 125 141 137 76 132Z" />
          <path class="gns-map-terrain terrain-orange" d="M260 80L306 48 367 69 421 36 496 60 456 98 382 101 325 119Z" />
          <path class="gns-map-terrain terrain-red" d="M449 94L496 61 554 23 640 48 640 109 570 99 514 123Z" />
          <path class="gns-map-contour" d="M16 129C83 88 129 139 193 89S305 60 366 83 454 26 531 59 592 42 640 61" />
          <path class="gns-map-contour contour-soft" d="M0 151C74 109 117 161 188 114S312 92 378 112 472 54 541 83 597 71 640 84" />
          <path class="gns-map-road" d="M-20 164C81 132 166 143 248 119S407 80 660 93" />
          <path class="gns-map-river" d="M20 10C93 45 126 23 190 50S306 30 364 53 485 34 640 7" />
          <circle class="gns-map-range-ring" cx="188" cy="105" r="67" />
          <path class="gns-map-route" d="M188 105C284 103 354 75 505 58" />
          <path class="gns-map-track" d="M188 105L307 83" />
          <g class="gns-map-aircraft-svg" transform="translate(188 105) rotate(${normalize(state.heading)})" filter="url(#gns-map-glow)">
            <path d="M0-13L5 8 0 5-5 8Z" />
            <path d="M-4-1L-18 7-4 5M4-1L18 7 4 5" />
          </g>
          <g class="gns-map-waypoint" transform="translate(505 58)">
            <circle r="8" />
            <path d="M-14 0H14M0-14V14" />
            <text x="13" y="-10">${state.waypoint}</text>
          </g>
          <text class="gns-map-terrain-label" x="14" y="22">TERRAIN</text>
          <text class="gns-map-airport-label" x="454" y="82">${state.waypoint}</text>
          <text class="gns-map-range-label" x="602" y="164">${state.mapRange} NM</text>
        </svg>
      </div><div class="gns-map-data-grid" aria-label="Campos de dados da Map Page">
        <span><b>RNG</b>${state.mapRange} NM</span><span><b>TRK</b>${formatHeading(state.heading)}°</span>
        <span><b>BRG</b>${formatHeading(target.bearing)}°</span><span><b>DTK</b>${formatHeading(target.bearing)}°</span>
        <span><b>DIS</b>${target.distance.toFixed(1)} NM</span><span><b>GS</b>90 KT</span>
      </div></div>`;
    }
    if (page === "NAV/COM") {
      return `<div class="gns-line"><b>COM</b> ${formatCom(state.comActive)} / ${formatCom(state.comStandby)}</div><div class="gns-line"><b>VLOC</b> ${formatVloc(state.vlocActive)} / ${formatVloc(state.vlocStandby)}</div><div class="gns-line gns-large-value">${state.source} <b>${state.waypoint}</b></div>`;
    }
    const deviation = cdiDeviation();
    return `<div class="gns-line gns-large-value"><b>${state.source}</b> ${state.waypoint}</div><div class="gns-line"><b>DTK</b> ${formatHeading(state.course)}° <b>TRK</b> ${formatHeading(state.heading)}°</div><div class="gns-line"><b>DIS</b> ${target.distance.toFixed(1)} NM <b>BRG</b> ${formatHeading(target.bearing)}°</div><div class="gns-cdi"><span class="gns-cdi-track"></span><span class="gns-cdi-needle" style="left:${50 + deviation * 16}%"></span></div><div class="gns-line gns-bottom"><b>${state.obsMode ? "OBS" : "LEG"}</b> ${formatHeading(state.course)}° <span>${deviation >= 0 ? "+" : ""}${deviation.toFixed(1)} · ${tutorialNavFlag()}</span></div>`;
  }

  function renderGnsWpt(page) {
    if (page === "DIRECT-TO") {
      return `<div class="gns-line gns-large-value"><b>DIRECT-TO</b></div><div class="gns-line">WPT <strong>${state.directEntry || state.waypoint}</strong></div><div class="gns-line">${state.directToArmed ? "SELECT WPT · PRESS ENT" : "PRESS D→ TO EDIT"}</div><div class="gns-line gns-bottom">${state.directToArmed ? "CLR CANCEL" : "ENT ACCEPT"}</div>`;
    }
    const station = findVlocStation();
    if (page === "VOR") return `<div class="gns-line gns-large-value"><b>VOR</b> ${station ? station.name : "---"}</div><div class="gns-line">FREQ ${formatVloc(state.vlocActive)} · ${station ? "ID OK" : "NAV OFF"}</div><div class="gns-line">RADIAL ${station ? formatHeading(station.radial) : "---"}°</div>`;
    return `<div class="gns-line gns-large-value"><b>AIRPORT</b> ${state.waypoint}</div><div class="gns-line">${(WAYPOINTS[state.waypoint] || WAYPOINTS.LPPR).name}</div><div class="gns-line">BRG ${formatHeading((WAYPOINTS[state.waypoint] || WAYPOINTS.LPPR).bearing)}° · ${targetString()}</div>`;
  }

  function targetString() {
    return `${(WAYPOINTS[state.waypoint] || WAYPOINTS.LPPR).distance.toFixed(1)} NM`;
  }

  function renderGns() {
    const screen = document.getElementById("av-gns-screen");
    if (!screen) return;
    if (!state.gnsPower) {
      screen.innerHTML = `<div class="gns-off-screen">GNS 430<br><span>OFF</span></div>`;
      setText("av-gns-readout", "OFF · COM/VLOC STANDBY");
      return;
    }
    const page = gnsPageName();
    let body = "";
    if (state.message) body = `<div class="gns-message">MSG · ${state.message}</div>`;
    else if (state.gnsGroup === "NAV") body = renderGnsNav(page);
    else if (state.gnsGroup === "WPT") body = renderGnsWpt(page);
    else if (state.gnsGroup === "AUX") body = `<div class="gns-line gns-large-value"><b>${page}</b></div><div class="gns-line">${page === "FPLN" ? "ACTIVE FLIGHT PLAN" : "USE KNOBS TO SELECT"}</div><div class="gns-line">COM ${formatCom(state.comActive)} · VLOC ${formatVloc(state.vlocActive)}</div>`;
    else body = `<div class="gns-line gns-large-value"><b>NEAREST ${page}</b></div><div class="gns-line">LPPR · ${targetString()}</div><div class="gns-line">PRESS ENT FOR DETAILS</div>`;
    screen.innerHTML = `<div class="gns-screen-top"><span>${state.gnsGroup}</span><strong>${page}</strong><span>${state.source}</span></div><div class="gns-frequency-strip"><span>COM ${formatCom(state.comActive)} <em>${formatCom(state.comStandby)}</em></span><span>VLOC ${formatVloc(state.vlocActive)} <em>${formatVloc(state.vlocStandby)}</em></span></div><div class="gns-screen-body">${body}</div><div class="gns-screen-footer"><span>${state.gnsCursor ? "CURSOR ACTIVE" : state.gnsMenu ? "MENU OPTIONS" : state.directToArmed ? "DIRECT-TO" : "PAGE GROUP"}</span><span>${state.obsMode ? "OBS" : "AUTO"} · ${state.mapRange}NM</span></div>`;
    setText("av-gns-readout", `${state.gnsGroup} · ${state.source} · ${state.waypoint} · ${state.tuningTarget} STBY`);
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
    syncFlightControls();
    renderPower("g5-pfd", state.g5PfdPower);
    renderPower("g5-hsi", state.g5HsiPower);
    renderPower("gns", state.gnsPower);
    renderG5HsiControls();
    document.getElementById("av-gns-tune-toggle")?.classList.toggle("is-vloc", state.tuningTarget === "VLOC");
    drawG5();
    renderGns();
    renderScenario();
    renderTutorial();
    renderSetup2();
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
    render();
  }

  function setup2AdjustFrequency(target, direction) {
    const key = target === "NAV" ? "navStandby" : "comStandby";
    const step = target === "NAV" ? 0.05 : 0.025;
    const min = target === "NAV" ? 108.00 : 118.000;
    const max = target === "NAV" ? 117.95 : 136.975;
    state.setup2[key] = clamp(Number((state.setup2[key] + direction * step).toFixed(3)), min, max);
    state.setup2.tuningTarget = target;
    setup2SetStatus(`${target} standby ${target === "NAV" ? formatVloc(state.setup2[key]) : formatCom(state.setup2[key])}.`);
    render();
  }

  function setup2Flip(target) {
    const activeKey = target === "NAV" ? "navActive" : "comActive";
    const standbyKey = target === "NAV" ? "navStandby" : "comStandby";
    [state.setup2[activeKey], state.setup2[standbyKey]] = [state.setup2[standbyKey], state.setup2[activeKey]];
    state.setup2.tuningTarget = target;
    setup2SetStatus(`${target} standby transferida para ativa.`);
    render();
  }

  function resetSetup2() {
    state.challengeConfirmed[`setup2-${state.setup2TutorialId}`] = false;
    loadSetup2TutorialExample(state.setup2TutorialId);
  }

  function switchAvionicsSetup(setupId) {
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
    if (setupId === "av-setup-2") initSetup2TutorialMap();
    setStatus(setupId === "av-setup-2" ? "Setup 2 selecionado: GI-106A + GNC 255." : t("av_status_ready"));
    render();
    if (setupId === "av-setup-2") {
      initSetup2TutorialMap();
      window.setTimeout(() => {
        setup2TutorialMap?.invalidateSize();
        const example = setup2TutorialExample();
        setup2TutorialMap?.fitBounds([setup2TutorialPosition || example.start, TUTORIAL_REFERENCES[example.reference]], { padding: [45, 45], maxZoom: 9 });
      }, 120);
    }
  }

  function adjustGnsFrequency(kind, direction) {
    const multiplier = kind === "left-large" ? 1 : kind === "left-small" ? 0.1 : 0;
    if (!multiplier) return;
    const step = state.tuningTarget === "VLOC" ? (kind === "left-large" ? 1 : 0.05) : (kind === "left-large" ? 1 : 0.025);
    setCurrentFrequency(currentFrequency() + direction * step);
    setStatus(`${state.tuningTarget} standby ${state.tuningTarget === "VLOC" ? formatVloc(currentFrequency()) : formatCom(currentFrequency())}.`);
  }

  function rotateGns(kind, direction) {
    if (kind === "left-large" || kind === "left-small") adjustGnsFrequency(kind, direction);
    if (kind === "right-large") {
      const selectingDirectWaypoint = state.directToArmed && state.gnsCursor && state.gnsGroup === "WPT" && state.gnsPageIndex === 2;
      if (selectingDirectWaypoint) {
        const waypointIds = Object.keys(WAYPOINTS);
        const currentIndex = Math.max(0, waypointIds.indexOf(state.directEntry || state.waypoint));
        state.directEntry = waypointIds[(currentIndex + direction + waypointIds.length) % waypointIds.length];
        setStatus(`Direct-to ${state.directEntry} selecionado. Pressiona ENT.`);
      } else {
        const index = PAGE_GROUPS.indexOf(state.gnsGroup);
        state.gnsGroup = PAGE_GROUPS[(index + direction + PAGE_GROUPS.length) % PAGE_GROUPS.length];
        state.gnsPageIndex = 0;
      }
    }
    if (kind === "right-small") {
      const pages = PAGES[state.gnsGroup];
      state.gnsPageIndex = (state.gnsPageIndex + direction + pages.length) % pages.length;
    }
    render();
  }

  function flipFrequency(target) {
    if (target === "COM") [state.comActive, state.comStandby] = [state.comStandby, state.comActive];
    else [state.vlocActive, state.vlocStandby] = [state.vlocStandby, state.vlocActive];
    setStatus(`${target} ${target === "COM" ? formatCom(activeFrequency(target)) : formatVloc(activeFrequency(target))} active.`);
    render();
  }

  function pressGnsKey(key) {
    state.message = "";
    if (["MSG", "FPL", "PROC"].includes(key)) {
      state.gnsGroup = key === "FPL" ? "AUX" : key === "PROC" ? "WPT" : "AUX";
      state.gnsPageIndex = key === "FPL" ? 0 : key === "PROC" ? 2 : 1;
      if (key === "MSG") state.message = "NO MESSAGES";
      setStatus(key === "FPL" ? "Flight plan page selected." : key === "PROC" ? "Procedures page selected." : "No active messages.");
    } else if (key === "CDI") {
      state.source = state.source === "GPS" ? "VLOC" : "GPS";
      setStatus(`CDI ${state.source}.`);
    } else if (key === "OBS") {
      state.obsMode = !state.obsMode;
      setStatus(state.obsMode ? "OBS mode active; automatic sequencing paused." : "OBS mode off; automatic sequencing restored.");
    } else if (key === "COM_FLIP") flipFrequency("COM");
    else if (key === "VLOC_FLIP") flipFrequency("VLOC");
    else if (key === "MENU") state.gnsMenu = !state.gnsMenu;
    else if (key === "CRSR") {
      state.gnsCursor = !state.gnsCursor;
      setStatus(state.gnsCursor ? "GNS cursor active." : "GNS cursor off.");
    }
    else if (key === "RNG_UP") state.mapRange = clamp(state.mapRange * 2, 5, 160);
    else if (key === "RNG_DOWN") state.mapRange = clamp(state.mapRange / 2, 5, 160);
    else if (key === "DIRECT") {
      state.gnsGroup = "WPT";
      state.gnsPageIndex = 2;
      state.directToArmed = true;
      state.directToActive = false;
      state.directEntry = state.waypoint;
      state.gnsCursor = false;
      setStatus("Direct-to ready. Select a waypoint and press ENT.");
    } else if (/^\d$/.test(key) && state.directToArmed) {
      state.directEntry = `${state.directEntry}${key}`.slice(-4);
    } else if (key === "CLR") {
      if (state.directToArmed) state.directEntry = state.directEntry.slice(0, -1);
      else state.message = "";
    } else if (key === "ENT" && state.directToArmed) {
      if (state.directToArmed) state.waypoint = state.directEntry || state.waypoint;
      state.directToArmed = false;
      state.directToActive = true;
      state.directEntry = "";
      state.source = "GPS";
      state.gnsGroup = "NAV";
      state.gnsPageIndex = 0;
      setStatus("Direct-to accepted; NAV guidance active.");
    }
    render();
  }

  function syncHeading() {
    state.headingBug = state.heading;
    setStatus("G5 heading bug synchronized to current heading.");
    render();
  }

  function g5HsiCourseAvailable() {
    return state.source === "VLOC" || state.obsMode;
  }

  function renderG5HsiControls() {
    if (!state.g5HsiPower) {
      state.g5Menu = false;
      state.g5HsiMode = "HDG";
    }
    if (!g5HsiCourseAvailable()) {
      state.g5HsiMode = "HDG";
      if (state.g5MenuSelection === "CRS") state.g5MenuSelection = "HDG";
    }
    const menu = document.getElementById("av-g5-hsi-options");
    if (menu) menu.hidden = !state.g5Menu;
    const knob = document.getElementById("av-g5-hsi-knob");
    if (knob) {
      knob.textContent = state.g5Menu ? "MENU" : state.g5HsiMode;
      knob.title = t(state.g5Menu ? "av_g5_menu_hint" : state.g5HsiMode === "CRS" ? "av_g5_course_help" : "av_g5_heading_help");
      knob.setAttribute("aria-label", `G5 HSI · ${knob.textContent}`);
      knob.setAttribute("aria-expanded", String(state.g5Menu));
      knob.disabled = !state.g5HsiPower;
    }
    const menuButton = document.getElementById("av-g5-hsi-menu");
    if (menuButton) {
      menuButton.disabled = !state.g5HsiPower;
      menuButton.setAttribute("aria-expanded", String(state.g5Menu));
    }
    document.querySelectorAll("[data-g5-hsi-choice]").forEach((button) => {
      const choice = button.dataset.g5HsiChoice;
      button.disabled = choice === "CRS" && !g5HsiCourseAvailable();
      button.classList.toggle("is-selected", choice === state.g5MenuSelection);
    });
    setText("av-g5-hsi-heading-option", `${t("av_g5_menu_heading")} ${formatHeading(state.headingBug)}°`);
    setText("av-g5-hsi-course-option", `${state.source === "VLOC" ? t("av_g5_menu_course") : "OBS"} ${formatHeading(state.course)}°`);
    setText("av-g5-hsi-menu-hint", t(g5HsiCourseAvailable() ? "av_g5_menu_hint" : "av_g5_course_unavailable"));
  }

  function toggleG5HsiMenu() {
    if (!state.g5HsiPower) return;
    state.g5Menu = !state.g5Menu;
    if (state.g5Menu) state.g5MenuSelection = state.g5HsiMode;
    render();
  }

  function selectG5HsiMode(mode) {
    if (!state.g5HsiPower || (mode === "CRS" && !g5HsiCourseAvailable())) return;
    state.g5Menu = false;
    state.g5HsiMode = mode === "CRS" ? "CRS" : "HDG";
    setStatus(t(state.g5HsiMode === "CRS" ? "av_g5_course_help" : "av_g5_heading_help"));
    render();
    document.getElementById("av-g5-hsi-knob")?.focus({ preventScroll: true });
  }

  function rotateG5Hsi(direction) {
    if (!state.g5HsiPower) return;
    if (state.g5Menu) {
      const options = g5HsiCourseAvailable() ? ["HDG", "CRS", "BACK"] : ["HDG", "BACK"];
      const index = options.indexOf(state.g5MenuSelection);
      state.g5MenuSelection = options[(index + direction + options.length) % options.length];
    } else if (state.g5HsiMode === "CRS") {
      state.course = normalize(state.course + direction * 5);
      setStatus(`G5 HSI CRS ${formatHeading(state.course)}°.`);
    } else {
      state.headingBug = normalize(state.headingBug + direction * 5);
      setStatus(`G5 HSI HDG BUG ${formatHeading(state.headingBug)}°.`);
    }
    render();
  }

  function pressG5HsiKnob() {
    if (!state.g5HsiPower) return;
    if (state.g5Menu) selectG5HsiMode(state.g5MenuSelection);
    else if (state.g5HsiMode === "CRS") selectG5HsiMode("HDG");
    else toggleG5HsiMenu();
  }

  function bindHorizontalRotary(control, onStep, onClick, onHold) {
    if (!control) return;
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
        onStep(1);
        drag.remainder -= threshold;
      }
      while (drag.remainder <= -threshold) {
        onStep(-1);
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

  function bindGnsCrsrKnob() {
    const knob = document.getElementById("av-gns-crsr-knob");
    if (!knob) return;
    const drag = { active: false, moved: false, pointerId: null, remainder: 0, lastX: 0 };
    let suppressClick = false;
    const threshold = 18;

    knob.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      drag.active = true;
      drag.moved = false;
      drag.pointerId = event.pointerId;
      drag.remainder = 0;
      drag.lastX = event.clientX;
      knob.classList.add("is-dragging");
      knob.setPointerCapture?.(event.pointerId);
    });
    knob.addEventListener("pointermove", (event) => {
      if (!drag.active || event.pointerId !== drag.pointerId) return;
      const delta = event.clientX - drag.lastX;
      drag.lastX = event.clientX;
      drag.remainder += delta;
      if (Math.abs(drag.remainder) > 5) drag.moved = true;
      while (drag.remainder >= threshold) {
        rotateGns(state.gnsCursor ? "right-small" : "right-large", 1);
        drag.remainder -= threshold;
      }
      while (drag.remainder <= -threshold) {
        rotateGns(state.gnsCursor ? "right-small" : "right-large", -1);
        drag.remainder += threshold;
      }
      event.preventDefault();
    });
    const finishDrag = (event) => {
      if (!drag.active || event.pointerId !== drag.pointerId) return;
      suppressClick = drag.moved;
      drag.active = false;
      knob.classList.remove("is-dragging");
      knob.releasePointerCapture?.(event.pointerId);
    };
    knob.addEventListener("pointerup", finishDrag);
    knob.addEventListener("pointercancel", finishDrag);
    knob.addEventListener("click", (event) => {
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        return;
      }
      pressGnsKey("CRSR");
    });
  }

  function bindControls() {
    document.getElementById("av-setup-1-tab")?.addEventListener("click", () => switchAvionicsSetup("av-setup-1"));
    document.getElementById("av-setup-2-tab")?.addEventListener("click", () => switchAvionicsSetup("av-setup-2"));
    bindAvionicsHelper();
    document.getElementById("av-g5-pfd-power")?.addEventListener("click", () => togglePower("g5-pfd"));
    document.getElementById("av-g5-hsi-power")?.addEventListener("click", () => togglePower("g5-hsi"));
    document.getElementById("av-gns-power")?.addEventListener("click", () => togglePower("gns"));
    document.getElementById("setup2-gi-power")?.addEventListener("click", () => toggleSetup2Power("gi"));
    document.getElementById("setup2-gnc-power")?.addEventListener("click", () => toggleSetup2Power("gnc"));
    bindHorizontalRotary(document.getElementById("setup2-gi-course-knob"), (direction) => {
      state.setup2.course = normalize(state.setup2.course + direction * 5);
      setup2SetStatus(`GI-106A OBS ${formatHeading(state.setup2.course)}°.`);
      render();
    });
    document.getElementById("setup2-gi-course-knob")?.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      state.setup2.course = normalize(state.setup2.course + (event.key === "ArrowRight" ? 5 : -5));
      setup2SetStatus(`GI-106A OBS ${formatHeading(state.setup2.course)}°.`);
      render();
    });
    bindHorizontalRotary(document.getElementById("setup2-gnc-nav-knob"), (direction) => setup2AdjustFrequency("NAV", direction), () => {
      state.setup2.tuningTarget = "NAV";
      setup2SetStatus("GNC 255 NAV selecionado.");
      render();
    });
    bindHorizontalRotary(document.getElementById("setup2-gnc-com-knob"), (direction) => setup2AdjustFrequency("COM", direction), () => {
      state.setup2.tuningTarget = "COM";
      setup2SetStatus("GNC 255 COM selecionado.");
      render();
    });
    document.getElementById("setup2-gi-tofrom-button")?.addEventListener("click", () => {
      state.setup2.toFrom = state.setup2.toFrom === "TO" ? "FROM" : "TO";
      setup2SetStatus(`GI-106A ${state.setup2.toFrom} selecionado.`);
      render();
    });
    document.getElementById("setup2-gnc-nav-flip")?.addEventListener("click", () => setup2Flip(state.setup2.tuningTarget));
    document.getElementById("setup2-gnc-com-flip")?.addEventListener("click", () => {
      state.setup2.tuningTarget = state.setup2.tuningTarget === "NAV" ? "COM" : "NAV";
      setup2SetStatus(`GNC 255 ${state.setup2.tuningTarget} selecionado.`);
      render();
    });
    document.getElementById("setup2-gnc-cdi-button")?.addEventListener("click", () => {
      state.setup2.navMode = state.setup2.navMode === "VOR" ? "LOC" : "VOR";
      setup2SetStatus(`GNC 255 ${state.setup2.navMode} selecionado.`);
      render();
    });
    document.getElementById("setup2-gnc-tofrom-button")?.addEventListener("click", () => {
      state.setup2.toFrom = state.setup2.toFrom === "TO" ? "FROM" : "TO";
      setup2SetStatus(`GNC 255 ${state.setup2.toFrom} selecionado.`);
      render();
    });
    document.getElementById("av-g5-hsi-menu")?.addEventListener("click", toggleG5HsiMenu);
    document.querySelectorAll("[data-g5-hsi-choice]").forEach((button) => {
      button.addEventListener("click", () => selectG5HsiMode(button.dataset.g5HsiChoice));
    });
    bindHorizontalRotary(document.getElementById("av-g5-pfd-knob"), (direction) => {
      if (!state.g5PfdPower) return;
      state.headingBug = normalize(state.headingBug + direction * 5);
      setStatus(`G5 heading bug ${formatHeading(state.headingBug)}°.`);
      render();
    }, () => { if (state.g5PfdPower) syncHeading(); });
    const hsiKnob = document.getElementById("av-g5-hsi-knob");
    bindHorizontalRotary(hsiKnob, rotateG5Hsi, pressG5HsiKnob, () => {
      if (!state.g5HsiPower || state.g5Menu || state.g5HsiMode !== "HDG") return;
      syncHeading();
    });
    hsiKnob?.addEventListener("keydown", (event) => {
      if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        rotateG5Hsi(event.key === "ArrowRight" ? 1 : -1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        selectG5HsiMode("HDG");
      }
    });
    bindGnsCrsrKnob();
    document.querySelectorAll(".gns-volume-knob[data-av-gns-rotate]").forEach((knob) => {
      const [kind] = (knob.getAttribute("data-av-gns-rotate") || "").split(":");
      bindHorizontalRotary(knob, (direction) => rotateGns(kind, direction));
    });
    document.querySelectorAll("[data-av-gns-rotate]").forEach((button) => button.addEventListener("click", () => {
      const [kind, direction] = (button.getAttribute("data-av-gns-rotate") || "").split(":");
      rotateGns(kind, Number(direction));
    }));
    document.querySelectorAll("[data-av-gns-key]").forEach((button) => button.addEventListener("click", () => pressGnsKey(button.getAttribute("data-av-gns-key"))));
    document.getElementById("av-gns-tune-toggle")?.addEventListener("click", () => {
      state.tuningTarget = state.tuningTarget === "COM" ? "VLOC" : "COM";
      setStatus(`Tuning cursor ${state.tuningTarget}.`);
      render();
    });
    document.getElementById("av-reset")?.addEventListener("click", () => {
      state.g5HsiMode = "HDG";
      state.g5MenuSelection = "HDG";
      state.challengeConfirmed[`setup1-${state.tutorialId}`] = false;
      Object.assign(state, { g5PfdPower: true, g5HsiPower: true, gnsPower: true, g5Menu: false, heading: 260, headingBug: 270, course: 270, source: "GPS", waypoint: "LPPR", obsMode: false, tuningTarget: "COM", comActive: 118.00, comStandby: 122.80, vlocActive: 110.30, vlocStandby: 114.10, gnsGroup: "NAV", gnsPageIndex: 1, gnsMenu: false, gnsCursor: false, directToArmed: false, directToActive: false, directEntry: "", mapRange: 20, message: "" });
      setStatus(t("av_status_ready"));
      loadTutorialExample("vis-to");
      render();
    });
    document.getElementById("setup2-reset")?.addEventListener("click", resetSetup2);
    document.getElementById("av-tutorial-load")?.addEventListener("click", () => loadTutorialExample(document.getElementById("av-tutorial-example")?.value || "vis-to"));
    document.getElementById("av-tutorial-check")?.addEventListener("click", tutorialCheck);
    document.getElementById("av-tutorial-next")?.addEventListener("click", nextTutorialExample);
    document.getElementById("setup2-tutorial-load")?.addEventListener("click", () => loadSetup2TutorialExample(document.getElementById("setup2-tutorial-example")?.value || "identify"));
    document.getElementById("setup2-tutorial-check")?.addEventListener("click", checkSetup2Tutorial);
    document.getElementById("setup2-tutorial-next")?.addEventListener("click", nextSetup2TutorialExample);
    document.querySelectorAll(".av-challenge-open").forEach((button) => {
      button.addEventListener("click", () => openChallenge(button.closest("[data-challenge-id]")?.dataset.challengeId));
    });
    document.querySelectorAll(".av-challenge-confirm").forEach((button) => {
      button.addEventListener("click", () => confirmChallenge(button.closest("[data-challenge-id]")?.dataset.challengeId));
    });
    document.getElementById("av-tutorial-radial")?.addEventListener("input", setTutorialPositionFromFlightInputs);
    document.getElementById("av-tutorial-distance")?.addEventListener("input", setTutorialPositionFromFlightInputs);
    document.getElementById("av-tutorial-flight-toggle")?.addEventListener("click", toggleTutorialFlight);
    document.getElementById("av-tutorial-turn-left")?.addEventListener("click", () => turnTutorial(-1));
    document.getElementById("av-tutorial-turn-right")?.addEventListener("click", () => turnTutorial(1));
    document.addEventListener("keydown", handleTutorialFlightKey, true);
    global.addEventListener("myflyapp:language", render);
  }

  function ensureReady() {
    if (ready) {
      render();
      return;
    }
    if (!document.getElementById("avionics-trainer")) return;
    bindControls();
    ready = true;
    state.ready = true;
    tutorialPosition = { ...TUTORIAL_EXAMPLES[0].start };
    setup2TutorialPosition = { ...SETUP2_TUTORIAL_EXAMPLES[0].start };
    initTutorialMap();
    loadTutorialExample("vis-to", false);
    loadSetup2TutorialExample("identify", false);
    render();
  }

  global.MyFlyAvionics = { ensureReady };
  document.addEventListener("DOMContentLoaded", ensureReady);
})(window);
