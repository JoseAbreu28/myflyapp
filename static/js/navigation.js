const NAV_NM_PER_RAD = 3440.065;
const NAV_DEFAULT_CENTER = [41.25, -8.0];

let navMap = null;
let navLine = null;
let navMarkers = [];
let navLegLabelLayer = null;
let navAlternateMarker = null;
let navAlternate = null;
let navReferenceMarkers = [];
let navMode = "route";
let navLegAltitudes = {};
let navLanguage = "pt";
let navSimMap = null;
let navSimRouteLine = null;
let navSimDirectLine = null;
let navSimPlaneMarker = null;
let navSimTargetMarker = null;
let navSimHsi = null;
let navSimRmi = null;
let navSimVor = null;
let navSimRoute = [];
let navSimLegs = [];
let navSimTotalNm = 0;
let navSimDistanceNm = 0;
let navSimElapsedSeconds = 0;
let navSimPlaying = false;
let navSimFrame = null;
let navSimLastFrameTime = null;
let navSimRouteSignature = "";

const NAV_I18N = {
  pt: {
    nav_help: "Modo Rota: clica para adicionar pernas. Breaking point: clica na linha/mapa para inserir um ponto intermédio no segmento mais próximo. Alternate: escolhe na lista ou clica no mapa para definir o alternante. Modo Referência: marca locais visuais, obstáculos, pontos de viragem ou notas. Arrasta os marcadores para ajustar.",
    alternate_title: "Alternate Aerodrome",
    alternate_select: "Selecionar aeródromo",
    alternate_nm_label: "Distância alternante",
    alternate_fuel_label: "Fuel alternante",
    alternate_none: "Sem alternate definido.",
    alternate_need_route: "Define primeiro pelo menos um ponto de destino na rota.",
    alternate_manual: "Alternate manual",
    pdf_ready: "Report pronto para exportar.",
  },
  en: {
    nav_help: "Route mode: click to add route legs. Breaking point: click on/near the line to insert an intermediate point in the nearest segment. Alternate: choose from the list or click the map to set the alternate. Reference mode: mark visual references, obstacles, turning points or notes. Drag markers to adjust.",
    alternate_title: "Alternate Aerodrome",
    alternate_select: "Select aerodrome",
    alternate_nm_label: "Alternate distance",
    alternate_fuel_label: "Alternate fuel",
    alternate_none: "No alternate selected.",
    alternate_need_route: "Create at least one destination point in the route first.",
    alternate_manual: "Manual alternate",
    pdf_ready: "Report ready to export.",
  },
};

