const NAV_NM_PER_RAD = 3440.065;
const NAV_DEFAULT_CENTER = [41.25, -8.0];

let navMap = null;
let navLine = null;
let navMarkers = [];
let navReferenceMarkers = [];
let navMode = "route";
let navLegAltitudes = {};

function navToRad(value) {
  return Number(value) * Math.PI / 180;
}

function navToDeg(value) {
  return Number(value) * 180 / Math.PI;
}

function navNormalizeHeading(value) {
  const heading = ((Math.round(value) % 360) + 360) % 360;
  return heading === 0 ? 360 : heading;
}

function navDistanceNm(a, b) {
  const lat1 = navToRad(a.lat);
  const lat2 = navToRad(b.lat);
  const dLat = navToRad(b.lat - a.lat);
  const dLon = navToRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * NAV_NM_PER_RAD * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function navBearingDeg(a, b) {
  const lat1 = navToRad(a.lat);
  const lat2 = navToRad(b.lat);
  const dLon = navToRad(b.lng - a.lng);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return navNormalizeHeading(navToDeg(Math.atan2(y, x)));
}

function navFmt(value, digits = 1) {
  return Number(value).toLocaleString("pt-PT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function navSetText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function navEscapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function navGetRoutePoints() {
  return navMarkers.map((marker) => marker.getLatLng());
}

function navComputeLegs() {
  const pts = navGetRoutePoints();
  const legs = [];
  for (let i = 1; i < pts.length; i += 1) {
    const from = pts[i - 1];
    const to = pts[i];
    legs.push({
      index: i,
      nm: navDistanceNm(from, to),
      heading: navBearingDeg(from, to),
    });
  }
  return legs;
}

function navFormatMinutes(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return "--";
  const rounded = Math.round(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (hours <= 0) return `${minutes} min`;
  return `${hours} h ${String(minutes).padStart(2, "0")} min`;
}

function navGetVfrDirection(heading) {
  return heading >= 90 && heading <= 269 ? "south" : "north";
}

function navCheckVfrAltitude(heading, rawAltitude) {
  const value = String(rawAltitude || "").trim();
  if (!value) {
    return { cls: "empty", text: "manual" };
  }

  const altitude = Number(value);
  if (!Number.isFinite(altitude) || altitude <= 0) {
    return { cls: "bad", text: "inválida" };
  }

  const direction = navGetVfrDirection(heading);
  const thousands = Math.floor(altitude / 1000);
  const remainder = altitude % 1000;
  const hasVfr500 = remainder === 500;
  const parityOk = direction === "south" ? thousands % 2 === 1 : thousands % 2 === 0;

  if (hasVfr500 && parityOk) {
    return { cls: "ok", text: direction === "south" ? "OK sul ímpar +500" : "OK norte par +500" };
  }

  return {
    cls: "bad",
    text: direction === "south" ? "sul: ímpar +500" : "norte: par +500",
  };
}

function navUpdateE6B() {
  const nm = parseFloat(document.getElementById("nav-e6b-nm")?.value || "0");
  const speed = parseFloat(document.getElementById("nav-e6b-speed")?.value || "0");
  const gph = parseFloat(document.getElementById("nav-e6b-gph")?.value || "0");
  const reserveMin = parseFloat(document.getElementById("nav-e6b-reserve")?.value || "0");
  const meters = parseFloat(document.getElementById("nav-e6b-meters")?.value || "0");
  const timeMin = speed > 0 ? (nm / speed) * 60 : NaN;
  const fuel = Number.isFinite(timeMin) ? (timeMin / 60) * gph : NaN;
  const reserveFuel = gph > 0 ? (reserveMin / 60) * gph : 0;
  const feet = Number.isFinite(meters) ? meters * 3.28084 : NaN;

  navSetText("nav-e6b-time", Number.isFinite(timeMin) ? navFormatMinutes(timeMin) : "--");
  navSetText("nav-e6b-fuel", Number.isFinite(fuel) ? `${navFmt(fuel, 1)} gal` : "--");
  navSetText(
    "nav-e6b-fuel-reserve",
    Number.isFinite(fuel) ? `${navFmt(fuel + reserveFuel, 1)} gal` : "--"
  );
  navSetText("nav-e6b-feet", Number.isFinite(feet) ? `${navFmt(feet, 0)} ft` : "--");
}

function navSyncDistanceToE6B(totalNm) {
  const input = document.getElementById("nav-e6b-nm");
  if (!input) return;
  input.value = totalNm.toFixed(1);
  navUpdateE6B();
}

function navRenderRoute() {
  if (!navMap || !navLine) return;
  const pts = navGetRoutePoints();
  navLine.setLatLngs(pts);

  navMarkers.forEach((marker, idx) => {
    marker.bindTooltip(String(idx + 1), {
      permanent: true,
      direction: "top",
      offset: [0, -8],
      className: "nav-point-label",
    });
  });

  const legs = navComputeLegs();
  const totalNm = legs.reduce((sum, leg) => sum + leg.nm, 0);
  const body = document.getElementById("nav-legs-body");
  if (body) {
    body.innerHTML = legs.length
      ? legs.map((leg) => `
          <tr>
            <td>${leg.index} -> ${leg.index + 1}</td>
            <td>${navFmt(leg.nm, 1)}</td>
            <td>${String(leg.heading).padStart(3, "0")} deg</td>
            <td>${navRenderAltitudeCell(leg)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="4" class="note">Adiciona pelo menos dois pontos.</td></tr>`;
  }

  navSetText("nav-total-nm", `${navFmt(totalNm, 1)} NM`);
  navSetText("nav-leg-count", String(legs.length));
  navSyncDistanceToE6B(totalNm);
}

function navRenderAltitudeCell(leg) {
  const value = navLegAltitudes[leg.index] || "";
  const check = navCheckVfrAltitude(leg.heading, value);
  return `
    <label class="nav-altitude-cell">
      <input
        class="select nav-altitude-input"
        type="number"
        min="500"
        step="500"
        inputmode="numeric"
        value="${navEscapeHtml(value)}"
        data-nav-leg-altitude="${leg.index}"
        aria-label="Altitude VFR da perna ${leg.index}"
      >
      <span class="nav-altitude-status ${check.cls}">${check.text}</span>
    </label>
  `;
}

function navHandleAltitudeInput(event) {
  const input = event.target.closest("[data-nav-leg-altitude]");
  if (!input) return;
  const legIndex = input.getAttribute("data-nav-leg-altitude");
  navLegAltitudes[legIndex] = input.value;
  const row = input.closest("tr");
  const headingText = row?.children?.[2]?.textContent || "";
  const heading = Number((headingText.match(/\d+/) || [0])[0]);
  const check = navCheckVfrAltitude(heading, input.value);
  const status = row?.querySelector(".nav-altitude-status");
  if (status) {
    status.className = `nav-altitude-status ${check.cls}`;
    status.textContent = check.text;
  }
}

function navAddPoint(latlng) {
  if (!navMap || !window.L) return;
  const marker = L.marker(latlng, { draggable: true }).addTo(navMap);
  marker.on("drag", navRenderRoute);
  marker.on("dragend", navRenderRoute);
  navMarkers.push(marker);
  navRenderRoute();
}

function navRenderReferences() {
  const list = document.getElementById("nav-references-list");
  if (!list) return;
  if (!navReferenceMarkers.length) {
    list.innerHTML = `<p class="note">Sem pontos de referência.</p>`;
    return;
  }
  list.innerHTML = navReferenceMarkers.map((item, idx) => {
    const ll = item.marker.getLatLng();
    return `
      <div class="nav-reference-item">
        <strong>${idx + 1}. ${navEscapeHtml(item.title)}</strong>
        ${item.note ? `<span>${navEscapeHtml(item.note)}</span>` : ""}
        <small>${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}</small>
      </div>
    `;
  }).join("");
}

function navAddReference(latlng) {
  if (!navMap || !window.L) return;
  const next = navReferenceMarkers.length + 1;
  const title = window.prompt("Nome do ponto de referência:", `Ref ${next}`);
  if (title === null) return;
  const note = window.prompt("Nota curta:", "") || "";
  const safeTitle = title.trim() || `Ref ${next}`;
  const marker = L.marker(latlng, {
    draggable: true,
    icon: L.divIcon({
      className: "nav-reference-marker",
      html: `<span>${next}</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),
  }).addTo(navMap);
  marker.bindPopup(`<strong>${navEscapeHtml(safeTitle)}</strong><br>${navEscapeHtml(note)}`);
  marker.on("dragend", navRenderReferences);
  navReferenceMarkers.push({ marker, title: safeTitle, note });
  navRenderReferences();
}

function navRenderReferencesEditable() {
  const list = document.getElementById("nav-references-list");
  if (!list) return;
  if (!navReferenceMarkers.length) {
    list.innerHTML = `<p class="note">Sem pontos de referência.</p>`;
    return;
  }
  list.innerHTML = navReferenceMarkers.map((item, idx) => {
    const ll = item.marker.getLatLng();
    return `
      <div class="nav-reference-item" data-nav-reference="${item.id}">
        <label class="fpl-field">Ponto ${idx + 1}
          <input
            class="select nav-reference-title"
            type="text"
            value="${navEscapeHtml(item.title)}"
            data-nav-reference-title="${item.id}"
          >
        </label>
        <label class="fpl-field">Observações
          <textarea
            class="select nav-reference-note"
            rows="3"
            data-nav-reference-note="${item.id}"
          >${navEscapeHtml(item.note)}</textarea>
        </label>
        <div class="nav-reference-print">
          <strong>${idx + 1}. ${navEscapeHtml(item.title)}</strong>
          <span>${item.note ? navEscapeHtml(item.note) : "Sem observações."}</span>
        </div>
        <small>${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}</small>
      </div>
    `;
  }).join("");
}

function navUpdateReferencePopup(item) {
  const note = item.note ? navEscapeHtml(item.note) : "Sem observações.";
  item.marker.bindPopup(`<strong>${navEscapeHtml(item.title)}</strong><br>${note}`);
}

navRenderReferences = navRenderReferencesEditable;

navAddReference = function navAddReferenceEditable(latlng) {
  if (!navMap || !window.L) return;
  const next = navReferenceMarkers.length + 1;
  const id = `ref-${Date.now()}-${next}`;
  const title = `Ref ${next}`;
  const note = "";
  const marker = L.marker(latlng, {
    draggable: true,
    icon: L.divIcon({
      className: "nav-reference-marker",
      html: `<span>${next}</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),
  }).addTo(navMap);
  navReferenceMarkers.push({ id, marker, title, note });
  navUpdateReferencePopup(navReferenceMarkers[navReferenceMarkers.length - 1]);
  marker.on("dragend", navRenderReferences);
  navRenderReferences();
};

function navHandleReferenceInput(event) {
  const titleInput = event.target.closest("[data-nav-reference-title]");
  const noteInput = event.target.closest("[data-nav-reference-note]");
  const input = titleInput || noteInput;
  if (!input) return;

  const id = input.getAttribute(titleInput ? "data-nav-reference-title" : "data-nav-reference-note");
  const item = navReferenceMarkers.find((ref) => ref.id === id);
  if (!item) return;

  if (titleInput) {
    item.title = titleInput.value.trim() || "Ref";
  } else {
    item.note = noteInput.value.trim();
  }
  const box = input.closest(".nav-reference-item");
  const printTitle = box?.querySelector(".nav-reference-print strong");
  const printNote = box?.querySelector(".nav-reference-print span");
  if (printTitle) {
    const index = navReferenceMarkers.findIndex((ref) => ref.id === id) + 1;
    printTitle.textContent = `${index}. ${item.title}`;
  }
  if (printNote) printNote.textContent = item.note || "Sem observações.";
  navUpdateReferencePopup(item);
}

function navRenderReferencesAdvanced() {
  const list = document.getElementById("nav-references-list");
  if (!list) return;
  if (!navReferenceMarkers.length) {
    list.innerHTML = `<p class="note">Sem pontos de referência.</p>`;
    return;
  }
  list.innerHTML = navReferenceMarkers.map((item, idx) => {
    const ll = item.marker.getLatLng();
    return `
      <div class="nav-reference-item" data-nav-reference="${item.id}">
        <label class="fpl-field">Ponto ${idx + 1}
          <input
            class="select nav-reference-title"
            type="text"
            value="${navEscapeHtml(item.title)}"
            data-nav-reference-title="${item.id}"
          >
        </label>
        <label class="fpl-field">Altitude opcional
          <input
            class="select nav-reference-altitude"
            type="text"
            inputmode="numeric"
            placeholder="ex: 2500 ft"
            value="${navEscapeHtml(item.altitude || "")}"
            data-nav-reference-altitude="${item.id}"
          >
        </label>
        <label class="fpl-field">Observações
          <textarea
            class="select nav-reference-note"
            rows="3"
            data-nav-reference-note="${item.id}"
          >${navEscapeHtml(item.note)}</textarea>
        </label>
        <div class="nav-reference-actions">
          <button class="btn" type="button" data-nav-reference-up="${item.id}" ${idx === 0 ? "disabled" : ""}>Subir</button>
          <button class="btn" type="button" data-nav-reference-down="${item.id}" ${idx === navReferenceMarkers.length - 1 ? "disabled" : ""}>Descer</button>
          <button class="btn nav-danger" type="button" data-nav-reference-delete="${item.id}">Eliminar</button>
        </div>
        <div class="nav-reference-print">
          <strong>${idx + 1}. ${navEscapeHtml(item.title)}</strong>
          <em>${item.altitude ? `Altitude: ${navEscapeHtml(item.altitude)}` : ""}</em>
          <span>${item.note ? navEscapeHtml(item.note) : "Sem observações."}</span>
        </div>
        <small>${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}</small>
      </div>
    `;
  }).join("");
}

function navUpdateReferencePopupAdvanced(item) {
  const altitude = item.altitude ? `<br>Altitude: ${navEscapeHtml(item.altitude)}` : "";
  const note = item.note ? navEscapeHtml(item.note) : "Sem observações.";
  item.marker.bindPopup(`<strong>${navEscapeHtml(item.title)}</strong>${altitude}<br>${note}`);
}

function navRefreshReferenceMarkerLabels() {
  navReferenceMarkers.forEach((item, idx) => {
    item.marker.setIcon(L.divIcon({
      className: "nav-reference-marker",
      html: `<span>${idx + 1}</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }));
    navUpdateReferencePopupAdvanced(item);
  });
}

navRenderReferences = navRenderReferencesAdvanced;
navUpdateReferencePopup = navUpdateReferencePopupAdvanced;

navAddReference = function navAddReferenceAdvanced(latlng) {
  if (!navMap || !window.L) return;
  const next = navReferenceMarkers.length + 1;
  const id = `ref-${Date.now()}-${next}`;
  const marker = L.marker(latlng, {
    draggable: true,
    icon: L.divIcon({
      className: "nav-reference-marker",
      html: `<span>${next}</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),
  }).addTo(navMap);
  navReferenceMarkers.push({ id, marker, title: `Ref ${next}`, note: "", altitude: "" });
  navUpdateReferencePopup(navReferenceMarkers[navReferenceMarkers.length - 1]);
  marker.on("dragend", navRenderReferences);
  navRenderReferences();
};

navHandleReferenceInput = function navHandleReferenceInputAdvanced(event) {
  const titleInput = event.target.closest("[data-nav-reference-title]");
  const noteInput = event.target.closest("[data-nav-reference-note]");
  const altitudeInput = event.target.closest("[data-nav-reference-altitude]");
  const input = titleInput || noteInput || altitudeInput;
  if (!input) return;

  const attr = titleInput
    ? "data-nav-reference-title"
    : noteInput
    ? "data-nav-reference-note"
    : "data-nav-reference-altitude";
  const id = input.getAttribute(attr);
  const item = navReferenceMarkers.find((ref) => ref.id === id);
  if (!item) return;

  if (titleInput) item.title = titleInput.value.trim() || "Ref";
  if (noteInput) item.note = noteInput.value.trim();
  if (altitudeInput) item.altitude = altitudeInput.value.trim();
  const box = input.closest(".nav-reference-item");
  const index = navReferenceMarkers.findIndex((ref) => ref.id === id) + 1;
  const printTitle = box?.querySelector(".nav-reference-print strong");
  const printAltitude = box?.querySelector(".nav-reference-print em");
  const printNote = box?.querySelector(".nav-reference-print span");
  if (printTitle) printTitle.textContent = `${index}. ${item.title}`;
  if (printAltitude) printAltitude.textContent = item.altitude ? `Altitude: ${item.altitude}` : "";
  if (printNote) printNote.textContent = item.note || "Sem observações.";
  navUpdateReferencePopup(item);
};

function navMoveReference(id, direction) {
  const idx = navReferenceMarkers.findIndex((ref) => ref.id === id);
  if (idx < 0) return;
  const next = idx + direction;
  if (next < 0 || next >= navReferenceMarkers.length) return;
  const [item] = navReferenceMarkers.splice(idx, 1);
  navReferenceMarkers.splice(next, 0, item);
  navRefreshReferenceMarkerLabels();
  navRenderReferences();
}

function navDeleteReference(id) {
  const idx = navReferenceMarkers.findIndex((ref) => ref.id === id);
  if (idx < 0) return;
  navReferenceMarkers[idx].marker.remove();
  navReferenceMarkers.splice(idx, 1);
  navRefreshReferenceMarkerLabels();
  navRenderReferences();
}

function navHandleReferenceAction(event) {
  const upBtn = event.target.closest("[data-nav-reference-up]");
  const downBtn = event.target.closest("[data-nav-reference-down]");
  const deleteBtn = event.target.closest("[data-nav-reference-delete]");
  if (upBtn) navMoveReference(upBtn.getAttribute("data-nav-reference-up"), -1);
  if (downBtn) navMoveReference(downBtn.getAttribute("data-nav-reference-down"), 1);
  if (deleteBtn) navDeleteReference(deleteBtn.getAttribute("data-nav-reference-delete"));
}

function navClearRoute() {
  if (!navMap) return;
  navMarkers.forEach((marker) => marker.remove());
  navMarkers = [];
  navLegAltitudes = {};
  navRenderRoute();
}

function navClearReferences() {
  navReferenceMarkers.forEach((item) => item.marker.remove());
  navReferenceMarkers = [];
  navRenderReferences();
}

function navUndoPoint() {
  const marker = navMarkers.pop();
  if (marker) marker.remove();
  Object.keys(navLegAltitudes).forEach((key) => {
    if (Number(key) >= navMarkers.length) delete navLegAltitudes[key];
  });
  navRenderRoute();
}

function navFitRoute() {
  if (!navMap || !window.L) return;
  const layers = navMarkers.concat(navReferenceMarkers.map((item) => item.marker));
  if (!layers.length) return;
  const group = L.featureGroup(layers);
  navMap.fitBounds(group.getBounds().pad(0.25));
}

function navSetMode(mode) {
  navMode = mode === "reference" ? "reference" : "route";
  document.getElementById("nav-mode-route")?.classList.toggle("active", navMode === "route");
  document.getElementById("nav-mode-reference")?.classList.toggle("active", navMode === "reference");
}

let navPrintCleanupTimer = null;
let navLastPdfUrl = null;

function navSetPrintStatus(message) {
  const status = document.getElementById("nav-print-status");
  if (status) status.textContent = message;
}

function navSetPrintStatusHtml(html) {
  const status = document.getElementById("nav-print-status");
  if (status) status.innerHTML = html;
}

function navCollectPdfPayload() {
  const legs = navComputeLegs().map((leg) => {
    const altitude = navLegAltitudes[leg.index] || "";
    const check = navCheckVfrAltitude(leg.heading, altitude);
    return {
      label: `${leg.index} -> ${leg.index + 1}`,
      nm: navFmt(leg.nm, 1),
      heading: `${String(leg.heading).padStart(3, "0")} deg`,
      altitude,
      altitude_status: altitude ? check.text : "",
    };
  });

  return {
    legs,
    e6b: {
      nm: document.getElementById("nav-e6b-nm")?.value
        ? `${document.getElementById("nav-e6b-nm").value} NM`
        : "-",
      time: document.getElementById("nav-e6b-time")?.textContent || "-",
      fuel: document.getElementById("nav-e6b-fuel")?.textContent || "-",
      fuel_reserve: document.getElementById("nav-e6b-fuel-reserve")?.textContent || "-",
      feet: document.getElementById("nav-e6b-feet")?.textContent || "-",
    },
    references: navReferenceMarkers.map((item) => {
      const ll = item.marker.getLatLng();
      return {
        title: item.title,
        altitude: item.altitude || "",
        note: item.note || "",
        lat: ll.lat.toFixed(5),
        lng: ll.lng.toFixed(5),
      };
    }),
  };
}

function navDownloadBlob(blob, filename) {
  if (navLastPdfUrl) URL.revokeObjectURL(navLastPdfUrl);
  const url = URL.createObjectURL(blob);
  navLastPdfUrl = url;
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  navSetPrintStatusHtml(
    `PDF pronto. <a class="nav-download-link" href="${url}" download="${filename}" target="_blank" rel="noopener">Descarregar PDF</a>`
  );
}

function navCleanupPrintMode() {
  document.body.classList.remove("printing-navigation");
  if (navPrintCleanupTimer) {
    clearTimeout(navPrintCleanupTimer);
    navPrintCleanupTimer = null;
  }
  navSetPrintStatus("Report pronto. Usa Guardar PDF para exportar novamente.");
}

async function navPrintPdf() {
  ensureNavigationReady();
  navRenderReferences();
  navSetPrintStatus("A gerar PDF...");

  try {
    const response = await fetch("/api/navigation/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(navCollectPdfPayload()),
    });
    if (!response.ok) throw new Error(`PDF ${response.status}`);
    const blob = await response.blob();
    navDownloadBlob(blob, "myflyapp-navegacao.pdf");
  } catch (_err) {
    document.body.classList.add("printing-navigation");
    navSetPrintStatus("Download falhou. A abrir impressão como alternativa.");

    window.removeEventListener("afterprint", navCleanupPrintMode);
    window.addEventListener("afterprint", navCleanupPrintMode, { once: true });
    navPrintCleanupTimer = setTimeout(navCleanupPrintMode, 120000);
    document.body.offsetHeight;
    try {
      window.print();
    } catch (_printErr) {
      navCleanupPrintMode();
      navSetPrintStatus("Não foi possível gerar PDF neste browser.");
    }
  }
}

function navSeedAerodromes() {
  const aerodromes = Array.isArray(window.AERODROMES) ? window.AERODROMES : [];
  aerodromes.forEach((ad) => {
    if (!Number.isFinite(Number(ad.lat)) || !Number.isFinite(Number(ad.lon))) return;
    L.circleMarker([ad.lat, ad.lon], {
      radius: 5,
      color: "#f59e0b",
      fillColor: "#f59e0b",
      fillOpacity: 0.75,
      weight: 1,
    })
      .addTo(navMap)
      .bindPopup(`<strong>${ad.icao}</strong><br>${ad.name || ""}<br>${ad.main_freq || ""}`);
  });
}

function initNavigation() {
  const mapEl = document.getElementById("nav-map");
  if (!mapEl || !window.L || navMap) return;

  navMap = L.map("nav-map").setView(NAV_DEFAULT_CENTER, 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(navMap);
  navLine = L.polyline([], { color: "#f59e0b", weight: 4, opacity: 0.95 }).addTo(navMap);
  navSeedAerodromes();

  navMap.on("click", (event) => {
    if (navMode === "reference") {
      navAddReference(event.latlng);
      return;
    }
    navAddPoint(event.latlng);
  });
  document.getElementById("nav-clear-route")?.addEventListener("click", navClearRoute);
  document.getElementById("nav-undo-point")?.addEventListener("click", navUndoPoint);
  document.getElementById("nav-fit-route")?.addEventListener("click", navFitRoute);
  document.getElementById("nav-clear-references")?.addEventListener("click", navClearReferences);
  document.getElementById("nav-mode-route")?.addEventListener("click", () => navSetMode("route"));
  document.getElementById("nav-mode-reference")?.addEventListener("click", () => navSetMode("reference"));
  document.getElementById("nav-print-pdf")?.addEventListener("click", navPrintPdf);
  document.getElementById("nav-legs-body")?.addEventListener("input", navHandleAltitudeInput);
  document.getElementById("nav-references-list")?.addEventListener("input", navHandleReferenceInput);
  document.getElementById("nav-references-list")?.addEventListener("click", navHandleReferenceAction);
  ["nav-e6b-nm", "nav-e6b-speed", "nav-e6b-gph", "nav-e6b-reserve", "nav-e6b-meters"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", navUpdateE6B);
  });
  navSetMode("route");
  navRenderReferences();
  navUpdateE6B();
}

function ensureNavigationReady() {
  initNavigation();
  if (navMap) setTimeout(() => navMap.invalidateSize(), 120);
}

window.MyFlyNavigation = {
  ensureReady: ensureNavigationReady,
};

document.addEventListener("DOMContentLoaded", initNavigation);
