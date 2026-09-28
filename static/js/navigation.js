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
  tab_training: "Treino",
  tab_navigation: "Navegações",
  tab_e6b: "E6B",
  tab_instruments: "Instrumentos",
  tab_avionics: "Avionics Simulator",
  tab_massbalance: "Massa & Balanceamento",
  freq_title: "Frequências",
  freq_warning: "⚠️ Aviso: estas frequências são apenas informativas e podem estar incorretas ou desatualizadas. Confirma sempre na carta/eAIP e NOTAM atuais.",
  atis_selected: "ATIS (aeroporto selecionado)",
  lisboa_information: "Lisboa Information",
  freq_aerodrome: "Aeródromo",
  select_aerodrome: "Seleciona um aeródromo",
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
  five_letter_map_title: "Mapa 5-letter code",
  open_five_letter_map: "Abrir no Google My Maps",
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
  vor_trainer_kicker: "Treino interativo",
  vor_trainer_title: "Navegação VOR — Porto e Viseu",
  vor_trainer_intro: "Sintoniza uma frequência, posiciona o avião e roda o OBS para perceber radiais, CDI e a indicação TO/FROM.",
  vor_trainer_disclaimer: "Demonstração educativa simplificada. Não usar para navegação real: confirma sempre frequências, disponibilidade, cobertura e limitações no AIP/eAIP e NOTAM atuais.",
  vor_frequency: "Frequência NAV (MHz)",
  vor_tune: "Sintonizar",
  vor_frequency_help: "Experimenta 114.10 para PRT ou 113.10 para VIS.",
  aircraft_heading: "Rumo do avião (HDG)",
  set_direct_heading: "Apontar à estação",
  vor_obs_course: "Curso selecionado (OBS)",
  center_to: "Centrar TO",
  center_from: "Centrar FROM",
  vor_map_hint: "Arrasta o avião ou clica no mapa para mudar a posição.",
  random_position: "Nova posição",
  classic_vor: "VOR clássico",
  position_analysis: "Leitura da posição",
  tuned_station: "Estação sintonizada",
  distance_dme: "Distância geométrica",
  radial_from: "Radial FROM",
  bearing_to: "Bearing TO",
  what_instruments_say: "O que os instrumentos dizem",
  to_legend: "curso selecionado leva à estação",
  from_legend: "curso selecionado afasta-se da estação",
  cdi_legend: "voa para a agulha para intercetar o curso",
  vor_source_prefix: "Dados das estações:",
  vor_declination_note: "O cálculo aplica a declinação VOR publicada de 02° W (época 2020); DME e cobertura são apenas aproximados/não simulados.",
  vor_not_tuned: "Sintoniza uma frequência VOR válida para começar.",
  vor_not_tuned_explanation: "O instrumento mostra NAV/OFF quando a frequência não corresponde a PRT ou VIS.",
  vor_station_tuned: "{id} sintonizado. Estás no radial {radial}°; a estação fica no bearing {bearing}°.",
  vor_to_guidance: "TO · {needle}",
  vor_from_guidance: "FROM · {needle}",
  vor_off_guidance: "NAV/OFF · zona de ambiguidade TO/FROM.",
  vor_to_explanation: "O curso {obs}° aponta para a estação. {turn}",
  vor_from_explanation: "O curso {obs}° segue para fora da estação pelo radial selecionado. Para navegar até ela, usa Centrar TO.",
  vor_off_explanation: "Perto da estação ou a cerca de 90° do curso selecionado, a indicação TO/FROM torna-se ambígua.",
  vor_needle_centered: "CDI centrado: mantém o curso selecionado",
  vor_needle_left: "agulha à esquerda: interceta para a esquerda",
  vor_needle_right: "agulha à direita: interceta para a direita",
  vor_turn_left: "A estação está {degrees}° à esquerda do rumo atual.",
  vor_turn_right: "A estação está {degrees}° à direita do rumo atual.",
  vor_heading_aligned: "O rumo está alinhado com a estação.",
  vor_geometric_distance: "geométrica; não substitui DME",
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
  e6b_tab_kicker: "Calculadora externa",
  e6b_tab_title: "E6BX Flight Computer",
  e6b_tab_intro: "Calculadora E6B online para cálculos de voo, conversões e planeamento.",
  e6b_open: "Abrir E6BX numa nova janela",
  e6b_tab_note: "Ferramenta externa fornecida por e6bx.com. Se não carregar dentro da tab, usa o botão para abrir a calculadora numa nova janela.",
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
  av_kicker: "Treino de aviónica",
  av_title: "Avionics Simulator",
  av_intro: "Treina os fluxos básicos de um Garmin G5 ligado a um GNS 430/430W: sintonização, navegação GPS/VLOC, OBS, Direct-to e leitura do HSI.",
  av_helper_button: "Helper",
  av_setup1_devices: "2× G5 + GNS 430/430W",
  av_setup2_devices: "GI-106A VOR/LOC + GNC 255",
  av_setup2_reset: "Repor Setup 2",
  av_setup2_tutorial_intro: "Quatro níveis VFR e modo livre. Posiciona o avião no mapa e voa a 90 KTS com ←/→ para virar. O CDI e TO/FROM resultam da posição e do OBS; T/F no GNC consulta o bearing TO ou radial FROM.",
  av_setup2_auto_flag: "TO/FROM automático",
  av_setup2_free_option: "Modo livre · GI-106A + GNC 255",
  av_setup2_free_title: "Modo livre · Treinar VOR",
  av_setup2_free_briefing: "Sintoniza um VOR no GNC 255, ajusta o OBS e compara o GI-106A com a posição no mapa. Clica ou arrasta para posicionar o avião; as setas viram o nariz e Voar inicia o movimento.",
  av_setup2_free_objective: "Explorar posição, curso OBS, CDI e TO/FROM",
  av_setup2_free_step1: "Ativa a frequência NAV de uma estação da lista e confirma o identificador.",
  av_setup2_free_step2: "Ajusta o OBS no GI-106A e desloca o avião no mapa para observar CDI e TO/FROM.",
  av_setup2_free_step3: "Usa Voar/Pausar e ←/→ para controlar o avião. O rumo não altera o CDI enquanto a posição se mantiver.",
  av_setup2_free_ready: "Modo livre: instrumentos ligados à posição do avião, sem avaliação de exercício.",
  av_setup2_check: "Verificar instrumentos",
  av_setup2_tutorial_ready: "Os passos ficam verdes automaticamente ao configurares os instrumentos corretamente.",
  av_setup2_tutorial_success: "Nível concluído. Compara agora o GI-106A com o mapa.",
  av_setup2_tutorial_power: "Liga o GI-106A e o GNC 255 antes de verificar.",
  av_setup2_tutorial_position: "O avião afastou-se da posição inicial deste nível. Recarrega o exercício ou aproxima-o no mapa.",
  av_setup2_tutorial_frequency: "Seleciona NAV/VOR, ativa a frequência pedida e confirma o identificador da estação.",
  av_setup2_tutorial_course: "Confere o curso OBS no GI-106A; arrasta o botão OBS ou usa ←/→ quando estiver focado.",
  av_setup2_tutorial_tofrom: "Confere a indicação TO/FROM do simulador com o objetivo e o mapa.",
  av_setup2_tutorial_cdi: "A agulha CDI ainda não está centrada. Compara curso, posição e radial no mapa.",
  av_setup2_level1_option: "Nível 1 · Identificar Viseu VOR",
  av_setup2_level1_title: "Nível 1 · Sintonizar e identificar",
  av_setup2_level1_briefing: "O avião está a oeste de Viseu. Aprende a transferir uma frequência NAV em standby para ativa e a ler o identificador VIS.",
  av_setup2_level1_objective: "NAV 113.10 ativa · VOR · identificador VIS",
  av_setup2_level1_step1: "Seleciona NAV no GNC 255 com C/N, se necessário.",
  av_setup2_level1_step2: "Confirma 113.10 na frequência standby e usa ↔ (FLIP/FLOP).",
  av_setup2_level1_step3: "Lê VIS · ID OK no visor; compara a estação com o mapa.",
  av_setup2_level2_option: "Nível 2 · Voar TO Viseu",
  av_setup2_level2_title: "Nível 2 · Curso TO Viseu",
  av_setup2_level2_briefing: "A oeste do Viseu VOR, o bearing aproximado para a estação é 090°. Treina frequência, curso e leitura do CDI.",
  av_setup2_level2_objective: "NAV 113.10 · OBS 090° · TO · CDI centrado",
  av_setup2_level2_step1: "Ativa 113.10 no GNC 255 e confirma VIS.",
  av_setup2_level2_step2: "Ajusta OBS para 090° no GI-106A; o botão aceita arrasto ou ←/→.",
  av_setup2_level2_step3: "Compara TO e CDI centrado com o bearing TO no mapa.",
  av_setup2_level3_option: "Nível 3 · Ler radial FROM",
  av_setup2_level3_title: "Nível 3 · Radial FROM Viseu",
  av_setup2_level3_briefing: "O avião está a leste de Viseu, na radial aproximada 090°. Compara a direção para fora da estação com a indicação FROM.",
  av_setup2_level3_objective: "NAV 113.10 · OBS 090° · FROM · CDI centrado",
  av_setup2_level3_step1: "Ativa 113.10 e confirma o identificador VIS.",
  av_setup2_level3_step2: "Ajusta OBS para 090° e compara com a radial FROM do mapa.",
  av_setup2_level3_step3: "Confirma FROM automático e CDI centrado; T/F no GNC permite consultar a radial.",
  av_setup2_level4_option: "Nível 4 · Mudar para Porto VOR",
  av_setup2_level4_title: "Nível 4 · Nova estação, mesmo método",
  av_setup2_level4_briefing: "O avião está a sul do Porto VOR. Repete o processo com outra frequência e um curso aproximado 000° para a estação.",
  av_setup2_level4_objective: "NAV 114.10 · OBS 000° · TO · CDI centrado",
  av_setup2_level4_step1: "Transfere 114.10 para NAV ativa e confirma PRT · ID OK.",
  av_setup2_level4_step2: "Ajusta OBS para 000° no GI-106A.",
  av_setup2_level4_step3: "Compara TO, CDI centrado e bearing TO no mapa.",
  av_local_badge: "SIMULAÇÃO LOCAL",
  av_disclaimer: "Simulador educativo simplificado. Não é uma cópia certificada do Garmin PC Trainer, não usa uma base de dados aeronáutica oficial e não substitui o manual, treino aprovado, checklist, AIP/eAIP, NOTAM ou a responsabilidade do piloto.",
  av_flight_state: "Estado do voo",
  av_flight_state_note: "Altera estes valores para observar a resposta dos instrumentos.",
  av_heading_label: "Rumo magnético (HDG)",
  av_course_label: "Curso / OBS",
  av_source_label: "Fonte NAV",
  av_source_gps: "GPS",
  av_source_vloc: "VLOC",
  av_waypoint_label: "Waypoint GPS",
  av_sync_heading: "Sincronizar HDG bug",
  av_sync_course: "Centrar curso",
  av_status_label: "Estado",
  av_status_ready: "Pronto. Começa pelo checklist.",
  av_scenario_label: "Exercício guiado",
  av_scenario_basic: "1 · Sintonizar ecrã NAV",
  av_scenario_vor: "2 · Intercetar radial VLOC",
  av_scenario_direct: "3 · Direct-to GPS",
  av_scenario_basic_instruction: "Liga o GNS, seleciona NAV e verifica a frequência standby antes de a ativar.",
  av_scenario_vor_instruction: "Seleciona VLOC, ativa uma frequência NAV e roda OBS para comparar o curso com a indicação CDI.",
  av_scenario_direct_instruction: "Seleciona o waypoint, pressiona D→ e confirma com ENT para praticar um Direct-to.",
  av_reset: "Repor exercício",
  av_checklist_title: "Checklist de treino",
  av_check_1: "Liga o GNS e identifica a página NAV.",
  av_check_2: "Usa o knob esquerdo para selecionar COM ou VLOC e flip-flop para ativar a standby.",
  av_check_3: "Alterna CDI entre GPS e VLOC; usa OBS para fixar o curso selecionado.",
  av_check_4: "No G5, lê a fonte, o CDI, o heading e o heading bug antes de corrigir.",
  av_manual_title: "Manuais e limites",
  av_manual_note: "Os manuais oficiais dos instrumentos presentes ficam reunidos aqui para consulta durante o treino. A apresentação e a base de dados desta tab são uma implementação independente.",
  av_official_trainer: "PC Trainers oficiais",
  av_g5_manual: "Manual Garmin G5",
  av_gns_manual: "Manual Garmin GNS 430/430W",
  av_gi106_manual: "Referência Garmin GI-106A",
  av_gnc255_manual: "Manual Garmin GNC 255",
  av_tutorial_kicker: "Tutorial prático",
  av_tutorial_title: "Aprende com mapa e exercícios",
  av_tutorial_intro: "Escolhe um exercício ou o Modo livre. Posiciona o avião no mapa e carrega em Voar para observar os instrumentos durante o movimento a 90 KTS.",
  av_tutorial_intro_option: "Nível 0 · Introdução VOR",
  av_tutorial_intro_badge: "NÍVEL 0",
  av_tofrom_kicker: "Leitura rápida",
  av_tofrom_title: "TO ou FROM? Lê nesta ordem",
  av_tofrom_intro: "TO/FROM descreve a relação entre o curso selecionado e a estação VOR. Não é a direção do nariz do avião.",
  av_tofrom_memory_label: "Regra rápida TO e FROM",
  av_tofrom_memory_to: "para a estação",
  av_tofrom_memory_from: "da estação para fora",
  av_tofrom_to_heading: "curso para a estação",
  av_tofrom_to_rule: "Com a CDI centrada, o OBS/CRS selecionado aponta para a estação.",
  av_tofrom_course_reading: "OBS/CRS",
  av_tofrom_to_course: "≈ Bearing TO",
  av_tofrom_map_reading: "No mapa",
  av_tofrom_to_map: "Lê Bearing TO; a radial FROM é o recíproco.",
  av_tofrom_from_heading: "radial a sair da estação",
  av_tofrom_from_rule: "Com a CDI centrada, o OBS/CRS selecionado coincide com a radial que sai da estação.",
  av_tofrom_from_course: "≈ Radial FROM",
  av_tofrom_from_map: "Lê Radial FROM; o Bearing TO é o recíproco.",
  av_tofrom_checklist_title: "Checklist das leituras",
  av_tofrom_check_1: "Confirma a frequência NAV/VLOC ativa e o identificador (por exemplo, VIS · ID OK).",
  av_tofrom_check_2: "Confirma a fonte: VLOC/VOR no Setup 1 ou NAV/VOR no Setup 2.",
  av_tofrom_check_3: "Lê OBS/CRS e CDI; só compara cursos com a CDI centrada.",
  av_tofrom_check_4: "Lê a bandeira TO/FROM: TO = para a estação; FROM = para longe.",
  av_tofrom_check_5: "Finalmente compara o Bearing TO e a Radial FROM no mapa: são recíprocos.",
  av_tofrom_setup_title: "Onde fazer cada leitura",
  av_tofrom_setup1_reading: "no GNS confirma VLOC e ID; no G5 HSI lê fonte, CRS/OBS, CDI e TO/FROM.",
  av_tofrom_setup2_reading: "no GNC 255 confirma NAV e ID; no GI-106A lê OBS, CDI e bandeira; em T/F consulta Bearing TO ou Radial FROM.",
  av_tofrom_example_title: "Exemplo Viseu (VIS)",
  av_tofrom_example_west_label: "A oeste de VIS",
  av_tofrom_example_west: "· Bearing TO 090° / Radial FROM 270°. OBS 090° + CDI centrada = TO.",
  av_tofrom_example_east_label: "A leste de VIS",
  av_tofrom_example_east: "· Radial FROM 090° / Bearing TO 270°. OBS 090° + CDI centrada = FROM.",
  av_tofrom_heading_label: "Atenção ao HDG:",
  av_tofrom_heading_note: "o heading mostra para onde aponta o nariz; não determina TO/FROM. Com vento, HDG e OBS/CRS podem ter valores diferentes.",
  av_tutorial_select: "Exercício / modo",
  av_tutorial_free_option: "Modo livre · testar instrumentos",
  av_tutorial_vis_to_option: "Nível 1 · Viseu VOR — voar TO",
  av_tutorial_vis_from_option: "Nível 2 · Viseu VOR — radial FROM",
  av_tutorial_prt_option: "Nível 3 · Porto VOR — voar TO",
  av_tutorial_gps_option: "Nível 4 · GPS — Direct-to LPPR",
  av_tutorial_map_option: "Nível 5 · GNS 430 — Map Page",
  av_tutorial_load: "Carregar exercício",
  av_tutorial_check: "Verificar HSI",
  av_tutorial_next: "Próximo exemplo",
  av_tutorial_free_badge: "MODO LIVRE",
  av_tutorial_load_free: "Carregar modo livre",
  av_tutorial_go: "Voar · 90 KTS",
  av_tutorial_pause: "Pausar voo",
  av_tutorial_flight_running: "Voo em curso",
  av_touch_group: "Grupo / campo",
  av_mobile_button: "Modo mobile",
  av_mobile_enable: "Ativar comandos para toque",
  av_mobile_disable: "Voltar ao design normal",
  av_touch_page: "Página / valor · CRSR",
  av_touch_decrease: "Diminuir",
  av_touch_increase: "Aumentar",
  av_touch_turn_left: "Virar o avião à esquerda 5°",
  av_touch_turn_right: "Virar o avião à direita 5°",
  av_touch_controls_hint: "No toque: usa −/+ para rodar, mantém premido para repetir ou arrasta o comando. Toca no centro para pressionar.",
  av_touch_map_hint: "Toca no mapa ou arrasta o avião para o posicionar. Usa ↶/↷ para virar o nariz; manter premido continua a viragem.",
  av_tutorial_map_hint: "A linha liga o avião à referência. A geometria é didática: distância, bearing e radial não representam DME certificado.",
  av_setup2_map_keyboard_hint: "Clica ou arrasta o avião para o posicionar. Usa ←/→ para virar o nariz em 5° e Voar para avançar a 90 KTS.",
  av_navaids_title: "Estações VOR/DME",
  av_navaids_station: "Estação / tipo",
  av_navaids_frequency: "Frequência / canal",
  av_navaids_locate: "Localizar no mapa",
  av_navaids_source: "Fonte: NAV Portugal eAIP · ENR 4.1",
  av_navaids_hint: "Clica num nome para localizar a estação no mapa e sintoniza a frequência no instrumento. Arouca e Marão são DME: são referências de mapa e não fornecem indicação VOR nestes setups.",
  av_waypoint_unavailable: "Waypoint não disponível: usa um aeródromo local ou um identificador da lista de estações.",
  av_tutorial_objective: "Objetivo",
  av_tutorial_aircraft: "Avião",
  av_tutorial_reference: "Referência",
  av_tutorial_bearing: "Bearing TO",
  av_tutorial_radial: "Radial FROM",
  av_tutorial_ready: "Os passos ficam verdes automaticamente quando a configuração está correta. Podes usar Verificar HSI para confirmar o conjunto.",
  av_tutorial_step_done: "Passo correto",
  av_tutorial_step_pending: "Passo por concluir",
  av_tutorial_step_note: "Dica de leitura — sem validação automática",
  av_g5_menu_heading: "Heading",
  av_g5_menu_course: "Course",
  av_g5_menu_bearing: "Bearing Pointer",
  av_g5_menu_back: "Voltar",
  av_g5_menu_hint: "Roda/arrasta o botão para escolher (continua até PFD para voltar à atitude); pressiona para selecionar.",
  av_g5_pfd_menu_hint: "Pressiona o botão, roda/arrasta até HSI e pressiona novamente para mudar de página.",
  av_g5_heading_help: "Roda para ajustar o heading bug. Pressiona o knob para abrir/confirmar o menu; mantém premido para sincronizar com o rumo atual.",
  av_g5_course_help: "Arrasta para ajustar CRS/OBS. Pressiona o botão para confirmar e voltar a HDG.",
  av_g5_course_unavailable: "Ativa VLOC ou OBS no GNS para ajustar o curso.",
  av_tutorial_success: "Exercício concluído. Compara agora o teu HSI com a leitura do mapa.",
  av_tutorial_not_yet: "Ainda não. Confere a fonte NAV, a frequência ativa, o OBS/curso e o heading.",
  av_tutorial_free_title: "Modo livre — testar instrumentos",
  av_tutorial_free_briefing: "Coloca o avião onde quiseres no mapa e experimenta os instrumentos sem um objetivo ou resposta certa. A referência visual acompanha o VOR sintonizado; consulta a lista de estações junto ao mapa.",
  av_tutorial_free_objective: "Posição livre · voo a 90 KTS · curvas com ←/→",
  av_tutorial_free_step1: "Clica numa posição do mapa ou arrasta o avião azul para o local de partida.",
  av_tutorial_free_step2: "Carrega em Voar para começar a avançar a 90 KTS.",
  av_tutorial_free_step3: "Usa as teclas ←/→ para virar 5° de cada vez e observa o G5/GNS.",
  av_tutorial_free_ready: "Modo livre pronto. Posiciona o avião, configura os instrumentos e carrega em Voar.",
  av_tutorial_vis_to_title: "Viseu VOR — voar TO",
  av_tutorial_vis_to_briefing: "O avião está a oeste do Viseu VOR. Queremos voar para a estação usando o GNS em VLOC e o G5 como HSI.",
  av_tutorial_vis_to_objective: "113.10 · VLOC · OBS 090° · HDG 090° · indicação TO",
  av_tutorial_vis_to_step1: "No GNS, seleciona VLOC e faz flip-flop de 113.10 para a frequência ativa.",
  av_tutorial_vis_to_step2: "Pressiona CDI até o G5/GNS mostrarem VLOC; confirma o identificador Viseu.",
  av_tutorial_vis_to_step3: "No G5 HSI, pressiona o botão, seleciona Course e arrasta até CRS 090°. Pressiona para confirmar.",
  av_tutorial_vis_to_step4: "Com o botão do G5 HSI em HDG, arrasta até BUG 090° e confirma TO com a CDI centrada.",
  av_tutorial_vis_from_title: "Viseu VOR — radial FROM",
  av_tutorial_vis_from_briefing: "O avião está a este do Viseu VOR. Pratica a diferença entre radial FROM e curso TO: o radial é 090°, mas o curso para a estação seria 270°.",
  av_tutorial_vis_from_objective: "113.10 · VLOC · OBS 090° · HDG 090° · indicação FROM",
  av_tutorial_vis_from_step1: "Ativa VLOC 113.10 e seleciona VLOC como fonte CDI.",
  av_tutorial_vis_from_step2: "No menu do G5 HSI, seleciona Course, ajusta CRS 090° e pressiona para confirmar: é o radial que sai da estação.",
  av_tutorial_vis_from_step3: "Com o botão do G5 HSI em HDG, ajusta BUG 090°; confirma FROM com a CDI centrada.",
  av_tutorial_vis_from_step4: "Para voar de volta à estação, usa Centrar TO mentalmente: o curso seria 270°.",
  av_tutorial_prt_title: "Porto VOR — interceptar TO",
  av_tutorial_prt_briefing: "O avião está a sul do Porto VOR. Usa um curso norte para intercetar a estação e pratica a leitura TO no HSI.",
  av_tutorial_prt_objective: "114.10 · VLOC · OBS 000° · HDG 000° · indicação TO",
  av_tutorial_prt_step1: "Ativa 114.10 no VLOC e confirma que o CDI está em VLOC.",
  av_tutorial_prt_step2: "No menu do G5 HSI, seleciona Course, ajusta CRS 000° e pressiona para confirmar: o curso aponta para o Porto VOR.",
  av_tutorial_prt_step3: "Com o botão do G5 HSI em HDG, ajusta BUG 000° e confirma TO com a CDI centrada.",
  av_tutorial_prt_step4: "Compara bearing TO e radial FROM no mapa; não confundas os dois valores.",
  av_tutorial_gps_title: "GPS — Direct-to LPPR",
  av_tutorial_gps_briefing: "O avião está a sul de LPPR. Pratica um Direct-to GPS e confirma no G5 que a fonte é GPS, não VLOC.",
  av_tutorial_gps_objective: "GPS · LPPR · Direct-to · CRS 000° · HDG 000°",
  av_tutorial_gps_step1: "Seleciona GPS como fonte CDI e LPPR como waypoint.",
  av_tutorial_gps_step2: "Pressiona D→ no GNS, confirma LPPR com ENT e regressa à página NAV.",
  av_tutorial_gps_step3: "Ativa OBS no GNS. No menu do G5 HSI, seleciona OBS, ajusta CRS 000° e pressiona para confirmar.",
  av_tutorial_gps_step4: "Com o botão do G5 HSI em HDG, ajusta BUG 000°; observa a CDI antes de iniciar o voo.",
  av_tutorial_map_title: "Nível 5 · GNS 430 — Map Page",
  av_tutorial_map_briefing: "Usa a página MAP do GNS 430 para ligar o símbolo do avião ao waypoint LPPR e interpretar o alcance, o track e os campos de navegação.",
  av_tutorial_map_objective: "MAP · GPS · LPPR · alcance 20 NM · leitura TRK/BRG/DTK/DIS/GS",
  av_tutorial_map_step1: "Com CRSR desligado, roda o knob direito exterior para NAV e o interior para a página MAP.",
  av_tutorial_map_step2: "Usa RNG− uma vez para selecionar 20 NM e confirma que a fonte GPS e o waypoint LPPR estão visíveis.",
  av_tutorial_map_step3: "Lê os campos TRK, BRG, DTK, DIS e GS; compara a linha/avião/waypoint do GNS com o mapa do tutorial.",
  av_tutorial_map_step4: "No G5, ajusta o heading bug para 035° e compara o bug com o BRG/DTK apresentados na Map Page.",
  av_checklist_kicker: "Confirmação de desafios",
  av_challenge_checklist_title: "Checklist de execução dos níveis",
  av_challenge_checklist_intro: "Abre cada nível, executa os passos e confirma-o quando o objetivo ficar validado. A checklist é apenas desta sessão do navegador.",
  av_checklist_setup1: "Setup 1 · G5 + GNS 430/430W",
  av_checklist_setup2: "Setup 2 · GI-106A + GNC 255",
  av_checklist_open: "Abrir nível",
  av_checklist_confirm: "Confirmar execução",
  av_checklist_confirmed_button: "Confirmado",
  av_checklist_pending: "Por iniciar",
  av_checklist_in_progress: "Em execução",
  av_checklist_ready: "Objetivo atingido",
  av_checklist_confirmed: "✓ Confirmado",
  av_checklist_confirmation_saved: "Execução confirmada na checklist.",
  av_tutorial_station: "Estação",
  av_tutorial_waypoint: "Waypoint",
  av_tutorial_position: "posição didática",
});