Object.assign(NAV_I18N.pt, {
  app_title: "MyFlyApp",
  tab_dashboard: "Dashboard",
  tab_flightplan: "Plano de voo",
  tab_navigation: "Navegações",
  tab_massbalance: "Massa & Balanceamento",
  freq_title: "Frequências",
  freq_warning: "Aviso: frequências informativas e podem não estar atualizadas.",
  atis_selected: "ATIS (aeroporto selecionado)",
  custom_icao: "ICAO manual",
  view_btn: "Ver",
  wind_label: "Vento",
  visibility_label: "Visibilidade",
  ceiling_label: "Teto",
  quick_box_title: "Caixa rápida METAR / TAF",
  airport_label: "Aeroporto",
  source_weather: "Fonte: aviationweather.gov API via proxy Flask local (`/api/metar/<icao>` e `/api/taf/<icao>`).",
  fly_data_title: "Fly DATA",
  weather_map_title: "Mapa meteorológico (Windy)",
  notam_map_title: "Mapa NOTAM",
  notam_embed_unavailable: "NOTAM indisponível no embed",
  open_notam_viewer: "Abrir visualizador NOTAM",
  flyweather_cameras_title: "Câmaras Flyweather (LPVL)",
  open_flyweather: "Abrir no Flyweather",
  civil_aerodromes_title: "Aeródromos civis de Portugal",
  civil_aerodromes_note: "Clica num marcador para abrir links ADC/VAC e página eAIP.",
  fpl_preflight_tab: "Pré-voo",
  fpl_create_tab: "Criar plano",
  preflight_title: "Painel pré-voo",
  preflight_note: "Mapas de apoio para preparar a rota e alternantes.",
  cavok_airspace: "CAVOK espaço aéreo",
  source_label: "Fonte",
  source_by: "Fonte",
  create_plan_title: "Criar plano",
  choose_plane: "Escolher avião",
  circuit_flight: "Voo de circuito",
  dep_aerodrome: "Aeródromo DEP",
  dest_aerodrome: "Aeródromo DEST",
  mission_type: "Tipo de missão",
  wants_notam: "Quer NOTAM?",
  date_dof: "Data (DOF)",
  time_eobt: "Hora (EOBT UTC)",
  narrow_route_width: "Largura da rota (NM)",
  continue_btn: "Continuar",
  local_required_warning: "Esta funcionalidade (PIB / NOTAM via fplbriefing.nav.pt) requer que a app esteja a correr localmente. No site público não funciona.",
  run_pib: "Executar pedido PIB",
  load_route_map: "Carregar mapa da rota",
  open_notam_text: "Abrir texto NOTAM",
  no_requests: "Sem pedidos executados.",
  local_fpl_builder: "Construtor local de plano de voo",
  instructor_required: "Instrutor (obrigatório em voo de instrução)",
  aircraft_id: "7 Identificação da aeronave",
  flight_rules: "8 Regras de voo",
  type_of_flight: "Tipo de voo",
  number_label: "9 Número",
  aircraft_type: "Tipo de aeronave",
  wtc: "Categoria de turbulência",
  radio_equipment: "10a Equipamento rádio",
  surveillance_equipment: "10b Equipamento vigilância",
  departure_aerodrome: "13 Aeródromo de partida",
  eobt_manual: "EOBT (manual HHMM)",
  speed_label: "15 Velocidade",
  level_manual: "Nível (manual ex: A015)",
  route_label: "Rota",
  destination_aerodrome: "16 Aeródromo de destino",
  total_eet: "EET total (manual HHMM)",
  alternate_aerodrome: "Aeródromo alternante",
  second_alternate: "2.º aeródromo alternante",
  other_info: "18 Outras informações (manual)",
  endurance: "19 Autonomia E/ (manual HHMM)",
  pob: "Pessoas a bordo P/",
  emergency_radio: "Rádio emergência R/",
  color_markings: "Cor e marcas da aeronave A/",
  pic: "Piloto comandante C/",
  circuit_note: "Nota: voos de circuito usam LPVL como origem e LPBR como alternante.",
  submit_note: "Submete sempre no portal oficial:",
  submit_fpl: "Submeter em fplbriefing.nav.pt",
  nav_title: "Navegações",
  nav_disclaimer: "Disclaimer: esta ferramenta é apenas um apoio à preparação da navegação. Não substitui a carta aeronáutica oficial, o AIP/eAIP, NOTAM, informação de espaço aéreo, altitudes mínimas, obstáculos, terreno, procedimentos publicados ou briefing operacional. Usa sempre a carta verdadeira e fontes oficiais para informação detalhada.",
  mode_route: "Rota",
  mode_break: "Breaking point",
  mode_alternate: "Alternante",
  mode_reference: "Referência",
  save_pdf: "Guardar PDF",
  simulate_btn: "Simular",
  sim_title: "Simulação da navegação",
  sim_note: "Simulação educativa simplificada; não representa sensores certificados nem substitui treino de voo.",
  sim_close: "Fechar simulação",
  sim_guidance_mode: "Referência dos instrumentos",
  sim_mode_breakpoints: "Próximo breaking point",
  sim_mode_destination: "Só destino final",
  sim_playback_speed: "Velocidade da reprodução",
  sim_play: "▶ Play",
  sim_pause: "❚❚ Pausa",
  sim_reset: "Reiniciar",
  sim_ready: "Pronto para iniciar.",
  sim_need_route: "Cria primeiro uma rota com pelo menos dois pontos.",
  sim_route_changed: "A rota mudou. A simulação foi reiniciada.",
  sim_running: "Em voo: perna {leg}, referência {target}.",
  sim_target_point: "ponto {point}",
  sim_target_destination: "destino final",
  sim_paused: "Simulação em pausa.",
  sim_complete: "Destino alcançado. Simulação concluída.",
  sim_drag_hint: "Arrasta o avião no mapa para avançar ou recuar na simulação.",
  sim_dragging: "Ajusta a posição do avião ao longo da rota.",
  sim_dragged: "Posição ajustada manualmente.",
  sim_drag_aircraft: "Arrastar avião ao longo da rota",
  instrument_lab_title: "Estudo manual de instrumentos",
  instrument_lab_note: "O laboratório começa com um exemplo aleatório. Altera os valores para observar o HSI, RMI e VOR; não usar para navegação real.",
  instrument_heading: "Rumo HDG (°)",
  instrument_course: "Curso CRS (°)",
  instrument_cdi: "CDI (-2 esq. / +2 dir.)",
  instrument_vor_bearing: "Bearing VOR (°)",
  instrument_adf_bearing: "Bearing ADF (°)",
  instrument_obs: "OBS (°)",
  instrument_flag: "Indicador TO/FROM",
  nav_help: "Modo Rota: clica para adicionar pernas. Breaking point: clica na linha/mapa para inserir um ponto intermédio no segmento mais próximo. Alternante: escolhe na lista ou clica no mapa para definir o alternante. Modo Referência: marca locais visuais, obstáculos, pontos de viragem ou notas. Arrasta os marcadores para ajustar.",
  undo_point: "Desfazer ponto",
  clear_route: "Limpar rota",
  fit_route: "Ajustar mapa",
  clear_refs: "Limpar referências",
  show_nm: "Mostrar NM",
  route_title: "Rota",
  route_builder_title: "Rota entre aeródromos",
  route_departure: "Principal / partida",
  route_destination: "Destino",
  route_alternate: "Alternante",
  route_roundtrip: "Ida e volta",
  route_build: "Criar rota",
  route_builder_help: "Escolhe os aeródromos para gerar a rota; depois podes ajustar com breaking points e referências.",
  route_builder_missing: "Escolhe o aeródromo principal e o destino.",
  route_builder_same: "Escolhe aeródromos diferentes para principal e destino.",
  route_built_oneway: "Rota criada: {dep} -> {dest}. Podes agora inserir breaking points e referências.",
  route_built_roundtrip: "Rota ida e volta criada: {dep} -> {dest} -> {dep}. Podes agora inserir breaking points e referências.",
  total_label: "Total",
  legs_label: "Pernas",
  leg_header: "Perna",
  alt_vfr_header: "ALT VFR",
  add_two_points: "Adiciona pelo menos dois pontos.",
  alternate_title: "Aeródromo alternante",
  alternate_select: "Selecionar aeródromo",
  manual_none: "Manual / nenhum",
  alternate_nm_label: "Distância alternante",
  alternate_fuel_label: "Fuel alternante",
  alternate_none: "Sem alternante definido.",
  alternate_need_route: "Define primeiro pelo menos um ponto de destino na rota.",
  alternate_manual: "Alternante manual",
  e6b_title: "E6B rápido",
  distance_nm: "Distância (NM)",
  gs_speed: "Velocidade GS (kt)",
  fuel_burn: "Consumo (gal/h)",
  reserve_min: "Reserva (min)",
  meters_label: "Metros",
  time_label: "Tempo",
  route_fuel: "Combustível rota",
  final_reserve: "Final reserve fuel",
  total_with_alternate: "Total c/ alternante",
  meters_to_ft: "Metros -> ft",
  reference_points: "Pontos de referência",
  no_refs: "Sem pontos de referência.",
  no_observations: "Sem observações.",
  point_label: "Ponto",
  optional_altitude: "Altitude opcional",
  observations: "Observações",
  move_up: "Subir",
  move_down: "Descer",
  delete_btn: "Eliminar",
  altitude_prefix: "Altitude",
  vfr_manual: "manual",
  vfr_invalid: "inválida",
  vfr_south_ok: "OK sul ímpar +500",
  vfr_north_ok: "OK norte par +500",
  vfr_south_rule: "sul: ímpar +500",
  vfr_north_rule: "norte: par +500",
  create_two_route_points: "Cria primeiro pelo menos dois pontos de rota.",
  break_inserted: "Breaking point inserido na rota.",
  pdf_ready: "Relatório pronto para exportar.",
  pdf_download_ready: "PDF pronto.",
  pdf_download_link: "Descarregar PDF",
  pdf_ready_again: "Relatório pronto. Usa Guardar PDF para exportar novamente.",
  pdf_generating: "A gerar PDF...",
  pdf_fallback: "Download falhou. A abrir impressão como alternativa.",
  pdf_error: "Não foi possível gerar PDF neste browser.",
  mb_title: "Massa & Balanceamento",
  mb_note: "Limites, braços e envelope de CG retirados dos POH oficiais (C150 1975, C152 1979, C172M). Combustível em galões US (6 lb/gal), pessoas e bagagem em kg. O peso vazio pré-preenchido é o valor sample do POH; substitui pelos valores reais da ficha de pesagem de cada avião. Ferramenta de apoio; o cálculo oficial é da responsabilidade do piloto.",
  aircraft_label: "Aeronave",
  result_title: "Resultado",
  cg_envelope_title: "Envelope de CG",
  cg_point_note: "Ponto = carga atual. Verde dentro do envelope, vermelho fora.",
  chart_preview: "Pré-visualização da carta",
  notam_text: "Texto NOTAM",
  close_btn: "Fechar",
});

