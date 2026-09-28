/* Live 240 × 128 GNS display, based on Garmin 190-00140-00 / 190-00356-00.
 * Shapes and labels follow the manual; values come from the local simulator. */
(function (global) {
  "use strict";
  let geography = null;
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
  const text = (x, y, value, size = 10, color = "#8dfba6", anchor = "start") => `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}">${escape(value)}</text>`;
  const rect = (x, y, w, h, fill = "#000", stroke = "#78b6dc") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width=".7"/>`;
  const line = (x1, y1, x2, y2, color = "#76abd7") => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${color}" stroke-width=".6" fill="none"/>`;
  const title = value => rect(57, 1, 181, 12, "#14325c") + text(148, 10, value, 8.5, "#fff", "middle");

  function list(heading, rows, selected = -1) {
    let body = title(heading);
    const start = Math.max(0, Math.min(selected - 3, rows.length - 6));
    rows.slice(start, start + 6).forEach((row, i) => {
      const y = 26 + i * 14;
      if (start + i === selected) body += rect(60, y - 10, 176, 13, "#1b467d", "#59e0ff");
      body += text(63, y, row, 8, start + i === selected ? "#c5ffff" : "#8dfba6");
    });
    return body;
  }

  function defaultNav(p) {
    const s = p.state;
    let body = rect(58, 1, 179, 27);
    const needleX = 147 + p.deviation * 23;
    body += text(62, 20, s.gnsCdiScale.toFixed(1), 9, "#fff") + text(233, 20, s.gnsCdiScale.toFixed(1), 9, "#fff", "end");
    for (const x of [99, 111, 123, 135, 159, 171, 183, 195]) body += rect(x, 11, 3, 3, "#a7fcff", "none");
    body += `<path d="M147 4v21M${needleX} 5v20" stroke="${s.source === "GPS" ? "#eaa8fa" : "#83ff92"}" stroke-width="2"/><path d="M147 3l-5 7h10Z" fill="#8dffaa"/>`;
    const from = s.gnsFlightPlanActive && s.gnsFlightPlanLeg > 0 ? s.gnsFlightPlan[s.gnsFlightPlanLeg - 1] : s.directToActive ? "D→" : "----";
    body += rect(58, 30, 179, 23) + text(64, 47, from, 13, "#b0f2a0") + text(170, 47, s.waypoint, 15, "#b0f2a0");
    body += text(141, 45, "→", 17, s.source === "GPS" ? "#eea9f5" : "#8dffaa");
    s.gnsFields.forEach((field, index) => {
      const x = 58 + (index % 3) * 60, y = index < 3 ? 55 : 85;
      body += rect(x, y, 59, 29, "#07100c");
      body += rect(x, y, 59, 10, s.gnsCursor && s.gnsFieldIndex === index ? "#2757a0" : "#244d77");
      const distanceLabel = s.source === "VLOC" ? (s.gnsDistanceUnit === "KM" ? "DME KM" : "DME NM") : (s.gnsDistanceUnit === "KM" ? "DIS KM" : field);
      body += text(x + 29, y + 8, field === "DIS" ? distanceLabel : field, 8, "#c9f6ff", "middle");
      body += text(x + 29, y + 24, p.values[field] ?? "---", 12, "#b0f2a0", "middle");
    });
    return body;
  }

  function nav(p) {
    const s = p.state, page = p.page;
    if (page === "NAV 1") return defaultNav(p);
    if (page === "MAP") {
      if (s.gnsDetail === "MAP_SETUP") return list("MAP SETUP", ["ORIENTATION", s.gnsMapOrientation, "SMALL KNOB: CHANGE", "ENT: RETURN"], 1);
      const width = s.gnsMapData ? 135 : 181;
      let body = `<svg x="57" y="1" width="${width}" height="113" viewBox="0 0 480 220" preserveAspectRatio="xMidYMid slice">${p.mapSvg}</svg>`;
      if (s.gnsMapData) s.gnsMapFields.forEach((field, i) => {
        body += rect(193, 1 + i * 28, 44, 28, "#00100a");
        if (s.gnsDetail === "MAP_FIELDS" && s.gnsFieldIndex === i) body += rect(193, 1 + i * 28, 44, 10, "#2757a0", "#9eedff");
        body += text(215, 10 + i * 28, field, 8, "#9eedff", "middle") + text(215, 24 + i * 28, p.values[field] ?? "---", 10, "#a5f799", "middle");
      });
      return body;
    }
    if (page === "POSITION") return title("POSITION") + text(64, 30, "LAT/LON", 8, "#fff") + text(64, 46, p.position.lat.toFixed(4) + "° N", 13) + text(64, 66, Math.abs(p.position.lng).toFixed(4) + "° W", 13) + text(64, 88, `TRK ${p.values.TRK}   GS ${p.values.GS} KT`, 10) + text(64, 108, "WGS 84 · SIM", 8, "#9fd6ed");
    if (page === "SATELLITE") return title(s.gnsModel === "430w" ? "GPS / SBAS STATUS" : "GPS STATUS") + text(66, 28, "3D NAV · SIMULATED", 10) + (s.gnsModel === "430w" ? text(66, 40, "SBAS " + (s.gnsSbas ? "ON" : "OFF"), 8, "#fff") : "") + [25, 42, 38, 54, 35, 46, 39].map((height, index) => rect(68 + index * 23, 106 - height, 12, height, "#80d384") + text(74 + index * 23, 113, index + 1, 7, "#fff", "middle")).join("");
    if (page === "NAV/COM") return list("NAV/COM FREQUENCIES", [s.waypoint + " · " + p.airport.name, p.airport.frequency ? "COM " + p.airport.frequency : "COM DATA NOT AVAILABLE", "VLOC " + s.vlocActive.toFixed(2), "ID " + p.stationName]);
    if (page === "VNAV") return title("VERTICAL NAVIGATION") + (s.gnsCursor ? rect(60, s.gnsFieldIndex === 0 ? 23 : 46, 176, 17, "#173f78", "#8edfff") : "") + text(64, 34, "TARGET ALT", 8, "#fff") + text(224, 34, s.gnsVnavAltitude + " FT", 10, "#a5f799", "end") + text(64, 57, "VS PROFILE", 8, "#fff") + text(224, 57, s.gnsVnavRate + " FPM", 10, "#a5f799", "end") + text(64, 89, "CRSR · ROTATE TO EDIT", 8, "#9fd6ed") + text(64, 108, "PROFILE ONLY · SIM", 8, "#fff");
    return list("TERRAIN", ["TERRAIN DATABASE", "NOT AVAILABLE", "GEOGRAPHIC MAP: NAV 2"], -1);
  }

  function wpt(p) {
    const s = p.state, airport = p.airport;
    let body = title(p.page === "VOR" ? "VOR" : p.page.replace("APT", "AIRPORT"));
    if (p.page === "VOR") return body + text(64, 33, p.stationId || "----", 16) + text(64, 54, p.stationName, 11) + text(64, 75, "FREQ " + s.vlocActive.toFixed(2), 12) + text(64, 98, p.stationId ? "ID OK · " + p.flag : "NAV OFF", 9, "#fff");
    if (s.gnsCursor) body += rect(60, 16, 64, 19, "#173f78", "#8edfff");
    body += text(64, 31, airport.id, 16) + text(64, 48, airport.name.slice(0, 25), 9) + line(60, 55, 235, 55);
    if (p.page === "APT LOCATION") body += text(65, 72, airport.lat.toFixed(4) + "° N", 12) + text(65, 92, Math.abs(airport.lng).toFixed(4) + "° W", 12);
    else if (p.page === "APT FREQ") body += text(65, 75, airport.frequency ? "COM " + airport.frequency : "FREQUENCY DATA", 12) + text(65, 98, airport.frequency ? "ENT: LOAD COM STANDBY" : "NOT AVAILABLE", 8, "#fff");
    else if (p.page === "USER WPT") body += text(64, 77, "LOCAL WAYPOINT", 11) + text(64, 99, "D→ TO ACTIVATE", 9, "#fff");
    else body += text(64, 78, "DATABASE NOT AVAILABLE", 9, "#fff") + text(64, 100, "TRAINING WAYPOINTS ONLY", 8, "#9fd6ed");
    return body;
  }

  function aux(p) {
    const s = p.state;
    if (s.gnsDetail === "UNITS") return list("UNITS / POSITION", ["DISTANCE   " + s.gnsDistanceUnit, "SPEED      KT", "POSITION   LAT/LON", "DATUM      WGS 84", "ENT: RETURN"], 0);
    if (s.gnsDetail === "COM_CONFIG") return list("COM CONFIGURATION", ["CHANNEL SPACING", s.gnsComSpacing + " KHZ", "SMALL KNOB: CHANGE", "ENT: RETURN"], 1);
    if (s.gnsDetail === "DISPLAY") return list("DISPLAY", ["CONTRAST   " + s.gnsContrast + "%", "BACKLIGHT  " + s.gnsBrightness + "%", "CRSR / LARGE: SELECT", "SMALL: CHANGE VALUE", "ENT: RETURN"], s.gnsFieldIndex % 2);
    if (s.gnsDetail === "CDI") return list("CDI SCALE", ["GPS CDI    " + s.gnsCdiScale.toFixed(1) + " NM", "VLOC       AUTO", "SMALL: CHANGE VALUE", "ENT: RETURN"], 0);
    if (s.gnsDetail === "SBAS") return list("SBAS SELECTION", ["WAAS       " + (s.gnsSbas ? "ON" : "OFF"), s.gnsModel === "430w" ? "SIMULATED SBAS" : "GNS 430: NOT EQUIPPED", "ENT: RETURN"], 0);
    if (s.gnsDetail === "TRIP") return list("TRIP PLANNING", ["TO      " + s.waypoint, "DIS     " + p.values.DIS + " NM", "GS      " + p.values.GS + " KT", "ETE     " + p.values.ETE, "ENT: RETURN"]);
    if (s.gnsDetail === "TIMERS") return list("FLIGHT TIMER", ["ELAPSED  " + p.elapsed, "GS       90 KT", "CONTROL  GO / PAUSE", "ENT: RETURN"]);
    if (s.gnsDetail) return list(s.gnsDetail.replace(/_/g, " "), ["NO EXTERNAL DATABASE", "OR SENSOR CONNECTED", "ENT: RETURN"]);
    return list(p.page, p.auxItems.map(item => item.label), s.gnsCursor ? s.gnsFieldIndex : -1);
  }

  function special(p) {
    const s = p.state;
    if (s.gnsSpecialPage === "DIRECT") {
      let body = title("DIRECT-TO") + text(64, 26, "IDENT", 8, "#fff") + rect(64, 30, 94, 20, "#173969", "#95ebfa") + text(64, 67, (p.directAirport?.name || "ENTER IDENTIFIER").slice(0, 25), 10) + text(64, 88, p.directAirport ? "PORTUGAL · LOCAL WPT" : "WAYPOINT NOT FOUND", 8, "#9fd6ed");
      body += rect(142, 94, 91, 17, s.gnsDirectConfirm ? "#254e91" : "#000") + text(188, 106, "Activate?", 11, s.gnsDirectConfirm ? "#b7ffff" : "#a5f799", "middle");
      return body;
    }
    if (s.gnsSpecialPage === "MSG") return list("MESSAGES", [s.message || "NO MESSAGES"]);
    if (s.gnsSpecialPage === "PROC") return list("PROCEDURES", ["Select Approach?", "Select Arrival?", "Select Departure?"], s.gnsFieldIndex);
    if (s.gnsSpecialPage === "FPL") {
      if (s.gnsDetail === "FPL ADD") return title("ADD WAYPOINT") + text(64, 26, "IDENT", 8, "#fff") + rect(64, 30, 94, 20, "#173969") + text(64, 70, (p.directAirport?.name || "WAYPOINT NOT FOUND").slice(0, 25), 9) + text(64, 102, "ENT: INSERT INTO PLAN", 9, "#fff");
      let body = title("ACTIVE FLIGHT PLAN") + text(64, 25, "WAYPOINT   DIS   DTK", 8, "#fff");
      const start = Math.max(0, s.gnsFieldIndex - 4);
      s.gnsFlightPlan.slice(start, start + 5).forEach((id, i) => {
        const point = p.waypoints[id];
        if (start + i === s.gnsFieldIndex) body += rect(60, 29 + i * 15, 175, 14, "#173f78", "#7dd3f3");
        body += text(63, 39 + i * 15, id, 11) + text(180, 39 + i * 15, point?.distance.toFixed(1) || "---", 9, "#a5f799", "end") + text(229, 39 + i * 15, point ? p.heading(point.bearing) : "---", 9, "#a5f799", "end");
      });
      return body;
    }
    return "";
  }

  function render(p) {
    const s = p.state;
    let body = s.gnsSpecialPage ? special(p) : s.gnsGroup === "NAV" ? nav(p) : s.gnsGroup === "WPT" ? wpt(p) : s.gnsGroup === "AUX" ? aux(p) : list("NEAREST " + p.page, p.nearest.length ? p.nearest.map(point => `${point.id.padEnd(5)} ${p.heading(point.bearing)}° ${point.distance.toFixed(1)}NM`) : ["LOCAL DATABASE", "NOT AVAILABLE"], s.gnsCursor ? s.gnsFieldIndex : -1);
    const radio = rect(1, 1, 53, 40, "url(#gns-radio-blue)") + text(3, 9, "COM", 8, "#76d3f8") + rect(1, 45, 53, 41, "url(#gns-radio-blue)") + text(3, 54, "VLOC", 8, "#76d3f8") + rect(1, 99, 53, 14, "#215d2e") + text(27, 110, s.source === "GPS" ? "ENR" : p.flag, 11, "#a4fb91", "middle") + text(4, 126, s.source, 10, "#92ecad");
    const input = (target, role, value) => `<input class="gns-frequency-input gns-live-radio-input gns-live-${target.toLowerCase()}-${role}${s.tuningTarget === target && role === "standby" ? " is-selected" : ""}" data-gns-frequency-target="${target}" data-gns-frequency-role="${role}" value="${target === "COM" ? value.toFixed(3) : value.toFixed(2)}" inputmode="decimal" autocomplete="off" spellcheck="false" maxlength="7" aria-label="Frequência ${target} ${role === "active" ? "ativa" : "standby"}">`;
    let overlay = input("COM", "active", s.comActive) + input("COM", "standby", s.comStandby) + input("VLOC", "active", s.vlocActive) + input("VLOC", "standby", s.vlocStandby);
    if (s.gnsSpecialPage === "DIRECT" || s.gnsDetail === "FPL ADD") overlay += `<input id="av-gns-ident-input" class="gns-live-ident" value="${escape(s.directEntry)}" maxlength="5" autocomplete="off" spellcheck="false" aria-label="Identificador do waypoint">`;
    if (s.gnsMenu) {
      const items = p.menu;
      const height = 15 + Math.min(items.length, 7) * 12, top = Math.max(14, 114 - height);
      body += rect(60, top, 176, height, "#092754", "#90dbea") + text(148, top + 10, "PAGE MENU", 8, "#fff", "middle");
      items.slice(0, 7).forEach((item, i) => {
        const y = top + 24 + i * 12;
        if (i === s.gnsMenuIndex) body += rect(63, y - 9, 170, 11, "#2d5899", "#90f8ff");
        body += text(66, y, item.label, 8, item.disabled ? "#7e98ac" : "#bef4ff");
        overlay += `<button type="button" class="gns-live-menu-hit" data-gns-menu-choice="${i}" style="top:${(y - 9) / 128 * 100}%;height:${11 / 128 * 100}%" ${item.disabled ? "disabled" : ""}>${escape(item.label)}</button>`;
      });
    }
    const footer = rect(56, 116, 182, 11, "#102754") + text(61, 124, s.obsMode ? "OBS" : s.gnsCursor ? "CRSR" : "", 7, "#abfdff") + text(125, 124, s.gnsSpecialPage || s.gnsGroup, 7, "#baf5ff") + p.pages.map((_, i) => rect(151 + i * 7, 120, 4, 4, i === s.gnsPageIndex ? "#dbffff" : "#32537d", "#92ddf7")).join("");
    return `<div class="gns-live-display"><svg class="gns-live-svg" viewBox="0 0 240 128" preserveAspectRatio="xMidYMid meet" role="img" aria-label="GNS ${s.gnsModel.toUpperCase()} · ${escape(s.gnsSpecialPage || p.page)} · ${s.source} · ${escape(s.waypoint)}"><defs><linearGradient id="gns-radio-blue" x2="0" y2="1"><stop stop-color="#2464b0"/><stop offset="1" stop-color="#163764"/></linearGradient></defs><rect width="240" height="128" fill="#000"/>${radio}${body}${footer}</svg>${overlay}</div>`;
  }

  function init(onReady) {
    const url = document.getElementById("av-gns-controls")?.dataset.mapUrl;
    if (!url) return;
    fetch(url).then(response => {
      if (!response.ok) throw new Error("Geography unavailable");
      return response.json();
    }).then(data => { geography = data; onReady(); }).catch(() => { geography = null; });
  }
  global.MyFlyGnsDisplay = { render, init, geography: () => geography };
})(window);