Object.assign(NAV_I18N.en, {
  app_title: "MyFlyApp",
  tab_dashboard: "Dashboard",
  tab_flightplan: "Flight Plan",
  tab_training: "Training",
  tab_navigation: "Navigation",
  tab_e6b: "E6B",
  tab_instruments: "Instruments",
  tab_avionics: "Avionics Simulator",
  tab_massbalance: "Mass & Balance",
  freq_title: "Frequencies",
  freq_warning: "⚠️ Warning: these frequencies are informational only and may be incorrect or out of date. Always confirm them in the current chart/eAIP and NOTAMs.",
  atis_selected: "ATIS (selected airport)",
  lisboa_information: "Lisboa Information",
  freq_aerodrome: "Aerodrome",
  select_aerodrome: "Select an aerodrome",
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
  five_letter_map_title: "5-letter code map",
  open_five_letter_map: "Open in Google My Maps",
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
  vor_trainer_kicker: "Interactive training",
  vor_trainer_title: "VOR navigation — Porto and Viseu",
  vor_trainer_intro: "Tune a frequency, position the aircraft, and turn the OBS to understand radials, CDI deflection, and the TO/FROM indication.",
  vor_trainer_disclaimer: "Simplified educational demonstration. Do not use for real navigation: always confirm frequencies, serviceability, coverage, and limitations in the current AIP/eAIP and NOTAMs.",
  vor_frequency: "NAV frequency (MHz)",
  vor_tune: "Tune",
  vor_frequency_help: "Try 114.10 for PRT or 113.10 for VIS.",
  aircraft_heading: "Aircraft heading (HDG)",
  set_direct_heading: "Point at station",
  vor_obs_course: "Selected course (OBS)",
  center_to: "Centre TO",
  center_from: "Centre FROM",
  vor_map_hint: "Drag the aircraft or click the map to change position.",
  random_position: "New position",
  classic_vor: "Classic VOR",
  position_analysis: "Position readout",
  tuned_station: "Tuned station",
  distance_dme: "Geometric distance",
  radial_from: "Radial FROM",
  bearing_to: "Bearing TO",
  what_instruments_say: "What the instruments say",
  to_legend: "the selected course leads to the station",
  from_legend: "the selected course leads away from the station",
  cdi_legend: "fly towards the needle to intercept the course",
  vor_source_prefix: "Station data:",
  vor_declination_note: "The calculation applies the published 02° W VOR declination (2020 epoch); DME and coverage are approximate/not simulated.",
  vor_not_tuned: "Tune a valid VOR frequency to begin.",
  vor_not_tuned_explanation: "The instrument shows NAV/OFF when the frequency does not match PRT or VIS.",
  vor_station_tuned: "{id} tuned. You are on radial {radial}°; the station is on bearing {bearing}°.",
  vor_to_guidance: "TO · {needle}",
  vor_from_guidance: "FROM · {needle}",
  vor_off_guidance: "NAV/OFF · TO/FROM ambiguity zone.",
  vor_to_explanation: "Course {obs}° points towards the station. {turn}",
  vor_from_explanation: "Course {obs}° leads away from the station along the selected radial. To navigate to it, use Centre TO.",
  vor_off_explanation: "Close to the station or about 90° from the selected course, the TO/FROM indication becomes ambiguous.",
  vor_needle_centered: "CDI centred: maintain the selected course",
  vor_needle_left: "needle left: intercept to the left",
  vor_needle_right: "needle right: intercept to the right",
  vor_turn_left: "The station is {degrees}° left of the current heading.",
  vor_turn_right: "The station is {degrees}° right of the current heading.",
  vor_heading_aligned: "The heading is aligned with the station.",
  vor_geometric_distance: "geometric; not a DME substitute",
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
  e6b_tab_kicker: "External calculator",
  e6b_tab_title: "E6BX Flight Computer",
  e6b_tab_intro: "Online E6B calculator for flight calculations, conversions, and planning.",
  e6b_open: "Open E6BX in a new window",
  e6b_tab_note: "External tool provided by e6bx.com. If it does not load inside the tab, use the button to open the calculator in a new window.",
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
  av_kicker: "Avionics training",
  av_title: "Avionics Simulator",
  av_intro: "Practice the basic flows of a Garmin G5 connected to a GNS 430/430W: tuning, GPS/VLOC navigation, OBS, Direct-to, and HSI interpretation.",
  av_helper_button: "Helper",
  av_setup1_devices: "2× G5 + GNS 430/430W",
  av_setup2_devices: "GI-106A VOR/LOC + GNC 255",
  av_setup2_reset: "Reset Setup 2",
  av_setup2_tutorial_intro: "Four VFR levels and free mode. Position the aircraft on the map and fly at 90 KTS, using ←/→ to turn. CDI and TO/FROM follow position and OBS; GNC T/F displays the bearing TO or radial FROM.",
  av_setup2_auto_flag: "Automatic TO/FROM",
  av_setup2_free_option: "Free mode · GI-106A + GNC 255",
  av_setup2_free_title: "Free mode · VOR practice",
  av_setup2_free_briefing: "Tune a VOR on the GNC 255, adjust OBS and compare the GI-106A with the map position. Click or drag to position the aircraft; arrows turn its nose and Fly starts movement.",
  av_setup2_free_objective: "Explore position, OBS course, CDI and TO/FROM",
  av_setup2_free_step1: "Activate a station's NAV frequency from the list and confirm its identifier.",
  av_setup2_free_step2: "Adjust GI-106A OBS and move the aircraft on the map to observe CDI and TO/FROM.",
  av_setup2_free_step3: "Use Fly/Pause and ←/→ to control the aircraft. Heading does not change CDI while position stays fixed.",
  av_setup2_free_ready: "Free mode: instruments follow aircraft position, with no exercise grading.",
  av_setup2_check: "Check instruments",
  av_setup2_tutorial_ready: "Steps turn green automatically as you configure the instruments correctly.",
  av_setup2_tutorial_success: "Level complete. Compare the GI-106A with the map.",
  av_setup2_tutorial_power: "Power on the GI-106A and GNC 255 before checking.",
  av_setup2_tutorial_position: "The aircraft has moved away from this level's starting position. Reload the exercise or move it closer on the map.",
  av_setup2_tutorial_frequency: "Select NAV/VOR, activate the requested frequency, and confirm the station identifier.",
  av_setup2_tutorial_course: "Check the GI-106A OBS course; drag the OBS knob or use ←/→ while it is focused.",
  av_setup2_tutorial_tofrom: "Compare the simulator's TO/FROM indication with the objective and map.",
  av_setup2_tutorial_cdi: "The CDI is not centered yet. Compare course, position, and radial on the map.",
  av_setup2_level1_option: "Level 1 · Identify Viseu VOR",
  av_setup2_level1_title: "Level 1 · Tune and identify",
  av_setup2_level1_briefing: "The aircraft is west of Viseu. Practice transferring a standby NAV frequency to active and reading the VIS identifier.",
  av_setup2_level1_objective: "NAV 113.10 active · VOR · VIS identifier",
  av_setup2_level1_step1: "Select NAV on the GNC 255 with C/N if needed.",
  av_setup2_level1_step2: "Confirm 113.10 in standby and press ↔ (FLIP/FLOP).",
  av_setup2_level1_step3: "Read VIS · ID OK on the display; compare the station with the map.",
  av_setup2_level2_option: "Level 2 · Fly TO Viseu",
  av_setup2_level2_title: "Level 2 · TO course for Viseu",
  av_setup2_level2_briefing: "West of Viseu VOR, the approximate bearing to the station is 090°. Practice frequency, course, and CDI reading.",
  av_setup2_level2_objective: "NAV 113.10 · OBS 090° · TO · centered CDI",
  av_setup2_level2_step1: "Activate 113.10 on the GNC 255 and confirm VIS.",
  av_setup2_level2_step2: "Set OBS to 090° on the GI-106A; drag the knob or use ←/→.",
  av_setup2_level2_step3: "Compare TO and centered CDI with the bearing TO on the map.",
  av_setup2_level3_option: "Level 3 · Read a FROM radial",
  av_setup2_level3_title: "Level 3 · FROM radial at Viseu",
  av_setup2_level3_briefing: "The aircraft is east of Viseu, near the 090° radial. Compare the direction away from the station with FROM.",
  av_setup2_level3_objective: "NAV 113.10 · OBS 090° · FROM · centered CDI",
  av_setup2_level3_step1: "Activate 113.10 and confirm the VIS identifier.",
  av_setup2_level3_step2: "Set OBS to 090° and compare it with the map's FROM radial.",
  av_setup2_level3_step3: "Confirm automatic FROM and centered CDI; GNC T/F displays the radial.",
  av_setup2_level4_option: "Level 4 · Change to Porto VOR",
  av_setup2_level4_title: "Level 4 · New station, same method",
  av_setup2_level4_briefing: "The aircraft is south of Porto VOR. Repeat the process with another frequency and an approximate 000° course to the station.",
  av_setup2_level4_objective: "NAV 114.10 · OBS 000° · TO · centered CDI",
  av_setup2_level4_step1: "Transfer 114.10 into active NAV and confirm PRT · ID OK.",
  av_setup2_level4_step2: "Set OBS to 000° on the GI-106A.",
  av_setup2_level4_step3: "Compare TO, centered CDI, and bearing TO on the map.",
  av_local_badge: "LOCAL SIMULATION",
  av_disclaimer: "Simplified educational simulator. It is not a certified copy of the Garmin PC Trainer, does not use an official aeronautical database, and does not replace the manual, approved training, checklist, AIP/eAIP, NOTAMs, or pilot responsibility.",
  av_flight_state: "Flight state",
  av_flight_state_note: "Change these values to observe the instrument response.",
  av_heading_label: "Magnetic heading (HDG)",
  av_course_label: "Course / OBS",
  av_source_label: "NAV source",
  av_source_gps: "GPS",
  av_source_vloc: "VLOC",
  av_waypoint_label: "GPS waypoint",
  av_sync_heading: "Sync HDG bug",
  av_sync_course: "Centre course",
  av_status_label: "Status",
  av_status_ready: "Ready. Start with the checklist.",
  av_scenario_label: "Guided exercise",
  av_scenario_basic: "1 · Tune and view NAV",
  av_scenario_vor: "2 · Intercept a VLOC radial",
  av_scenario_direct: "3 · GPS Direct-to",
  av_scenario_basic_instruction: "Power the GNS, select NAV, and check the standby frequency before activating it.",
  av_scenario_vor_instruction: "Select VLOC, activate a NAV frequency, and turn OBS to compare the course with CDI guidance.",
  av_scenario_direct_instruction: "Select the waypoint, press D→, and confirm with ENT to practice a Direct-to.",
  av_reset: "Reset exercise",
  av_checklist_title: "Training checklist",
  av_check_1: "Power the GNS and identify the NAV page.",
  av_check_2: "Use the left knob to select COM or VLOC and flip-flop to activate standby.",
  av_check_3: "Toggle CDI between GPS and VLOC; use OBS to set the selected course.",
  av_check_4: "On the G5, read the source, CDI, heading, and heading bug before correcting.",
  av_manual_title: "Manuals and limits",
  av_manual_note: "The official manuals for the instruments present are gathered here for use during training. This tab's presentation and database are an independent implementation.",
  av_official_trainer: "Official PC Trainers",
  av_g5_manual: "Garmin G5 manual",
  av_gns_manual: "Garmin GNS 430/430W manual",
  av_gi106_manual: "Garmin GI-106A reference",
  av_gnc255_manual: "Garmin GNC 255 manual",
  av_tutorial_kicker: "Practical tutorial",
  av_tutorial_title: "Learn with a map and exercises",
  av_tutorial_intro: "Choose an exercise or Free mode. Position the aircraft on the map and press Fly to watch the instruments as it moves at 90 KTS.",
  av_tutorial_intro_option: "Level 0 · VOR introduction",
  av_tutorial_intro_badge: "LEVEL 0",
  av_tofrom_kicker: "Quick reading",
  av_tofrom_title: "TO or FROM? Read in this order",
  av_tofrom_intro: "TO/FROM describes the relationship between the selected course and the VOR station. It is not the direction of the aircraft nose.",
  av_tofrom_memory_label: "Quick TO and FROM rule",
  av_tofrom_memory_to: "towards the station",
  av_tofrom_memory_from: "away from the station",
  av_tofrom_to_heading: "course to the station",
  av_tofrom_to_rule: "With the CDI centered, the selected OBS/CRS points to the station.",
  av_tofrom_course_reading: "OBS/CRS",
  av_tofrom_to_course: "≈ Bearing TO",
  av_tofrom_map_reading: "On the map",
  av_tofrom_to_map: "Read Bearing TO; the FROM radial is reciprocal.",
  av_tofrom_from_heading: "radial leaving the station",
  av_tofrom_from_rule: "With the CDI centered, the selected OBS/CRS matches the radial leaving the station.",
  av_tofrom_from_course: "≈ Radial FROM",
  av_tofrom_from_map: "Read Radial FROM; Bearing TO is reciprocal.",
  av_tofrom_checklist_title: "Reading checklist",
  av_tofrom_check_1: "Confirm the active NAV/VLOC frequency and identifier (for example, VIS · ID OK).",
  av_tofrom_check_2: "Confirm the source: VLOC/VOR in Setup 1 or NAV/VOR in Setup 2.",
  av_tofrom_check_3: "Read OBS/CRS and CDI; only compare courses with the CDI centered.",
  av_tofrom_check_4: "Read the TO/FROM flag: TO = towards the station; FROM = away from it.",
  av_tofrom_check_5: "Finally compare Bearing TO and Radial FROM on the map: they are reciprocal.",
  av_tofrom_setup_title: "Where to make each reading",
  av_tofrom_setup1_reading: "on the GNS confirm VLOC and ID; on the G5 HSI read source, CRS/OBS, CDI, and TO/FROM.",
  av_tofrom_setup2_reading: "on the GNC 255 confirm NAV and ID; on the GI-106A read OBS, CDI, and the flag; use T/F to view Bearing TO or Radial FROM.",
  av_tofrom_example_title: "Viseu (VIS) example",
  av_tofrom_example_west_label: "West of VIS",
  av_tofrom_example_west: "· Bearing TO 090° / Radial FROM 270°. OBS 090° + centered CDI = TO.",
  av_tofrom_example_east_label: "East of VIS",
  av_tofrom_example_east: "· Radial FROM 090° / Bearing TO 270°. OBS 090° + centered CDI = FROM.",
  av_tofrom_heading_label: "Mind the HDG:",
  av_tofrom_heading_note: "heading shows where the nose points; it does not determine TO/FROM. With wind, HDG and OBS/CRS can have different values.",
  av_tutorial_select: "Exercise / mode",
  av_tutorial_vis_to_option: "Level 1 · Viseu VOR — fly TO",
  av_tutorial_vis_from_option: "Level 2 · Viseu VOR — FROM radial",
  av_tutorial_prt_option: "Level 3 · Porto VOR — fly TO",
  av_tutorial_gps_option: "Level 4 · GPS — Direct-to LPPR",
  av_tutorial_map_option: "Level 5 · GNS 430 — Map Page",
  av_tutorial_load: "Load exercise",
  av_tutorial_check: "Check HSI",
  av_tutorial_next: "Next example",
  av_tutorial_free_option: "Free mode · test instruments",
  av_tutorial_free_badge: "FREE MODE",
  av_tutorial_load_free: "Load free mode",
  av_tutorial_go: "Fly · 90 KTS",
  av_tutorial_pause: "Pause flight",
  av_tutorial_flight_running: "Flight in progress",
  av_touch_group: "Group / field",
  av_mobile_button: "Mobile mode",
  av_mobile_enable: "Enable touch controls",
  av_mobile_disable: "Return to the normal layout",
  av_touch_page: "Page / value · CRSR",
  av_touch_decrease: "Decrease",
  av_touch_increase: "Increase",
  av_touch_turn_left: "Turn aircraft left 5°",
  av_touch_turn_right: "Turn aircraft right 5°",
  av_touch_controls_hint: "On touch: use −/+ to turn, hold to repeat, or drag the knob. Tap the centre to press.",
  av_touch_map_hint: "Tap the map or drag the aircraft to position it. Use ↶/↷ to turn its nose; hold to keep turning.",
  av_tutorial_map_hint: "The line connects the aircraft to the reference. Geometry is educational: distance, bearing, and radial are not certified DME.",
  av_setup2_map_keyboard_hint: "Click or drag to position the aircraft. Use ←/→ to turn its nose by 5° and Fly to move at 90 KTS.",
  av_navaids_title: "VOR/DME stations",
  av_navaids_station: "Station / type",
  av_navaids_frequency: "Frequency / channel",
  av_navaids_locate: "Locate on map",
  av_navaids_source: "Source: NAV Portugal eAIP · ENR 4.1",
  av_navaids_hint: "Click a name to locate the station on the map, then tune its frequency on the instrument. Arouca and Marão are DME: they are map references and do not provide VOR indications in these setups.",
  av_waypoint_unavailable: "Waypoint unavailable: use a local aerodrome or an identifier from the station list.",
  av_tutorial_objective: "Objective",
  av_tutorial_aircraft: "Aircraft",
  av_tutorial_reference: "Reference",
  av_tutorial_bearing: "Bearing TO",
  av_tutorial_radial: "Radial FROM",
  av_tutorial_ready: "Steps turn green automatically when the configuration is correct. Use Check HSI to check the full exercise.",
  av_tutorial_step_done: "Step correct",
  av_tutorial_step_pending: "Step pending",
  av_tutorial_step_note: "Reading tip — not automatically assessed",
  av_g5_menu_heading: "Heading",
  av_g5_menu_course: "Course",
  av_g5_menu_bearing: "Bearing Pointer",
  av_g5_menu_back: "Back",
  av_g5_menu_hint: "Turn/drag the knob to highlight an option (continue to PFD to return to attitude); press to select.",
  av_g5_pfd_menu_hint: "Press the knob, turn/drag to HSI, then press again to change page.",
  av_g5_heading_help: "Turn to adjust the heading bug. Press the knob to open/confirm the menu; press and hold to synchronize with the current heading.",
  av_g5_course_help: "Drag to adjust CRS/OBS. Press the knob to confirm and return to HDG.",
  av_g5_course_unavailable: "Activate VLOC or OBS on the GNS to adjust the course.",
  av_tutorial_success: "Exercise complete. Now compare your HSI with the map readout.",
  av_tutorial_not_yet: "Not yet. Check NAV source, active frequency, OBS/course, and heading.",
  av_tutorial_free_title: "Free mode — test instruments",
  av_tutorial_free_briefing: "Place the aircraft anywhere on the map and experiment without a fixed objective or right answer. The visual reference follows the tuned VOR; consult the station list beside the map.",
  av_tutorial_free_objective: "Free position · flight at 90 KTS · turns with ←/→",
  av_tutorial_free_step1: "Click a map position or drag the blue aircraft to the desired starting point.",
  av_tutorial_free_step2: "Press Fly to start moving at 90 KTS.",
  av_tutorial_free_step3: "Use the ←/→ keys to turn 5° at a time and watch the G5/GNS.",
  av_tutorial_free_ready: "Free mode ready. Position the aircraft, configure the instruments, and press Fly.",
  av_tutorial_vis_to_title: "Viseu VOR — fly TO",
  av_tutorial_vis_to_briefing: "The aircraft is west of Viseu VOR. Fly to the station using the GNS in VLOC and the G5 as an HSI.",
  av_tutorial_vis_to_objective: "113.10 · VLOC · OBS 090° · HDG 090° · TO indication",
  av_tutorial_vis_to_step1: "On the GNS, select VLOC and flip-flop 113.10 into the active frequency.",
  av_tutorial_vis_to_step2: "Press CDI until the G5/GNS show VLOC; confirm the Viseu identifier.",
  av_tutorial_vis_to_step3: "On the G5 HSI, press the knob, select Course and drag to CRS 090°. Press to confirm.",
  av_tutorial_vis_to_step4: "With the G5 HSI knob in HDG, drag to BUG 090° and confirm TO with a centered CDI.",
  av_tutorial_vis_from_title: "Viseu VOR — FROM radial",
  av_tutorial_vis_from_briefing: "The aircraft is east of Viseu VOR. Practice the difference between a FROM radial and a TO course: the radial is 090°, while the course to the station would be 270°.",
  av_tutorial_vis_from_objective: "113.10 · VLOC · OBS 090° · HDG 090° · FROM indication",
  av_tutorial_vis_from_step1: "Activate VLOC 113.10 and select VLOC as the CDI source.",
  av_tutorial_vis_from_step2: "In the G5 HSI menu, select Course, set CRS 090° and press to confirm: this is the radial leaving the station.",
  av_tutorial_vis_from_step3: "With the G5 HSI knob in HDG, set BUG 090°; confirm FROM with a centered CDI.",
  av_tutorial_vis_from_step4: "To fly back to the station, use Centre TO mentally: the course would be 270°.",
  av_tutorial_prt_title: "Porto VOR — intercept TO",
  av_tutorial_prt_briefing: "The aircraft is south of Porto VOR. Use a northbound course to intercept the station and practice reading TO on the HSI.",
  av_tutorial_prt_objective: "114.10 · VLOC · OBS 000° · HDG 000° · TO indication",
  av_tutorial_prt_step1: "Activate 114.10 on VLOC and confirm that CDI is on VLOC.",
  av_tutorial_prt_step2: "In the G5 HSI menu, select Course, set CRS 000° and press to confirm: the course points toward Porto VOR.",
  av_tutorial_prt_step3: "With the G5 HSI knob in HDG, set BUG 000° and confirm TO with a centered CDI.",
  av_tutorial_prt_step4: "Compare bearing TO and radial FROM on the map; do not confuse the two values.",
  av_tutorial_gps_title: "GPS — Direct-to LPPR",
  av_tutorial_gps_briefing: "The aircraft is south of LPPR. Practice a GPS Direct-to and confirm on the G5 that the source is GPS, not VLOC.",
  av_tutorial_gps_objective: "GPS · LPPR · Direct-to · CRS 000° · HDG 000°",
  av_tutorial_gps_step1: "Select GPS as CDI source and LPPR as the waypoint.",
  av_tutorial_gps_step2: "Press D→ on the GNS, confirm LPPR with ENT, and return to the NAV page.",
  av_tutorial_gps_step3: "Activate OBS on the GNS. In the G5 HSI menu, select OBS, set CRS 000° and press to confirm.",
  av_tutorial_gps_step4: "With the G5 HSI knob in HDG, set BUG 000°; observe the CDI before starting flight.",
  av_tutorial_map_title: "Level 5 · GNS 430 — Map Page",
  av_tutorial_map_briefing: "Use the GNS 430 MAP page to connect the aircraft symbol to LPPR and interpret range, track, and navigation data fields.",
  av_tutorial_map_objective: "MAP · GPS · LPPR · 20 NM range · read TRK/BRG/DTK/DIS/GS",
  av_tutorial_map_step1: "With CRSR off, turn the outer right knob to NAV and the inner knob to the MAP page.",
  av_tutorial_map_step2: "Press RNG− once to select 20 NM and confirm that GPS source and the LPPR waypoint are visible.",
  av_tutorial_map_step3: "Read TRK, BRG, DTK, DIS, and GS; compare the GNS aircraft/line/waypoint with the tutorial map.",
  av_tutorial_map_step4: "On the G5, set the heading bug to 035° and compare the bug with the BRG/DTK shown on the Map Page.",
  av_checklist_kicker: "Challenge confirmation",
  av_challenge_checklist_title: "Level execution checklist",
  av_challenge_checklist_intro: "Open each level, perform its steps, and confirm it when the objective is validated. The checklist only lasts for this browser session.",
  av_checklist_setup1: "Setup 1 · G5 + GNS 430/430W",
  av_checklist_setup2: "Setup 2 · GI-106A + GNC 255",
  av_checklist_open: "Open level",
  av_checklist_confirm: "Confirm execution",
  av_checklist_confirmed_button: "Confirmed",
  av_checklist_pending: "Not started",
  av_checklist_in_progress: "In progress",
  av_checklist_ready: "Objective reached",
  av_checklist_confirmed: "✓ Confirmed",
  av_checklist_confirmation_saved: "Execution confirmed in the checklist.",
  av_tutorial_station: "Station",
  av_tutorial_waypoint: "Waypoint",
  av_tutorial_position: "educational position",
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
