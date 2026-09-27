/* Manual HSI/RMI/VOR study controls. Educational aid only; not certified avionics. */
(function (global) {
  "use strict";

  const normalize = (degrees) => ((Number(degrees) % 360) + 360) % 360;
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const randomBearing = () => Math.floor(Math.random() * 360);
  const randomDeviation = () => [-1.8, -1.4, -1, -0.6, 0.6, 1, 1.4, 1.8][Math.floor(Math.random() * 8)];

  function randomDifferentBearing(reference, minimumDifference = 30) {
    const availableArc = 360 - minimumDifference * 2;
    return normalize(reference + minimumDifference + Math.floor(Math.random() * (availableArc + 1)));
  }

  function setControlValue(id, value) {
    const control = document.getElementById(id);
    if (control) control.value = String(value);
  }

  function seedRandomStudyExample() {
    const hsiHeading = randomBearing();
    const rmiHeading = randomBearing();
    const rmiVorBearing = randomDifferentBearing(rmiHeading);

    setControlValue("nav-study-hsi-heading", hsiHeading);
    setControlValue("nav-study-hsi-course", randomDifferentBearing(hsiHeading));
    setControlValue("nav-study-hsi-deviation", randomDeviation());
    setControlValue("nav-study-rmi-heading", rmiHeading);
    setControlValue("nav-study-rmi-vor", rmiVorBearing);
    setControlValue("nav-study-rmi-adf", randomDifferentBearing(rmiVorBearing, 40));
    setControlValue("nav-study-vor-course", randomBearing());
    setControlValue("nav-study-vor-deviation", randomDeviation());
    setControlValue("nav-study-vor-flag", Math.random() < 0.5 ? "TO" : "FROM");
  }

  function readNumber(id, fallback) {
    const value = Number.parseFloat(document.getElementById(id)?.value ?? "");
    return Number.isFinite(value) ? value : fallback;
  }

  function formatBearing(value) {
    return String(Math.round(normalize(value))).padStart(3, "0");
  }

  function formatDeviation(value) {
    const bounded = clamp(Number(value) || 0, -2, 2);
    return `${bounded > 0 ? "+" : ""}${bounded.toFixed(1)}`;
  }

  function initInstrumentLab() {
    const root = document.getElementById("nav-instrument-lab");
    if (!root || root.dataset.ready === "true") return;
    if (!global.HSIInstrument || !global.RMIInstrument || !global.VORIndicator) return;

    seedRandomStudyExample();
    const hsi = new global.HSIInstrument(document.getElementById("nav-study-hsi"));
    const rmi = new global.RMIInstrument(document.getElementById("nav-study-rmi"));
    const vor = new global.VORIndicator(document.getElementById("nav-study-vor"));

    function updateHsi() {
      const heading = normalize(readNumber("nav-study-hsi-heading", 45));
      const course = normalize(readNumber("nav-study-hsi-course", 90));
      const deviation = clamp(readNumber("nav-study-hsi-deviation", 0), -2, 2);
      hsi.setState({ heading, course, deviation });
      const readout = document.getElementById("nav-study-hsi-readout");
      if (readout) readout.textContent = `HDG ${formatBearing(heading)} · CRS ${formatBearing(course)} · CDI ${formatDeviation(deviation)}`;
    }

    function updateRmi() {
      const heading = normalize(readNumber("nav-study-rmi-heading", 45));
      const vorBearing = normalize(readNumber("nav-study-rmi-vor", 110));
      const adfBearing = normalize(readNumber("nav-study-rmi-adf", 285));
      rmi.setState({ heading, vorBearing, adfBearing });
      const readout = document.getElementById("nav-study-rmi-readout");
      if (readout) readout.textContent = `HDG ${formatBearing(heading)} · VOR ${formatBearing(vorBearing)} · ADF ${formatBearing(adfBearing)}`;
    }

    function updateVor() {
      const course = normalize(readNumber("nav-study-vor-course", 90));
      const deviation = clamp(readNumber("nav-study-vor-deviation", 0), -2, 2);
      const flag = document.getElementById("nav-study-vor-flag")?.value || "OFF";
      vor.setState({ course, deviation, flag });
      const readout = document.getElementById("nav-study-vor-readout");
      if (readout) readout.textContent = `OBS ${formatBearing(course)} · CDI ${formatDeviation(deviation)} · ${flag}`;
    }

    ["nav-study-hsi-heading", "nav-study-hsi-course", "nav-study-hsi-deviation"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", updateHsi);
    });
    ["nav-study-rmi-heading", "nav-study-rmi-vor", "nav-study-rmi-adf"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", updateRmi);
    });
    ["nav-study-vor-course", "nav-study-vor-deviation"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", updateVor);
    });
    document.getElementById("nav-study-vor-flag")?.addEventListener("change", updateVor);

    updateHsi();
    updateRmi();
    updateVor();
    root.dataset.ready = "true";
  }

  document.addEventListener("DOMContentLoaded", initInstrumentLab);
  global.MyFlyInstrumentLab = { init: initInstrumentLab };
})(window);