Object.assign(NAV_I18N.en, {
  app_title: "MyFlyApp",
  tab_dashboard: "Dashboard",
  tab_flightplan: "Flight Plan",
  tab_navigation: "Navigation",
  tab_massbalance: "Mass & Balance",
  freq_title: "Frequencies",
  freq_warning: "Warning: frequencies are informational and may not be current.",
  atis_selected: "ATIS (selected airport)",
  custom_icao: "Custom ICAO",
  view_btn: "View",
  wind_label: "Wind",
  visibility_label: "Visibility",
  ceiling_label: "Ceiling",
  quick_box_title: "METAR / TAF Quick Box",
  airport_label: "Airport",
  source_weather: "Source: aviationweather.gov API through the local Flask proxy (`/api/metar/<icao>` and `/api/taf/<icao>`).",
  fly_data_title: "Fly DATA",
  weather_map_title: "Weather Map (Windy)",
  notam_map_title: "NOTAM Map",
  notam_embed_unavailable: "NOTAM embed unavailable",
  open_notam_viewer: "Open NOTAM Viewer",
  flyweather_cameras_title: "Flyweather Cameras (LPVL)",
  open_flyweather: "Open on Flyweather",
  civil_aerodromes_title: "Portugal Civil Aerodromes",
  civil_aerodromes_note: "Click a marker to open ADC/VAC render links and the eAIP page.",
  fpl_preflight_tab: "Pre-flight",
  fpl_create_tab: "Create Plan",
  preflight_title: "Pre-flight Dashboard",
  preflight_note: "Support maps for preparing the route and alternates.",
  cavok_airspace: "CAVOK Airspace",
  source_label: "Source",
  source_by: "Source",
  create_plan_title: "Create Plan",
  choose_plane: "Choose Plane",
  circuit_flight: "Circuit flight",
  dep_aerodrome: "DEP aerodrome",
  dest_aerodrome: "DEST aerodrome",
  mission_type: "Mission type",
  wants_notam: "Need NOTAM?",
  date_dof: "Date (DOF)",
  time_eobt: "Time (EOBT UTC)",
  narrow_route_width: "Narrow Route Width (NM)",
  continue_btn: "Continue",
  local_required_warning: "This feature (PIB / NOTAM through fplbriefing.nav.pt) requires the app to run locally. It does not work on the public site.",
  run_pib: "Run PIB Request",
  load_route_map: "Load Route Map",
  open_notam_text: "Open NOTAM Text",
  no_requests: "No requests run.",
  local_fpl_builder: "Local Flight Plan Builder",
  instructor_required: "Instructor (required for instruction flights)",
  aircraft_id: "7 Aircraft ID",
  flight_rules: "8 Flight Rules",
  type_of_flight: "Type of Flight",
  number_label: "9 Number",
  aircraft_type: "Type of Aircraft",
  wtc: "Wake Turbulence Category",
  radio_equipment: "10a Radio Equipment",
  surveillance_equipment: "10b Surveillance Equipment",
  departure_aerodrome: "13 Departure Aerodrome",
  eobt_manual: "EOBT (manual HHMM)",
  speed_label: "15 Speed",
  level_manual: "Level (manual ex: A015)",
  route_label: "Route",
  destination_aerodrome: "16 Destination Aerodrome",
  total_eet: "Total EET (manual HHMM)",
  alternate_aerodrome: "Alternate Aerodrome",
  second_alternate: "2nd Alternate Aerodrome",
  other_info: "18 Other Information (manual)",
  endurance: "19 Endurance E/ (manual HHMM)",
  pob: "Persons on Board P/",
  emergency_radio: "Emergency Radio R/",
  color_markings: "Aircraft Color and Markings A/",
  pic: "Pilot-in-Command C/",
  circuit_note: "Note: circuit flights use LPVL as departure and LPBR as alternate.",
  submit_note: "Always submit on the official portal:",
  submit_fpl: "Submit on fplbriefing.nav.pt",
  nav_title: "Navigation",
  nav_disclaimer: "Disclaimer: this tool is only a support aid for navigation preparation. It does not replace the official aeronautical chart, AIP/eAIP, NOTAM, airspace information, minimum altitudes, obstacles, terrain, published procedures, or operational briefing. Always use the real chart and official sources for detailed information.",
  mode_route: "Route",
  mode_break: "Breaking point",
  mode_alternate: "Alternate",
  mode_reference: "Reference",
  save_pdf: "Save PDF",
  simulate_btn: "Simulate",
  sim_title: "Navigation simulation",
  sim_note: "Simplified educational simulation; it does not represent certified sensors or replace flight training.",
  sim_close: "Close simulation",
  sim_guidance_mode: "Instrument reference",
  sim_mode_breakpoints: "Next breaking point",
  sim_mode_destination: "Final destination only",
  sim_playback_speed: "Playback speed",
  sim_play: "▶ Play",
  sim_pause: "❚❚ Pause",
  sim_reset: "Reset",
  sim_ready: "Ready to start.",
  sim_need_route: "Create a route with at least two points first.",
  sim_route_changed: "The route changed. The simulation was reset.",
  sim_running: "In flight: leg {leg}, reference {target}.",
  sim_target_point: "point {point}",
  sim_target_destination: "final destination",
  sim_paused: "Simulation paused.",
  sim_complete: "Destination reached. Simulation complete.",
  sim_drag_hint: "Drag the aircraft on the map to move forward or backward in the simulation.",
  sim_dragging: "Adjust the aircraft position along the route.",
  sim_dragged: "Position adjusted manually.",
  sim_drag_aircraft: "Drag aircraft along the route",
  instrument_lab_title: "Manual instrument study",
  instrument_lab_note: "The lab starts with a random example. Change the values to observe the HSI, RMI, and VOR; do not use for real navigation.",
  instrument_heading: "Heading HDG (°)",
  instrument_course: "Course CRS (°)",
  instrument_cdi: "CDI (-2 left / +2 right)",
  instrument_vor_bearing: "VOR bearing (°)",
  instrument_adf_bearing: "ADF bearing (°)",
  instrument_obs: "OBS (°)",
  instrument_flag: "TO/FROM indicator",
  undo_point: "Undo point",
  clear_route: "Clear route",
  fit_route: "Fit route",
  clear_refs: "Clear references",
  show_nm: "Show NM",
  route_title: "Route",
  route_builder_title: "Route between aerodromes",
  route_departure: "Home / departure",
  route_destination: "Destination",
  route_alternate: "Alternate",
  route_roundtrip: "Round trip",
  route_build: "Build route",
  route_builder_help: "Choose the aerodromes to generate the route; then adjust with breaking points and references.",
  route_builder_missing: "Choose the home/departure aerodrome and destination.",
  route_builder_same: "Choose different aerodromes for departure and destination.",
  route_built_oneway: "Route created: {dep} -> {dest}. You can now insert breaking points and references.",
  route_built_roundtrip: "Round trip route created: {dep} -> {dest} -> {dep}. You can now insert breaking points and references.",
  total_label: "Total",
  legs_label: "Legs",
  leg_header: "Leg",
  alt_vfr_header: "VFR ALT",
  add_two_points: "Add at least two points.",
  manual_none: "Manual / none",
  alternate_none: "No alternate selected.",
  alternate_manual: "Manual alternate",
  e6b_title: "Quick E6B",
  distance_nm: "Distance (NM)",
  gs_speed: "GS speed (kt)",
  fuel_burn: "Fuel burn (gal/h)",
  reserve_min: "Reserve (min)",
  meters_label: "Meters",
  time_label: "Time",
  route_fuel: "Route fuel",
  final_reserve: "Final reserve fuel",
  total_with_alternate: "Total with alternate",
  meters_to_ft: "Meters -> ft",
  reference_points: "Reference points",
  no_refs: "No reference points.",
  no_observations: "No observations.",
  point_label: "Point",
  optional_altitude: "Optional altitude",
  observations: "Observations",
  move_up: "Move up",
  move_down: "Move down",
  delete_btn: "Delete",
  altitude_prefix: "Altitude",
  vfr_manual: "manual",
  vfr_invalid: "invalid",
  vfr_south_ok: "OK south odd +500",
  vfr_north_ok: "OK north even +500",
  vfr_south_rule: "south: odd +500",
  vfr_north_rule: "north: even +500",
  create_two_route_points: "Create at least two route points first.",
  break_inserted: "Breaking point inserted in the route.",
  pdf_download_ready: "PDF ready.",
  pdf_download_link: "Download PDF",
  pdf_ready_again: "Report ready. Use Save PDF to export again.",
  pdf_generating: "Generating PDF...",
  pdf_fallback: "Download failed. Opening print as a fallback.",
  pdf_error: "Could not generate a PDF in this browser.",
  mb_title: "Mass & Balance",
  mb_note: "Limits, arms, and CG envelope are taken from the official POH documents (C150 1975, C152 1979, C172M). Fuel in US gallons (6 lb/gal), people and baggage in kg. The pre-filled empty weight is the POH sample value; replace it with the actual weighing sheet values for each aircraft. Support tool only; the official calculation remains the pilot's responsibility.",
  aircraft_label: "Aircraft",
  result_title: "Result",
  cg_envelope_title: "CG Envelope",
  cg_point_note: "Point = current load. Green is inside the envelope, red is outside.",
  chart_preview: "Chart Preview",
  notam_text: "NOTAM Text",
  close_btn: "Close",
});

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

function navT(key) {
  return (NAV_I18N[navLanguage] && NAV_I18N[navLanguage][key]) || NAV_I18N.pt[key] || key;
}

function navTf(key, vars = {}) {
  let text = navT(key);
  Object.entries(vars).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, value);
  });
  return text;
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

