/* Interactive Porto/Viseu VOR trainer. Educational aid only; not certified avionics. */
(function (global) {
  "use strict";

  // NAV Portugal eAIP ENR 4.1, checked 2026-08-28. VOR declination: 02 W (2020).
  const VOR_STATIONS = [
    { id: "PRT", name: "Porto", frequency: 114.10, lat: 41.273056, lng: -8.687778, radialCorrection: 2 },
    { id: "VIS", name: "Viseu", frequency: 113.10, lat: 40.723333, lng: -7.885833, radialCorrection: 2 },
  ];
  const INITIAL_POSITION = { lat: 41.065, lng: -8.285 };
  const RANDOM_BOUNDS = { south: 40.52, north: 41.48, west: -8.9, east: -7.58 };
  const NM_PER_RADIAN = 3440.065;

  let ready = false;
  let map = null;
  let aircraftMarker = null;
  let directLine = null;
  let stationMarkers = [];
  let hsi = null;
  let vor = null;
  let tunedStation = null;

  const normalize = (value) => ((Number(value) % 360) + 360) % 360;
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const toRadians = (value) => Number(value) * Math.PI / 180;
  const toDegrees = (value) => Number(value) * 180 / Math.PI;
  const angleDelta = (target, reference) => ((Number(target) - Number(reference) + 540) % 360) - 180;
  const formatBearing = (value) => String(Math.round(normalize(value))).padStart(3, "0");
  const formatFrequency = (value) => Number(value).toFixed(2);

  function t(key) {
    return global.MyFlyI18n?.t?.(key) || key;
  }

  function tf(key, values = {}) {
    let text = t(key);
    Object.entries(values).forEach(([name, value]) => {
      text = text.replaceAll(`{${name}}`, String(value));
    });
    return text;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function readRange(id, fallback) {
    const value = Number(document.getElementById(id)?.value);
    return Number.isFinite(value) ? normalize(value) : fallback;
  }

  function setRange(id, value) {
    const input = document.getElementById(id);
    if (input) input.value = String(Math.round(normalize(value)));
  }

  function parseFrequency(value) {
    const parsed = Number.parseFloat(String(value || "").trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function findStationByFrequency(value) {
    const frequency = parseFrequency(value);
    if (frequency === null) return null;
    return VOR_STATIONS.find((station) => Math.abs(station.frequency - frequency) < 0.006) || null;
  }

  function bearingTrue(from, to) {
    const lat1 = toRadians(from.lat);
    const lat2 = toRadians(to.lat);
    const longitudeDifference = toRadians(to.lng - from.lng);
    const y = Math.sin(longitudeDifference) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(longitudeDifference);
    return normalize(toDegrees(Math.atan2(y, x)));
  }

  function distanceNm(from, to) {
    const lat1 = toRadians(from.lat);
    const lat2 = toRadians(to.lat);
    const latitudeDifference = toRadians(to.lat - from.lat);
    const longitudeDifference = toRadians(to.lng - from.lng);
    const sinLatitude = Math.sin(latitudeDifference / 2);
    const sinLongitude = Math.sin(longitudeDifference / 2);
    const haversine = sinLatitude * sinLatitude + Math.cos(lat1) * Math.cos(lat2) * sinLongitude * sinLongitude;
    return 2 * NM_PER_RADIAN * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  function getNavigationGeometry() {
    if (!tunedStation || !aircraftMarker) return null;
    const position = aircraftMarker.getLatLng();
    const radialFrom = normalize(bearingTrue(tunedStation, position) + tunedStation.radialCorrection);
    return {
      position,
      radialFrom,
      bearingTo: normalize(radialFrom + 180),
      distance: distanceNm(tunedStation, position),
    };
  }

  function aircraftIcon() {
    return L.divIcon({
      className: "",
      html: '<div class="vor-trainer-aircraft" role="img" aria-label="Avião arrastável"><span>▲</span></div>',
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });
  }

  function stationIcon(station, active) {
    return L.divIcon({
      className: "",
      html: `<div class="vor-station-marker${active ? " is-active" : ""}"><strong>${station.id}</strong><span>${formatFrequency(station.frequency)}</span></div>`,
      iconSize: [64, 48],
      iconAnchor: [32, 24],
    });
  }

  function updateMapPresentation(heading) {
    const aircraft = aircraftMarker?.getElement()?.querySelector("span");
    if (aircraft) aircraft.style.transform = `rotate(${heading}deg)`;

    if (directLine) {
      directLine.setLatLngs(tunedStation && aircraftMarker
        ? [aircraftMarker.getLatLng(), [tunedStation.lat, tunedStation.lng]]
        : []);
    }
  }

  function updateSignalBadge() {
    const badge = document.getElementById("vor-trainer-signal");
    if (!badge) return;
    badge.classList.toggle("is-off", !tunedStation);
    badge.classList.toggle("is-on", Boolean(tunedStation));
    badge.textContent = tunedStation
      ? `${tunedStation.id} · ${formatFrequency(tunedStation.frequency)}`
      : "NAV OFF";
  }

  function needleInstruction(errorDegrees) {
    if (Math.abs(errorDegrees) < 1) return t("vor_needle_centered");
    return t(errorDegrees < 0 ? "vor_needle_left" : "vor_needle_right");
  }

  function turnInstruction(heading, bearingTo) {
    const difference = angleDelta(bearingTo, heading);
    if (Math.abs(difference) < 2) return t("vor_heading_aligned");
    return tf(difference < 0 ? "vor_turn_left" : "vor_turn_right", {
      degrees: Math.round(Math.abs(difference)),
    });
  }

  function renderUntuned(heading, obs) {
    hsi?.setState({ heading, course: obs, deviation: 0 });
    vor?.setState({ course: obs, deviation: 0, flag: "OFF" });
    setText("vor-trainer-hsi-readout", `HDG ${formatBearing(heading)} · CRS ${formatBearing(obs)} · NAV OFF`);
    setText("vor-trainer-vor-readout", `OBS ${formatBearing(obs)} · NAV OFF`);
    setText("vor-trainer-station", "—");
    setText("vor-trainer-distance", "—");
    setText("vor-trainer-radial", "—");
    setText("vor-trainer-bearing", "—");
    setText("vor-trainer-guidance", t("vor_not_tuned"));
    setText("vor-trainer-explanation", t("vor_not_tuned_explanation"));
  }

  function render() {
    if (!ready) return;
    const heading = readRange("vor-trainer-heading", 260);
    const obs = readRange("vor-trainer-obs", 270);
    setText("vor-trainer-heading-output", `${formatBearing(heading)}°`);
    setText("vor-trainer-obs-output", `${formatBearing(obs)}°`);
    updateSignalBadge();
    updateMapPresentation(heading);

    const geometry = getNavigationGeometry();
    if (!geometry) {
      renderUntuned(heading, obs);
      return;
    }

    const toAlignment = Math.abs(angleDelta(obs, geometry.bearingTo));
    const isAmbiguous = geometry.distance < 0.5 || Math.abs(toAlignment - 90) <= 3;
    const flag = isAmbiguous ? "OFF" : toAlignment < 90 ? "TO" : "FROM";
    const rawCourseError = flag === "TO"
      ? angleDelta(geometry.bearingTo, obs)
      : angleDelta(obs, geometry.radialFrom);
    const courseError = Math.abs(rawCourseError) < 1 ? 0 : rawCourseError;
    const deviation = flag === "OFF" ? 0 : clamp(courseError / 5, -2, 2);

    hsi?.setState({ heading, course: obs, deviation });
    vor?.setState({ course: obs, deviation, flag });
    setText("vor-trainer-hsi-readout", `HDG ${formatBearing(heading)} · CRS ${formatBearing(obs)} · CDI ${deviation >= 0 ? "+" : ""}${deviation.toFixed(1)} · ${flag === "OFF" ? "NAV" : flag}`);
    setText("vor-trainer-vor-readout", `OBS ${formatBearing(obs)} · CDI ${deviation >= 0 ? "+" : ""}${deviation.toFixed(1)} · ${flag === "OFF" ? "NAV" : flag}`);
    setText("vor-trainer-station", `${tunedStation.name} · ${tunedStation.id} ${formatFrequency(tunedStation.frequency)}`);
    setText("vor-trainer-distance", `${geometry.distance.toFixed(1)} NM (${t("vor_geometric_distance")})`);
    setText("vor-trainer-radial", `${formatBearing(geometry.radialFrom)}°`);
    setText("vor-trainer-bearing", `${formatBearing(geometry.bearingTo)}°`);

    if (flag === "OFF") {
      setText("vor-trainer-guidance", t("vor_off_guidance"));
      setText("vor-trainer-explanation", t("vor_off_explanation"));
      return;
    }

    const needle = needleInstruction(courseError);
    setText("vor-trainer-guidance", tf(flag === "TO" ? "vor_to_guidance" : "vor_from_guidance", { needle }));
    setText("vor-trainer-explanation", flag === "TO"
      ? tf("vor_to_explanation", { obs: formatBearing(obs), turn: turnInstruction(heading, geometry.bearingTo) })
      : tf("vor_from_explanation", { obs: formatBearing(obs) }));
  }

  function tune(value, fitMap = false) {
    const input = document.getElementById("vor-trainer-frequency");
    const requested = value ?? input?.value;
    tunedStation = findStationByFrequency(requested);
    if (input && tunedStation) input.value = formatFrequency(tunedStation.frequency);
    if (input) input.setAttribute("aria-invalid", tunedStation ? "false" : "true");
    stationMarkers.forEach(({ station, marker }) => {
      marker.setIcon(stationIcon(station, station === tunedStation));
    });
    render();

    if (fitMap && map && aircraftMarker && tunedStation) {
      map.fitBounds([aircraftMarker.getLatLng(), [tunedStation.lat, tunedStation.lng]], { padding: [55, 55], maxZoom: 9 });
    }
  }

  function setObsFor(flag) {
    const geometry = getNavigationGeometry();
    if (!geometry) return;
    setRange("vor-trainer-obs", flag === "TO" ? geometry.bearingTo : geometry.radialFrom);
    render();
  }

  function setDirectHeading() {
    const geometry = getNavigationGeometry();
    if (!geometry) return;
    setRange("vor-trainer-heading", geometry.bearingTo);
    render();
  }

  function randomPosition() {
    if (!aircraftMarker) return;
    let position;
    let attempts = 0;
    do {
      position = {
        lat: RANDOM_BOUNDS.south + Math.random() * (RANDOM_BOUNDS.north - RANDOM_BOUNDS.south),
        lng: RANDOM_BOUNDS.west + Math.random() * (RANDOM_BOUNDS.east - RANDOM_BOUNDS.west),
      };
      attempts += 1;
    } while (tunedStation && distanceNm(tunedStation, position) < 3 && attempts < 10);
    aircraftMarker.setLatLng(position);
    map?.panTo(position);
    render();
  }

  function initMap() {
    map = L.map("vor-trainer-map", { zoomControl: true }).setView([41.02, -8.25], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    stationMarkers = VOR_STATIONS.map((station) => {
      const marker = L.marker([station.lat, station.lng], { icon: stationIcon(station, false), zIndexOffset: 500 }).addTo(map);
      marker.bindPopup(`<strong>${station.name} DVOR/DME · ${station.id}</strong><br>${formatFrequency(station.frequency)} MHz`);
      return { station, marker };
    });

    directLine = L.polyline([], { color: "#f59e0b", weight: 3, opacity: 0.85, dashArray: "8 7" }).addTo(map);
    aircraftMarker = L.marker(INITIAL_POSITION, {
      icon: aircraftIcon(),
      draggable: true,
      keyboard: true,
      zIndexOffset: 800,
      title: "Avião",
    }).addTo(map);
    aircraftMarker.on("drag", render);
    aircraftMarker.on("dragend", render);
    map.on("click", (event) => {
      aircraftMarker.setLatLng(event.latlng);
      render();
    });
  }

  function bindControls() {
    document.getElementById("vor-trainer-tune")?.addEventListener("click", () => tune(undefined, true));
    document.getElementById("vor-trainer-frequency")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") tune(undefined, true);
    });
    document.getElementById("vor-trainer-frequency")?.addEventListener("change", () => tune(undefined, true));
    document.querySelectorAll("[data-vor-frequency]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = document.getElementById("vor-trainer-frequency");
        if (input) input.value = button.getAttribute("data-vor-frequency") || "";
        tune(input?.value, true);
      });
    });
    document.getElementById("vor-trainer-heading")?.addEventListener("input", render);
    document.getElementById("vor-trainer-obs")?.addEventListener("input", render);
    document.getElementById("vor-trainer-center-to")?.addEventListener("click", () => setObsFor("TO"));
    document.getElementById("vor-trainer-center-from")?.addEventListener("click", () => setObsFor("FROM"));
    document.getElementById("vor-trainer-direct-heading")?.addEventListener("click", setDirectHeading);
    document.getElementById("vor-trainer-random-position")?.addEventListener("click", randomPosition);
    global.addEventListener("myflyapp:language", render);
  }

  function ensureReady() {
    if (ready) {
      setTimeout(() => map?.invalidateSize(), 80);
      render();
      return;
    }
    const root = document.getElementById("vor-trainer");
    if (!root || !global.L || !global.HSIInstrument || !global.VORIndicator) return;
    initMap();
    hsi = new global.HSIInstrument(document.getElementById("vor-trainer-hsi"));
    vor = new global.VORIndicator(document.getElementById("vor-trainer-indicator"));
    bindControls();
    ready = true;
    tune(document.getElementById("vor-trainer-frequency")?.value, true);
    setTimeout(() => map?.invalidateSize(), 80);
  }

  global.MyFlyVorTrainer = { ensureReady };
})(window);