function navGetDestinationPoint() {
  return navMarkers.length ? navMarkers[navMarkers.length - 1].getLatLng() : null;
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

function navMidpointLatLng(a, b) {
  return L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
}

function navGetAlternateDistanceNm() {
  const dest = navGetDestinationPoint();
  if (!dest || !navAlternate) return NaN;
  return navDistanceNm(dest, L.latLng(navAlternate.lat, navAlternate.lng));
}

function navRenderAlternateSummary() {
  const detail = document.getElementById("nav-alternate-detail");
  const gph = parseFloat(document.getElementById("nav-e6b-gph")?.value || "0");
  const speed = parseFloat(document.getElementById("nav-e6b-speed")?.value || "0");
  const nm = navGetAlternateDistanceNm();
  const fuel = speed > 0 && gph > 0 && Number.isFinite(nm) ? (nm / speed) * gph : NaN;

  navSetText("nav-alternate-nm", Number.isFinite(nm) ? `${navFmt(nm, 1)} NM` : "--");
  navSetText("nav-alternate-fuel", Number.isFinite(fuel) ? `${navFmt(fuel, 1)} gal` : "--");
  if (!detail) return;

  if (!navAlternate) {
    detail.textContent = navT("alternate_none");
    return;
  }
  if (!navGetDestinationPoint()) {
    detail.textContent = navT("alternate_need_route");
    return;
  }
  const label = navAlternate.icao ? `${navAlternate.icao} - ${navAlternate.name || ""}` : navT("alternate_manual");
  detail.textContent = `${label} · ${navAlternate.lat.toFixed(5)}, ${navAlternate.lng.toFixed(5)}`;
}

function navSetAlternate(alternate) {
  if (!navMap || !window.L) return;
  navAlternate = alternate;
  navSyncAlternateSelects(alternate.icao || "");
  if (navAlternateMarker) navAlternateMarker.remove();
  navAlternateMarker = L.marker([alternate.lat, alternate.lng], {
    draggable: true,
    icon: L.divIcon({
      className: "nav-alternate-marker",
      html: "ALT",
      iconSize: [38, 28],
      iconAnchor: [19, 14],
    }),
  }).addTo(navMap);
  navAlternateMarker.bindPopup(`<strong>${navEscapeHtml(alternate.icao || "ALT")}</strong><br>${navEscapeHtml(alternate.name || navT("alternate_manual"))}`);
  navAlternateMarker.on("dragend", () => {
    const ll = navAlternateMarker.getLatLng();
    navAlternate = { ...navAlternate, lat: ll.lat, lng: ll.lng, icao: navAlternate.icao || "", name: navAlternate.name || navT("alternate_manual") };
    if (navAlternate.icao === "") navSyncAlternateSelects("");
    navUpdateE6B();
  });
  navUpdateE6B();
}

function navPopulateAlternateSelect() {
  const select = document.getElementById("nav-alternate-select");
  if (!select) return;
  const aerodromes = Array.isArray(window.AERODROMES) ? window.AERODROMES : [];
  aerodromes.forEach((ad) => {
    const option = document.createElement("option");
    option.value = ad.icao;
    option.textContent = `${ad.icao} - ${ad.name}`;
    select.appendChild(option);
  });
}

function navSyncAlternateSelects(icao = "") {
  ["nav-alternate-select", "nav-route-alt-select"].forEach((id) => {
    const select = document.getElementById(id);
    if (select) select.value = icao;
  });
}

function navGetAerodrome(icao) {
  const aerodromes = Array.isArray(window.AERODROMES) ? window.AERODROMES : [];
  return aerodromes.find((item) => item.icao === icao) || null;
}

function navAerodromeLatLng(ad) {
  if (!ad) return null;
  const lat = Number(ad.lat);
  const lng = Number(ad.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return L.latLng(lat, lng);
}

function navPopulateAerodromeSelect(select, defaultIcao = "") {
  if (!select) return;
  const aerodromes = Array.isArray(window.AERODROMES) ? window.AERODROMES : [];
  select.innerHTML = "";
  aerodromes.forEach((ad) => {
    const option = document.createElement("option");
    option.value = ad.icao;
    option.textContent = `${ad.icao} - ${ad.name}`;
    select.appendChild(option);
  });
  if (defaultIcao && aerodromes.some((ad) => ad.icao === defaultIcao)) {
    select.value = defaultIcao;
  }
}

function navPopulateRouteBuilderSelects() {
  navPopulateAerodromeSelect(document.getElementById("nav-route-dep-select"), "LPVL");
  navPopulateAerodromeSelect(document.getElementById("nav-route-dest-select"), "LPBR");
  const alternateSelect = document.getElementById("nav-route-alt-select");
  if (alternateSelect) {
    alternateSelect.innerHTML = "";
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.setAttribute("data-i18n", "manual_none");
    emptyOption.textContent = navT("manual_none");
    alternateSelect.appendChild(emptyOption);
    const aerodromes = Array.isArray(window.AERODROMES) ? window.AERODROMES : [];
    aerodromes.forEach((ad) => {
      const option = document.createElement("option");
      option.value = ad.icao;
      option.textContent = `${ad.icao} - ${ad.name}`;
      alternateSelect.appendChild(option);
    });
  }
}

function navSelectAlternateByIcao(icao) {
  const ad = navGetAerodrome(icao);
  if (!ad) return;
  navSetAlternate({ icao: ad.icao, name: ad.name, lat: Number(ad.lat), lng: Number(ad.lon) });
}

function navHandleAlternateSelect(value) {
  if (value) {
    navSelectAlternateByIcao(value);
  } else {
    navClearAlternate();
  }
}

function navSetManualAlternate(latlng) {
  navSyncAlternateSelects("");
  navSetAlternate({ icao: "", name: navT("alternate_manual"), lat: latlng.lat, lng: latlng.lng });
}

function navClearAlternate() {
  if (navAlternateMarker) navAlternateMarker.remove();
  navAlternateMarker = null;
  navAlternate = null;
  navSyncAlternateSelects("");
  navUpdateE6B();
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
    return { cls: "empty", text: navT("vfr_manual") };
  }

  const altitude = Number(value);
  if (!Number.isFinite(altitude) || altitude <= 0) {
    return { cls: "bad", text: navT("vfr_invalid") };
  }

  const direction = navGetVfrDirection(heading);
  const thousands = Math.floor(altitude / 1000);
  const remainder = altitude % 1000;
  const hasVfr500 = remainder === 500;
  const parityOk = direction === "south" ? thousands % 2 === 1 : thousands % 2 === 0;

  if (hasVfr500 && parityOk) {
    return { cls: "ok", text: direction === "south" ? navT("vfr_south_ok") : navT("vfr_north_ok") };
  }

  return {
    cls: "bad",
    text: direction === "south" ? navT("vfr_south_rule") : navT("vfr_north_rule"),
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
  const alternateNm = navGetAlternateDistanceNm();
  const alternateFuel = speed > 0 && gph > 0 && Number.isFinite(alternateNm) ? (alternateNm / speed) * gph : NaN;
  const feet = Number.isFinite(meters) ? meters * 3.28084 : NaN;

  navSetText("nav-e6b-time", Number.isFinite(timeMin) ? navFormatMinutes(timeMin) : "--");
  navSetText("nav-e6b-fuel", Number.isFinite(fuel) ? `${navFmt(fuel, 1)} gal` : "--");
  navSetText("nav-e6b-final-reserve", gph > 0 ? `${navFmt(reserveFuel, 1)} gal` : "--");
  navSetText(
    "nav-e6b-fuel-reserve",
    Number.isFinite(fuel) ? `${navFmt(fuel + (Number.isFinite(alternateFuel) ? alternateFuel : 0) + reserveFuel, 1)} gal` : "--"
  );
  navSetText("nav-e6b-feet", Number.isFinite(feet) ? `${navFmt(feet, 0)} ft` : "--");
  navRenderAlternateSummary();
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
  if (navLegLabelLayer) navLegLabelLayer.clearLayers();

  navMarkers.forEach((marker, idx) => {
    marker.bindTooltip(String(idx + 1), {
      permanent: true,
      direction: "top",
      offset: [0, -8],
      className: "nav-point-label",
    });
  });

  const legs = navComputeLegs();
  const showLegLabels = document.getElementById("nav-show-leg-labels")?.checked;
  if (showLegLabels && navLegLabelLayer) {
    legs.forEach((leg) => {
      const a = pts[leg.index - 1];
      const b = pts[leg.index];
      L.marker(navMidpointLatLng(a, b), {
        interactive: false,
        icon: L.divIcon({
          className: "nav-leg-label",
          html: `${navFmt(leg.nm, 1)} NM`,
          iconSize: [70, 24],
          iconAnchor: [35, 12],
        }),
      }).addTo(navLegLabelLayer);
    });
  }
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
      : `<tr><td colspan="4" class="note">${navT("add_two_points")}</td></tr>`;
  }

  navSetText("nav-total-nm", `${navFmt(totalNm, 1)} NM`);
  navSetText("nav-leg-count", String(legs.length));
  navSyncDistanceToE6B(totalNm);
  navRenderAlternateSummary();
  navUpdateSimulationAvailability();
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
        aria-label="${navT("alt_vfr_header")} ${leg.index}"
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

function navCreateRouteMarker(latlng) {
  if (!navMap || !window.L) return;
  const marker = L.marker(latlng, { draggable: true }).addTo(navMap);
  marker.on("drag", navRenderRoute);
  marker.on("dragend", navRenderRoute);
  return marker;
}

function navAddPoint(latlng) {
  const marker = navCreateRouteMarker(latlng);
  if (!marker) return;
  navMarkers.push(marker);
  navRenderRoute();
}

function navSetRouteBuilderStatus(message) {
  const status = document.getElementById("nav-route-builder-status");
  if (status) status.textContent = message;
}

function navBuildAerodromeRoute() {
  if (!navMap || !window.L) return;
  const depSelect = document.getElementById("nav-route-dep-select");
  const destSelect = document.getElementById("nav-route-dest-select");
  const roundTrip = Boolean(document.getElementById("nav-route-roundtrip")?.checked);
  const dep = navGetAerodrome(depSelect?.value || "");
  const dest = navGetAerodrome(destSelect?.value || "");
  const depLatLng = navAerodromeLatLng(dep);
  const destLatLng = navAerodromeLatLng(dest);

  if (!dep || !dest || !depLatLng || !destLatLng) {
    navSetRouteBuilderStatus(navT("route_builder_missing"));
    return;
  }
  if (dep.icao === dest.icao) {
    navSetRouteBuilderStatus(navT("route_builder_same"));
    return;
  }

  navClearRoute();
  [depLatLng, destLatLng].concat(roundTrip ? [depLatLng] : []).forEach((latlng) => navAddPoint(latlng));
  navSetMode("route");
  navFitRoute();
  navSetRouteBuilderStatus(
    navTf(roundTrip ? "route_built_roundtrip" : "route_built_oneway", {
      dep: dep.icao,
      dest: dest.icao,
    })
  );
}

function navShiftLegAltitudesAfterInsert(splitLegIndex) {
  const shifted = {};
  Object.entries(navLegAltitudes).forEach(([key, value]) => {
    const legIndex = Number(key);
    if (!Number.isFinite(legIndex)) return;
    shifted[legIndex > splitLegIndex ? legIndex + 1 : legIndex] = value;
  });
  navLegAltitudes = shifted;
}

function navDistancePointToSegmentPx(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  const x = a.x + t * dx;
  const y = a.y + t * dy;
  return Math.hypot(p.x - x, p.y - y);
}

function navFindNearestSegmentIndex(latlng) {
  if (!navMap || navMarkers.length < 2) return -1;
  const clickPoint = navMap.latLngToLayerPoint(latlng);
  let bestIndex = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < navMarkers.length - 1; i += 1) {
    const a = navMap.latLngToLayerPoint(navMarkers[i].getLatLng());
    const b = navMap.latLngToLayerPoint(navMarkers[i + 1].getLatLng());
    const distance = navDistancePointToSegmentPx(clickPoint, a, b);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function navAddBreakingPoint(latlng) {
  if (!navMap || navMarkers.length < 2) {
    navSetPrintStatus(navT("create_two_route_points"));
    return;
  }
  const segmentIndex = navFindNearestSegmentIndex(latlng);
  if (segmentIndex < 0) return;
  const marker = navCreateRouteMarker(latlng);
  if (!marker) return;
  navMarkers.splice(segmentIndex + 1, 0, marker);
  navShiftLegAltitudesAfterInsert(segmentIndex + 1);
  navRenderRoute();
  navSetPrintStatus(navT("break_inserted"));
}

function navRenderReferences() {
  const list = document.getElementById("nav-references-list");
  if (!list) return;
  if (!navReferenceMarkers.length) {
    list.innerHTML = `<p class="note">${navT("no_refs")}</p>`;
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
  const title = window.prompt(`${navT("point_label")}:`, `Ref ${next}`);
  if (title === null) return;
  const note = window.prompt(`${navT("observations")}:`, "") || "";
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
    list.innerHTML = `<p class="note">${navT("no_refs")}</p>`;
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
          <span>${item.note ? navEscapeHtml(item.note) : navT("no_observations")}</span>
        </div>
        <small>${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}</small>
      </div>
    `;
  }).join("");
}

function navUpdateReferencePopup(item) {
  const note = item.note ? navEscapeHtml(item.note) : navT("no_observations");
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
  if (printNote) printNote.textContent = item.note || navT("no_observations");
  navUpdateReferencePopup(item);
}

function navRenderReferencesAdvanced() {
  const list = document.getElementById("nav-references-list");
  if (!list) return;
  if (!navReferenceMarkers.length) {
    list.innerHTML = `<p class="note">${navT("no_refs")}</p>`;
    return;
  }
  list.innerHTML = navReferenceMarkers.map((item, idx) => {
    const ll = item.marker.getLatLng();
    return `
      <div class="nav-reference-item" data-nav-reference="${item.id}">
        <label class="fpl-field">${navT("point_label")} ${idx + 1}
          <input
            class="select nav-reference-title"
            type="text"
            value="${navEscapeHtml(item.title)}"
            data-nav-reference-title="${item.id}"
          >
        </label>
        <label class="fpl-field">${navT("optional_altitude")}
          <input
            class="select nav-reference-altitude"
            type="text"
            inputmode="numeric"
            placeholder="ex: 2500 ft"
            value="${navEscapeHtml(item.altitude || "")}"
            data-nav-reference-altitude="${item.id}"
          >
        </label>
        <label class="fpl-field">${navT("observations")}
          <textarea
            class="select nav-reference-note"
            rows="3"
            data-nav-reference-note="${item.id}"
          >${navEscapeHtml(item.note)}</textarea>
        </label>
        <div class="nav-reference-actions">
          <button class="btn" type="button" data-nav-reference-up="${item.id}" ${idx === 0 ? "disabled" : ""}>${navT("move_up")}</button>
          <button class="btn" type="button" data-nav-reference-down="${item.id}" ${idx === navReferenceMarkers.length - 1 ? "disabled" : ""}>${navT("move_down")}</button>
          <button class="btn nav-danger" type="button" data-nav-reference-delete="${item.id}">${navT("delete_btn")}</button>
        </div>
        <div class="nav-reference-print">
          <strong>${idx + 1}. ${navEscapeHtml(item.title)}</strong>
          <em>${item.altitude ? `${navT("altitude_prefix")}: ${navEscapeHtml(item.altitude)}` : ""}</em>
          <span>${item.note ? navEscapeHtml(item.note) : navT("no_observations")}</span>
        </div>
        <small>${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}</small>
      </div>
    `;
  }).join("");
}

function navUpdateReferencePopupAdvanced(item) {
  const altitude = item.altitude ? `<br>${navT("altitude_prefix")}: ${navEscapeHtml(item.altitude)}` : "";
  const note = item.note ? navEscapeHtml(item.note) : navT("no_observations");
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
  if (printAltitude) printAltitude.textContent = item.altitude ? `${navT("altitude_prefix")}: ${item.altitude}` : "";
  if (printNote) printNote.textContent = item.note || navT("no_observations");
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
  if (navAlternateMarker) layers.push(navAlternateMarker);
  if (!layers.length) return;
  const group = L.featureGroup(layers);
  navMap.fitBounds(group.getBounds().pad(0.25));
}

function navSetMode(mode) {
  navMode = ["route", "break", "alternate", "reference"].includes(mode) ? mode : "route";
  document.getElementById("nav-mode-route")?.classList.toggle("active", navMode === "route");
  document.getElementById("nav-mode-break")?.classList.toggle("active", navMode === "break");
  document.getElementById("nav-mode-alternate")?.classList.toggle("active", navMode === "alternate");
  document.getElementById("nav-mode-reference")?.classList.toggle("active", navMode === "reference");
}

function navGetRouteSignature(points = navGetRoutePoints()) {
  return points.map((point) => `${Number(point.lat).toFixed(6)},${Number(point.lng).toFixed(6)}`).join("|");
}

function navSetSimulationStatus(message) {
  navSetText("nav-sim-status", message);
}

function navUpdateSimulationPlayButton() {
  const button = document.getElementById("nav-sim-play");
  if (!button) return;
  button.textContent = navT(navSimPlaying ? "sim_pause" : "sim_play");
}

function navStopSimulation() {
  navSimPlaying = false;
  navSimLastFrameTime = null;
  if (navSimFrame !== null) {
    window.cancelAnimationFrame(navSimFrame);
    navSimFrame = null;
  }
  navUpdateSimulationPlayButton();
}

function navUpdateSimulationAvailability() {
  const button = document.getElementById("nav-simulate");
  if (button) button.disabled = navMarkers.length < 2;
  const panel = document.getElementById("nav-simulator");
  if (!panel || panel.hidden || !navSimRouteSignature) return;
  const signature = navGetRouteSignature();
  if (signature !== navSimRouteSignature) {
    navStopSimulation();
    if (navMarkers.length >= 2) {
      navPrepareSimulation();
      navSetSimulationStatus(navT("sim_route_changed"));
    } else {
      panel.hidden = true;
    }
  }
}

function navSimulationAircraftIcon() {
  return L.divIcon({
    className: "",
    html: '<div class="nav-sim-aircraft"><span>▲</span></div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function navSimulationTargetIcon() {
  return L.divIcon({
    className: "nav-sim-target",
    html: "◎",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function navInitSimulationMap() {
  if (navSimMap || !window.L) return;
  navSimMap = L.map("nav-sim-map", { zoomControl: true }).setView(NAV_DEFAULT_CENTER, 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(navSimMap);
  navSimRouteLine = L.polyline([], { color: "#f59e0b", weight: 4, opacity: 0.95 }).addTo(navSimMap);
  navSimDirectLine = L.polyline([], { color: "#60a5fa", weight: 2, opacity: 0.75, dashArray: "7 7" }).addTo(navSimMap);
  navSimPlaneMarker = L.marker(NAV_DEFAULT_CENTER, {
    icon: navSimulationAircraftIcon(),
    zIndexOffset: 800,
    draggable: true,
    autoPan: false,
    keyboard: true,
    riseOnHover: true,
    title: navT("sim_drag_aircraft"),
    alt: navT("sim_drag_aircraft"),
  }).addTo(navSimMap);
  navSimPlaneMarker.on("dragstart", navHandleSimulationDragStart);
  navSimPlaneMarker.on("drag", navHandleSimulationDrag);
  navSimPlaneMarker.on("dragend", navHandleSimulationDragEnd);
  navUpdateSimulationMarkerLabel();
  navSimTargetMarker = L.marker(NAV_DEFAULT_CENTER, { icon: navSimulationTargetIcon(), zIndexOffset: 700 }).addTo(navSimMap);
}

function navInitSimulationInstruments() {
  if (!navSimHsi && window.HSIInstrument) {
    navSimHsi = new window.HSIInstrument(document.getElementById("nav-sim-hsi"));
  }
  if (!navSimRmi && window.RMIInstrument) {
    navSimRmi = new window.RMIInstrument(document.getElementById("nav-sim-rmi"));
  }
  if (!navSimVor && window.VORIndicator) {
    navSimVor = new window.VORIndicator(document.getElementById("nav-sim-vor"));
  }
}

function navBuildSimulationLegs(points) {
  let distance = 0;
  return points.slice(1).map((to, index) => {
    const from = points[index];
    const nm = navDistanceNm(from, to);
    const leg = {
      index,
      from,
      to,
      nm,
      heading: navBearingDeg(from, to),
      startNm: distance,
      endNm: distance + nm,
    };
    distance += nm;
    return leg;
  }).filter((leg) => leg.nm > 0.001);
}

function navInterpolateLatLng(from, to, fraction) {
  const t = Math.max(0, Math.min(1, fraction));
  return L.latLng(from.lat + (to.lat - from.lat) * t, from.lng + (to.lng - from.lng) * t);
}

function navOffsetLatLng(point, bearing, distanceNm) {
  const angle = navToRad(bearing);
  const lat = point.lat + (distanceNm * Math.cos(angle)) / 60;
  const longitudeScale = Math.max(0.2, Math.cos(navToRad(point.lat)));
  const lng = point.lng + (distanceNm * Math.sin(angle)) / (60 * longitudeScale);
  return L.latLng(lat, lng);
}

function navSimulationAngleDelta(value, reference) {
  return ((Number(value) - Number(reference) + 540) % 360) - 180;
}

function navSimulationFormatTime(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function navFindSimulationLeg(distanceNm) {
  if (!navSimLegs.length) return null;
  return navSimLegs.find((leg) => distanceNm < leg.endNm) || navSimLegs[navSimLegs.length - 1];
}

function navUpdateSimulationMarkerLabel() {
  const element = navSimPlaneMarker?.getElement();
  if (!element) return;
  const label = navT("sim_drag_aircraft");
  element.setAttribute("title", label);
  element.setAttribute("aria-label", label);
}

function navSimulationDistanceAtLatLng(latlng) {
  if (!navSimMap || !navSimLegs.length) return navSimDistanceNm;
  const draggedPoint = navSimMap.latLngToLayerPoint(latlng);
  let bestPixelDistance = Number.POSITIVE_INFINITY;
  let bestRouteDistance = navSimDistanceNm;

  navSimLegs.forEach((leg) => {
    const start = navSimMap.latLngToLayerPoint(leg.from);
    const end = navSimMap.latLngToLayerPoint(leg.to);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const fraction = lengthSquared > 0
      ? Math.max(0, Math.min(1, ((draggedPoint.x - start.x) * dx + (draggedPoint.y - start.y) * dy) / lengthSquared))
      : 0;
    const projectedX = start.x + dx * fraction;
    const projectedY = start.y + dy * fraction;
    const pixelDistance = (draggedPoint.x - projectedX) ** 2 + (draggedPoint.y - projectedY) ** 2;
    const routeDistance = leg.startNm + leg.nm * fraction;
    const closerToPointer = pixelDistance < bestPixelDistance - 0.01;
    const sameTrack = Math.abs(pixelDistance - bestPixelDistance) <= 0.01;
    const closerToCurrentPosition = Math.abs(routeDistance - navSimDistanceNm) < Math.abs(bestRouteDistance - navSimDistanceNm);
    if (closerToPointer || (sameTrack && closerToCurrentPosition)) {
      bestPixelDistance = pixelDistance;
      bestRouteDistance = routeDistance;
    }
  });

  return Math.max(0, Math.min(navSimTotalNm, bestRouteDistance));
}

function navHandleSimulationDragStart() {
  navStopSimulation();
  navSimPlaneMarker?.getElement()?.querySelector(".nav-sim-aircraft")?.classList.add("is-dragging");
  navSetSimulationStatus(navT("sim_dragging"));
}

function navHandleSimulationDrag(event) {
  const distance = navSimulationDistanceAtLatLng(event.target.getLatLng());
  const groundSpeed = Math.max(1, Number(document.getElementById("nav-e6b-speed")?.value || 90));
  navSimDistanceNm = distance;
  navSimElapsedSeconds = (distance / groundSpeed) * 3600;
  navRenderSimulationAtDistance(distance);
}

function navHandleSimulationDragEnd(event) {
  navHandleSimulationDrag(event);
  navSimPlaneMarker?.getElement()?.querySelector(".nav-sim-aircraft")?.classList.remove("is-dragging");
  navSetSimulationStatus(navT("sim_dragged"));
}

function navRenderSimulationAtDistance(distanceNm) {
  const boundedDistance = Math.max(0, Math.min(navSimTotalNm, distanceNm));
  const leg = navFindSimulationLeg(boundedDistance);
  if (!leg || !navSimRoute.length) return;
  navSimDistanceNm = boundedDistance;
  const fraction = leg.nm > 0 ? Math.max(0, Math.min(1, (boundedDistance - leg.startNm) / leg.nm)) : 1;
  const basePosition = navInterpolateLatLng(leg.from, leg.to, fraction);
  const driftNm = Math.sin(fraction * Math.PI * 2) * Math.min(0.1, leg.nm * 0.015);
  const position = navOffsetLatLng(basePosition, leg.heading + 90, driftNm);
  const heading = navNormalizeHeading(leg.heading + Math.cos(fraction * Math.PI * 2) * 2);
  const mode = document.getElementById("nav-sim-mode")?.value || "breakpoints";
  const destination = navSimRoute[navSimRoute.length - 1];
  const target = mode === "destination" ? destination : leg.to;
  const targetLabel = mode === "destination"
    ? navT("sim_target_destination")
    : navTf("sim_target_point", { point: leg.index + 2 });
  const course = mode === "destination"
    ? navBearingDeg(navSimRoute[0], destination)
    : leg.heading;
  const bearingToTarget = navBearingDeg(position, target);
  const adfTarget = mode === "destination" ? navSimRoute[0] : destination;
  const adfBearing = navBearingDeg(position, adfTarget);
  const cdi = Math.max(-2, Math.min(2, navSimulationAngleDelta(bearingToTarget, course) / 5));
  const complete = boundedDistance >= navSimTotalNm;

  navSimPlaneMarker?.setLatLng(position);
  const plane = navSimPlaneMarker?.getElement()?.querySelector("span");
  if (plane) plane.style.transform = `rotate(${heading}deg)`;
  navSimTargetMarker?.setLatLng(target);
  navSimDirectLine?.setLatLngs([position, target]);

  navSimHsi?.setState({ heading, course, deviation: cdi });
  navSimRmi?.setState({ heading, vorBearing: bearingToTarget, adfBearing });
  navSimVor?.setState({ course, deviation: cdi, flag: complete ? "FROM" : "TO" });

  const progress = navSimTotalNm > 0 ? (boundedDistance / navSimTotalNm) * 100 : 0;
  navSetText("nav-sim-progress", `${Math.round(progress)}%`);
  navSetText("nav-sim-time", navSimulationFormatTime(navSimElapsedSeconds));
  navSetText("nav-sim-hsi-readout", `HDG ${String(heading).padStart(3, "0")} · CRS ${String(course).padStart(3, "0")} · CDI ${cdi.toFixed(1)}`);
  navSetText("nav-sim-rmi-readout", `VOR ${String(bearingToTarget).padStart(3, "0")} · ADF ${String(adfBearing).padStart(3, "0")}`);
  navSetText("nav-sim-vor-readout", `OBS ${String(course).padStart(3, "0")} · ${complete ? "FROM" : "TO"}`);

  if (!complete && navSimPlaying) {
    navSetSimulationStatus(navTf("sim_running", { leg: `${leg.index + 1}/${navSimLegs.length}`, target: targetLabel }));
  }
}

function navPrepareSimulation() {
  if (!window.L || navMarkers.length < 2) return false;
  const route = navGetRoutePoints().map((point) => L.latLng(point.lat, point.lng));
  const legs = navBuildSimulationLegs(route);
  if (!legs.length || !window.HSIInstrument || !window.RMIInstrument || !window.VORIndicator) return false;

  navStopSimulation();
  navSimRoute = route;
  navSimLegs = legs;
  navSimTotalNm = legs.reduce((sum, leg) => sum + leg.nm, 0);
  navSimDistanceNm = 0;
  navSimElapsedSeconds = 0;
  navSimRouteSignature = navGetRouteSignature(route);
  navInitSimulationMap();
  navInitSimulationInstruments();
  navSimRouteLine?.setLatLngs(route);
  navRenderSimulationAtDistance(0);
  navSetSimulationStatus(navT("sim_ready"));
  navUpdateSimulationPlayButton();
  window.setTimeout(() => {
    navSimMap?.invalidateSize();
    if (navSimMap && route.length) navSimMap.fitBounds(L.latLngBounds(route).pad(0.2));
  }, 80);
  return true;
}

function navSimulationTick(timestamp) {
  if (!navSimPlaying) return;
  if (navSimLastFrameTime === null) navSimLastFrameTime = timestamp;
  const deltaSeconds = Math.min(0.25, Math.max(0, (timestamp - navSimLastFrameTime) / 1000));
  navSimLastFrameTime = timestamp;
  const playbackRate = Number(document.getElementById("nav-sim-rate")?.value || 60);
  const groundSpeed = Math.max(1, Number(document.getElementById("nav-e6b-speed")?.value || 90));
  const simulatedSeconds = deltaSeconds * playbackRate;
  navSimElapsedSeconds += simulatedSeconds;
  navSimDistanceNm = Math.min(navSimTotalNm, navSimDistanceNm + (groundSpeed * simulatedSeconds) / 3600);
  navRenderSimulationAtDistance(navSimDistanceNm);

  if (navSimDistanceNm >= navSimTotalNm) {
    navStopSimulation();
    navSetSimulationStatus(navT("sim_complete"));
    return;
  }
  navSimFrame = window.requestAnimationFrame(navSimulationTick);
}

function navToggleSimulationPlayback() {
  if (navSimRouteSignature !== navGetRouteSignature() || !navSimLegs.length) {
    if (!navPrepareSimulation()) {
      navSetSimulationStatus(navT("sim_need_route"));
      return;
    }
  }
  if (navSimPlaying) {
    navStopSimulation();
    navSetSimulationStatus(navT("sim_paused"));
    return;
  }
  if (navSimDistanceNm >= navSimTotalNm) {
    navSimDistanceNm = 0;
    navSimElapsedSeconds = 0;
    navRenderSimulationAtDistance(0);
  }
  navSimPlaying = true;
  navSimLastFrameTime = null;
  navUpdateSimulationPlayButton();
  navSimFrame = window.requestAnimationFrame(navSimulationTick);
}

function navResetSimulation() {
  navStopSimulation();
  navSimDistanceNm = 0;
  navSimElapsedSeconds = 0;
  navRenderSimulationAtDistance(0);
  navSetSimulationStatus(navT("sim_ready"));
}

function navOpenSimulation() {
  if (navMarkers.length < 2) {
    navSetPrintStatus(navT("sim_need_route"));
    return;
  }
  const panel = document.getElementById("nav-simulator");
  if (!panel) return;
  panel.hidden = false;
  if (!navPrepareSimulation()) {
    panel.hidden = true;
    navSetPrintStatus(navT("sim_need_route"));
    return;
  }
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function navCloseSimulation() {
  navStopSimulation();
  const panel = document.getElementById("nav-simulator");
  if (panel) panel.hidden = true;
}

function navApplyLanguage(lang) {
  navLanguage = lang === "en" ? "en" : "pt";
  try {
    window.localStorage.setItem("myflyapp-language", navLanguage);
  } catch (_err) {
    // Local storage may be unavailable in private/browser-restricted contexts.
  }
  const globalSelect = document.getElementById("site-language");
  if (globalSelect && globalSelect.value !== navLanguage) globalSelect.value = navLanguage;
  document.documentElement.lang = navLanguage === "en" ? "en" : "pt";
  document.title = navT("app_title");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    node.textContent = navT(key);
  });
  document.querySelectorAll("[data-i18n-label]").forEach((node) => {
    const key = node.getAttribute("data-i18n-label");
    const textNode = Array.from(node.childNodes).find((child) => child.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.textContent = navT(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", navT(node.getAttribute("data-i18n-placeholder")));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.setAttribute("title", navT(node.getAttribute("data-i18n-title")));
  });
  navRenderRoute();
  navRenderReferences();
  navRenderAlternateSummary();
  navUpdateSimulationPlayButton();
  navUpdateSimulationMarkerLabel();
  window.MyFlyI18n = { language: navLanguage, t: navT };
  window.dispatchEvent(new CustomEvent("myflyapp:language", { detail: { language: navLanguage } }));
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
      alternate_nm: document.getElementById("nav-alternate-nm")?.textContent || "-",
      alternate_fuel: document.getElementById("nav-alternate-fuel")?.textContent || "-",
      final_reserve: document.getElementById("nav-e6b-final-reserve")?.textContent || "-",
      fuel_reserve: document.getElementById("nav-e6b-fuel-reserve")?.textContent || "-",
      feet: document.getElementById("nav-e6b-feet")?.textContent || "-",
    },
    alternate: navAlternate
      ? {
          title: navAlternate.icao ? `${navAlternate.icao} - ${navAlternate.name || ""}` : navT("alternate_manual"),
          lat: navAlternate.lat.toFixed(5),
          lng: navAlternate.lng.toFixed(5),
        }
      : null,
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
    `${navT("pdf_download_ready")} <a class="nav-download-link" href="${url}" download="${filename}" target="_blank" rel="noopener">${navT("pdf_download_link")}</a>`
  );
}

function navCleanupPrintMode() {
  document.body.classList.remove("printing-navigation");
  if (navPrintCleanupTimer) {
    clearTimeout(navPrintCleanupTimer);
    navPrintCleanupTimer = null;
  }
  navSetPrintStatus(navT("pdf_ready_again"));
}

async function navPrintPdf() {
  ensureNavigationReady();
  navRenderReferences();
  navSetPrintStatus(navT("pdf_generating"));

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
    navSetPrintStatus(navT("pdf_fallback"));

    window.removeEventListener("afterprint", navCleanupPrintMode);
    window.addEventListener("afterprint", navCleanupPrintMode, { once: true });
    navPrintCleanupTimer = setTimeout(navCleanupPrintMode, 120000);
    document.body.offsetHeight;
    try {
      window.print();
    } catch (_printErr) {
      navCleanupPrintMode();
      navSetPrintStatus(navT("pdf_error"));
    }
  }
}

function navSeedAerodromes() {
  const aerodromes = Array.isArray(window.AERODROMES) ? window.AERODROMES : [];
  aerodromes.forEach((ad) => {
    if (!Number.isFinite(Number(ad.lat)) || !Number.isFinite(Number(ad.lon))) return;
    const marker = L.circleMarker([ad.lat, ad.lon], {
      radius: 5,
      color: "#f59e0b",
      fillColor: "#f59e0b",
      fillOpacity: 0.75,
      weight: 1,
    })
      .addTo(navMap)
      .bindPopup(`<strong>${ad.icao}</strong><br>${ad.name || ""}<br>${ad.main_freq || ""}`);
    marker.on("click", (event) => {
      if (navMode !== "alternate") return;
      if (window.L?.DomEvent && event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
      navSetAlternate({ icao: ad.icao, name: ad.name, lat: Number(ad.lat), lng: Number(ad.lon) });
      const select = document.getElementById("nav-alternate-select");
      if (select) select.value = ad.icao;
    });
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
  navLegLabelLayer = L.layerGroup().addTo(navMap);
  navLine.on("click", (event) => {
    if (navMode !== "break") return;
    if (window.L?.DomEvent) L.DomEvent.stopPropagation(event);
    navAddBreakingPoint(event.latlng);
  });
  navSeedAerodromes();

  navMap.on("click", (event) => {
    if (navMode === "reference") {
      navAddReference(event.latlng);
      return;
    }
    if (navMode === "alternate") {
      navSetManualAlternate(event.latlng);
      return;
    }
    if (navMode === "break") {
      navAddBreakingPoint(event.latlng);
      return;
    }
    navAddPoint(event.latlng);
  });
  document.getElementById("nav-clear-route")?.addEventListener("click", navClearRoute);
  document.getElementById("nav-undo-point")?.addEventListener("click", navUndoPoint);
  document.getElementById("nav-fit-route")?.addEventListener("click", navFitRoute);
  document.getElementById("nav-clear-references")?.addEventListener("click", navClearReferences);
  document.getElementById("nav-show-leg-labels")?.addEventListener("change", navRenderRoute);
  document.getElementById("nav-mode-route")?.addEventListener("click", () => navSetMode("route"));
  document.getElementById("nav-mode-break")?.addEventListener("click", () => navSetMode("break"));
  document.getElementById("nav-mode-alternate")?.addEventListener("click", () => navSetMode("alternate"));
  document.getElementById("nav-mode-reference")?.addEventListener("click", () => navSetMode("reference"));
  document.getElementById("nav-build-route")?.addEventListener("click", navBuildAerodromeRoute);
  ["nav-alternate-select", "nav-route-alt-select"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", (event) => navHandleAlternateSelect(event.target.value));
  });
  document.getElementById("nav-print-pdf")?.addEventListener("click", navPrintPdf);
  document.getElementById("nav-simulate")?.addEventListener("click", navOpenSimulation);
  document.getElementById("nav-sim-play")?.addEventListener("click", navToggleSimulationPlayback);
  document.getElementById("nav-sim-reset")?.addEventListener("click", navResetSimulation);
  document.getElementById("nav-sim-close")?.addEventListener("click", navCloseSimulation);
  document.getElementById("nav-sim-mode")?.addEventListener("change", () => navRenderSimulationAtDistance(navSimDistanceNm));
  document.getElementById("nav-legs-body")?.addEventListener("input", navHandleAltitudeInput);
  document.getElementById("nav-references-list")?.addEventListener("input", navHandleReferenceInput);
  document.getElementById("nav-references-list")?.addEventListener("click", navHandleReferenceAction);
  ["nav-e6b-nm", "nav-e6b-speed", "nav-e6b-gph", "nav-e6b-reserve", "nav-e6b-meters"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", navUpdateE6B);
  });
  navSetMode("route");
  navPopulateRouteBuilderSelects();
  navPopulateAlternateSelect();
  let savedLanguage = "pt";
  try {
    savedLanguage = window.localStorage.getItem("myflyapp-language") || "pt";
  } catch (_err) {
    savedLanguage = "pt";
  }
  navApplyLanguage(savedLanguage || document.getElementById("site-language")?.value || "pt");
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

function initGlobalLanguageControl() {
  const select = document.getElementById("site-language");
  if (!select) return;
  let savedLanguage = "pt";
  try {
    savedLanguage = window.localStorage.getItem("myflyapp-language") || "pt";
  } catch (_err) {
    savedLanguage = "pt";
  }
  select.value = savedLanguage;
  select.addEventListener("change", (event) => navApplyLanguage(event.target.value));
  navApplyLanguage(savedLanguage);
}

document.addEventListener("DOMContentLoaded", initGlobalLanguageControl);
document.addEventListener("DOMContentLoaded", initNavigation);
