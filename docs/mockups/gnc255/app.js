(() => {
  "use strict";

  const functionGroups = [
    {
      key: "com", label: "COM FREQUENCY LIST", items: [
        ["com-recent", "RECENT FREQS", "20 entries"],
        ["com-user", "USER FREQS", "15 slots"],
        ["com-database", "DATABASE", "identifier"],
        ["com-apt", "NEAREST APT", "25 nearest"],
        ["com-acc", "NEAREST ACC", "25 nearest"],
        ["com-fss", "NEAREST FSS", "25 nearest"],
        ["com-wx", "NEAREST WX", "25 nearest"]
      ]
    },
    {
      key: "nav", label: "NAV FREQUENCY LIST", items: [
        ["nav-recent", "RECENT FREQS", "20 entries"],
        ["nav-user", "USER FREQS", "15 slots"],
        ["nav-database", "DATABASE", "identifier"],
        ["nav-vor", "NEAREST VOR", "25 nearest"]
      ]
    },
    {
      key: "extras", label: "COM AUXILIARY STATES", items: [
        ["com-reverse", "REVERSE LOOK-UP", "WPT + type"],
        ["com-connext", "CONNEXT SETUP", "position source"],
        ["com-remote", "REMOTE FREQ RECALL", "standby queue"],
        ["com-emergency", "EMERGENCY CHANNEL", "121.500"],
        ["com-stuck", "STUCK MIC", "35 seconds"]
      ]
    },
    {
      key: "ics", label: "ICS CONFIGURATION", items: [
        ["ics-intercom", "ADJUST INTRCOM", "SQ / VOL / MUTE"],
        ["ics-aux", "AUX AUDIO", "ON / VOL / MUTE"],
        ["ics-onoff", "INTRCOM ON/OFF", "toggle"],
        ["ics-speaker", "SPEAKER ON/OFF", "toggle"]
      ]
    },
    {
      key: "sys", label: "SYS CONFIGURATION", items: [
        ["sys-spacing", "COM SPACING", "8.33 / 25 kHz"],
        ["sys-sidetone", "COM SIDETONE", "offset / fixed"],
        ["sys-brightness", "DSPL BRT", "-10 to 100"],
        ["sys-contrast", "DSPL CONTRAST", "-50 to 50"],
        ["sys-database", "DATABASE INFO", "cycle / date"],
        ["sys-load", "LOAD DATABASE", "USB update"],
        ["sys-software", "SOFTWARE VER", "unit / COM"],
        ["sys-serial", "SERIAL NUMBER", "system ID"]
      ]
    },
    {
      key: "timer", label: "TMR CONFIGURATION", items: [
        ["timer-down", "COUNT DOWN", "H / M / S"],
        ["timer-up", "COUNT UP", "start / stop"],
        ["timer-view", "VIEW TIMERS", "COM display"]
      ]
    }
  ];

  const examples = {
    com: [
      ["LPPR TWR", "118.000", "TWR"], ["LPPR ATIS", "121.105", "ATIS"], ["PORTO APP", "119.105", "APP"], ["LISBON ACC", "132.850", "ACC"]
    ],
    nav: [
      ["PRT", "114.100", "VOR"], ["VIS", "112.300", "VOR"], ["LPPR ILS", "109.500", "ILS"], ["LIS LOC", "110.300", "LOC"]
    ]
  };

  const state = {
    powered: true,
    mode: "COM",
    screen: "main",
    selectedFunction: null,
    active: { COM: "123.450", NAV: "114.100" },
    standby: { COM: "124.550", NAV: "112.300" },
    monitor: false,
    sq: true,
    navId: false,
    volume: 72,
    tfMode: "TO",
    obs: 275,
    cdi: -2,
    timerDown: 0,
    timerDownStart: 300,
    timerUp: 482,
    timerRunning: false,
    timerDownRunning: false,
    userCom: [["LOCAL TWR", "123.450", "TWR"]],
    toast: "Pronto para interação."
  };

  const $ = (selector) => document.querySelector(selector);
  const display = $("#display");
  const eventLog = $("#event-log");
  const screenCaption = $("#screen-caption");
  const inspectorTitle = $("#inspector-title");
  const inspectorCopy = $("#inspector-copy");
  const inspectorStats = $("#inspector-stats");

  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const fmt = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const functionEntry = (key) => functionGroups.flatMap((group) => group.items.map((item) => ({ group, item }))).find(({ item }) => item[0] === key);

  function setToast(message, positive = false) {
    state.toast = message;
    eventLog.textContent = message;
    eventLog.classList.toggle("toast", positive);
  }

  function stat(label, value) {
    return `<div class="stat"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;
  }

  function renderFunctionTree() {
    const current = state.selectedFunction;
    $("#function-tree").innerHTML = functionGroups.map((group) => `
      <div class="tree-group">
        <div class="tree-group-title">${esc(group.label)}</div>
        ${group.items.map(([id, label, hint]) => `
          <button class="tree-item ${current === id ? "is-selected" : ""}" data-function="${id}">
            <b>${esc(label)}</b><span>${esc(hint)}</span>
          </button>`).join("")}
      </div>`).join("");
    $("#tree-count").textContent = `${functionGroups.reduce((total, group) => total + group.items.length, 0)} estados`;
  }

  function renderMain() {
    const mode = state.mode;
    const isCom = mode === "COM";
    const active = state.active[mode];
    const standby = state.standby[mode];
    const navLine = isCom ? `NAV ${state.active.NAV} <small>${state.navId ? "ID" : "--"}</small>` : `NAV ID ${state.navId ? "ON" : "OFF"}`;
    const timerValue = state.timerDownRunning || state.timerDown > 0 ? fmt(state.timerDown) : state.timerUp > 0 ? fmt(state.timerUp) : "--:--";
    display.innerHTML = `
      <div class="display-topline"><span class="active-status">${state.sq ? "SQ" : "RX"}</span><span>${isCom ? "COM" : "NAV"}</span><span>${state.monitor ? "MN" : "STB"}</span></div>
      <div class="display-frequencies">
        <div class="frequency-block is-active"><small>ACT</small><strong>${esc(active)}</strong><div class="freq-meta"><span>${isCom ? "COM" : "VLOC"}</span><span>${isCom ? "LPPR TWR" : "PRT"}</span></div></div>
        <div class="frequency-block"><small>${state.monitor ? "MON" : "STB"}</small><strong>${esc(standby)}</strong><div class="freq-meta"><span>${isCom ? "COM" : "VLOC"}</span><span>${isCom ? "KLS ATIS" : "VIS"}</span></div></div>
      </div>
      <div class="display-nav"><span>${navLine}</span><span>VOL ${String(state.volume).padStart(3, "0")}</span></div>
      <div class="display-footline"><span>COM VOL ${"▰".repeat(Math.round(state.volume / 10))}${"▱".repeat(10 - Math.round(state.volume / 10))}</span><strong>${timerValue}</strong></div>`;
    screenCaption.textContent = `${mode} RADIO`;
    inspectorTitle.textContent = `${mode} radio`;
    inspectorCopy.textContent = isCom ? "Estado principal de comunicação, com frequência ativa/standby, indicação de modo, volume e identificação da estação." : "Estado de navegação VLOC, com frequência ativa/standby, identificação NAV, áudio Morse e ligação ao OBS/CDI.";
    inspectorStats.innerHTML = stat("ACTIVE", active) + stat("STANDBY", standby) + stat("SPACING", "8.33 kHz") + stat("MONITOR", state.monitor ? "ON" : "OFF");
  }

  function renderObs() {
    display.innerHTML = `
      <div class="display-topline"><span class="active-status">NAV</span><span>OBS MODE</span><span>PRT</span></div>
      <div class="display-nav"><span>VOR IDENT ${state.navId ? "PRT" : "--"}</span><span>FREQ ${state.active.NAV}</span></div>
      <div class="cdi-row">${String(state.obs).padStart(3, "0")}° · ${state.cdi < 0 ? "◀" : "▶"} CDI ${Math.abs(state.cdi)} DOTS<span class="cdi-line">• • • ◀ ▲ • • •</span></div>
      <div class="display-footline"><span>TO/FROM ${state.tfMode}</span><strong>OBS / CDI</strong></div>`;
    screenCaption.textContent = "OBS / CDI";
    inspectorTitle.textContent = "OBS / CDI graphic";
    inspectorCopy.textContent = "Vista de curso selecionado e desvio CDI em escala educativa. A indicação TO/FROM é mantida como estado separado no mockup.";
    inspectorStats.innerHTML = stat("COURSE", `${String(state.obs).padStart(3, "0")}°`) + stat("CDI", `${state.cdi} dots`) + stat("SOURCE", "VLOC") + stat("IDENT", state.navId ? "PRT" : "OFF");
  }

  function renderTf() {
    const bearing = state.tfMode === "TO" ? 274 : 94;
    display.innerHTML = `
      <div class="display-topline"><span class="active-status">NAV</span><span>T/F + DST</span><span>PRT</span></div>
      <div class="display-nav"><span>${state.tfMode} ${bearing}°</span><span>VOR ${state.active.NAV}</span></div>
      <div class="data-grid"><span>DIST <b>14.6 NM</b></span><span>GS <b>112 KT</b></span><span>BRG ${state.tfMode} <b>${bearing}°</b></span><span>TIME <b>00:08</b></span></div>
      <div class="display-footline"><span>GPS / DME INPUT</span><strong>${state.tfMode}</strong></div>`;
    screenCaption.textContent = "TO / FROM + DST";
    inspectorTitle.textContent = "TO / FROM + DST";
    inspectorCopy.textContent = "Bearing TO/FROM e dados Distance/Speed/Time apresentados na zona inferior do display NAV, conforme a disponibilidade de fonte externa.";
    inspectorStats.innerHTML = stat("BEARING", `${bearing}° ${state.tfMode}`) + stat("DISTANCE", "14.6 NM") + stat("GROUND SPEED", "112 KT") + stat("TIME", "00:08");
  }

  function renderFunctionHome() {
    const selected = state.selectedFunction || "com-recent";
    const entry = functionEntry(selected);
    display.innerHTML = `
      <div class="function-title"><span>FUNCTIONS</span><em>TURN INNER KNOB</em></div>
      <div class="function-list">${functionGroups.map((group) => `<span class="${entry && entry.group.key === group.key ? "is-selected" : ""}"><b>${esc(group.label)}</b><small>${group.items.length} pages</small></span>`).join("")}</div>
      <div class="display-footline"><span>ENT SELECT</span><strong>${entry ? esc(entry.item[1]) : "SELECT"}</strong></div>`;
    screenCaption.textContent = "FUNCTION MODE";
    inspectorTitle.textContent = "Function mode";
    inspectorCopy.textContent = "A tecla FUNC abre as categorias COM, ICS, SYS e TMR. Usa a árvore à direita para rever cada página e o respetivo arranjo do display.";
    inspectorStats.innerHTML = stat("CATEGORIES", "5") + stat("PAGES", "26") + stat("SELECTED", entry ? entry.item[1] : "--") + stat("INPUT", "FUNC / ENT");
  }

  function listMarkup(rows, columns = ["IDENT", "FREQ", "TYPE"]) {
    return `<div class="function-title"><span>${columns.join(" · ")}</span><em>ENT / FLIP</em></div><div class="function-list">${rows.map((row, index) => `<span class="${index === 0 ? "is-selected" : ""}"><b>${esc(row[0])} · ${esc(row[1])}</b><small>${esc(row[2])}</small></span>`).join("")}</div>`;
  }

  function renderFunctionPage(id) {
    const entry = functionEntry(id);
    if (!entry) return renderFunctionHome();
    const [key, label, hint] = entry.item;
    const com = key.startsWith("com-");
    const nav = key.startsWith("nav-");
    const list = com ? examples.com : examples.nav;
    let content = "";
    if (key === "com-reverse") {
      content = `<div class="function-title"><span>REVERSE LOOK-UP</span><em>GPS POSITION</em></div><div class="data-grid"><span>IDENT <b>LPPR</b></span><span>TYPE <b>TWR +</b></span><span>FREQ <b>118.000</b></span><span>SOURCE <b>DATABASE</b></span></div>`;
    } else if (key === "com-connext") {
      content = `<div class="function-title"><span>CONNEXT SETUP</span><em>POSITION INPUT</em></div><div class="data-grid"><span>LINK <b>READY</b></span><span>POSITION <b>VALID</b></span><span>IDENT <b>LPPR</b></span><span>LOOK-UP <b>ON</b></span></div>`;
    } else if (key === "com-remote") {
      content = `<div class="function-title"><span>REMOTE FREQ RECALL</span><em>REMOTE SWITCH</em></div><div class="function-list"><span class="is-selected"><b>1 · 118.000</b><small>LPPR TWR</small></span><span><b>2 · 121.105</b><small>LPPR ATIS</small></span><span><b>3 · 119.105</b><small>PORTO APP</small></span></div>`;
    } else if (key === "com-emergency") {
      content = `<div class="function-title"><span>EMERGENCY CHANNEL</span><em>HOLD FLIP/FLOP</em></div><div class="cdi-row">121.500<span class="cdi-line">ACTIVE · COM LOCK READY</span></div>`;
    } else if (key === "com-stuck") {
      content = `<div class="function-title"><span>STUCK MIC</span><em>RX MODE</em></div><div class="data-grid"><span>KEYED <b>35 SEC+</b></span><span>TRANSMIT <b>DISABLED</b></span><span>ACTIVE <b>123.450</b></span><span>ACTION <b>RELEASE PTT</b></span></div>`;
    } else if (com || nav) {
      content = listMarkup(list, ["WPT", "FREQ", "TYPE"]);
    } else if (key === "ics-intercom") {
      content = `<div class="function-title"><span>ADJUST INTRCOM</span><em>ENT SAVE</em></div><div class="data-grid"><span>ICS SQ <b>AUTO</b></span><span>ICS VOL <b>070</b></span><span>MUTE ON RX <b>ON</b></span><span>INTERCOM <b>ON</b></span></div>`;
    } else if (key === "ics-aux") {
      content = `<div class="function-title"><span>AUX AUDIO</span><em>ENT SAVE</em></div><div class="data-grid"><span>AUX AUDIO <b>ON</b></span><span>VOLUME <b>045</b></span><span>MUTE ON RX <b>OFF</b></span><span>STATE <b>READY</b></span></div>`;
    } else if (key.startsWith("ics-")) {
      content = `<div class="function-title"><span>${esc(label)}</span><em>TURN INNER</em></div><div class="data-grid"><span>VALUE <b>ON</b></span><span>PRESS ENT <b>SAVE</b></span></div>`;
    } else if (key === "sys-spacing") {
      content = `<div class="function-title"><span>COM SPACING</span><em>SELECT</em></div><div class="data-grid"><span>CHANNEL SPACING <b>8.33 kHz</b></span><span>OPTION <b>25 kHz</b></span></div>`;
    } else if (key === "sys-sidetone") {
      content = `<div class="function-title"><span>COM SIDETONE</span><em>V2.10+</em></div><div class="data-grid"><span>MODE <b>OFFSET</b></span><span>OFFSET <b>+00</b></span></div>`;
    } else if (key === "sys-brightness" || key === "sys-contrast") {
      const isBrightness = key === "sys-brightness";
      content = `<div class="function-title"><span>${esc(label)}</span><em>TURN INNER</em></div><div class="cdi-row">${isBrightness ? "+32" : "+04"}<span class="cdi-line">▱ ▰ ▰ ▰ ▰ ▰ ▰ ▱ ▱ ▱</span></div>`;
    } else if (key === "sys-database") {
      content = `<div class="function-title"><span>DATABASE INFO</span><em>FUNC EXIT</em></div><div class="data-grid"><span>CYCLE <b>2409</b></span><span>EFFECTIVE <b>09/2026</b></span><span>STATUS <b>VALID</b></span><span>SOURCE <b>LOCAL</b></span></div>`;
    } else if (key === "sys-load") {
      content = `<div class="function-title"><span>LOAD DATABASE</span><em>USB READY</em></div><div class="data-grid"><span>FLASH <b>GNC255.CDB</b></span><span>VERSION <b>2409</b></span><span>UNIT ID <b>7A3C91</b></span><span>PRESS ENT <b>START</b></span></div>`;
    } else if (key === "sys-software") {
      content = `<div class="function-title"><span>SOFTWARE VER</span><em>FUNC EXIT</em></div><div class="data-grid"><span>UNIT <b>2.10</b></span><span>COM <b>2.10</b></span><span>NAV <b>2.10</b></span><span>DISPLAY <b>OK</b></span></div>`;
    } else if (key === "sys-serial") {
      content = `<div class="function-title"><span>SERIAL NUMBER</span><em>FUNC EXIT</em></div><div class="cdi-row">7A3C91E8<span class="cdi-line">SYSTEM ID · FLYGARMIN</span></div>`;
    } else if (key === "timer-down" || key === "timer-up" || key === "timer-view") {
      content = `<div class="function-title"><span>${esc(label)}</span><em>ENT START / CLR RESET</em></div><div class="data-grid"><span>COUNT DOWN <b>${fmt(state.timerDown)}</b></span><span>COUNT UP <b>${fmt(state.timerUp)}</b></span><span>DISPLAY <b>${state.timerDownRunning ? "DOWN" : "UP"}</b></span><span>STATE <b>${state.timerRunning ? "RUNNING" : "PAUSED"}</b></span></div>`;
    }
    display.innerHTML = content + `<div class="display-footline"><span>${esc(hint)}</span><strong>${esc(label)}</strong></div>`;
    screenCaption.textContent = label;
    inspectorTitle.textContent = label;
    inspectorCopy.textContent = `Mockup da página ${label}, com labels e valores de exemplo para comparar a hierarquia visual e os estados de seleção do manual.`;
    inspectorStats.innerHTML = stat("GROUP", entry.group.label) + stat("PAGE", label) + stat("ACTION", "ENT / CLR") + stat("SAMPLE", hint);
  }

  function renderTimers() {
    display.innerHTML = `<div class="function-title"><span>TMR CONFIGURATION</span><em>ENT START / CLR RESET</em></div><div class="data-grid"><span>COUNT DOWN <b>${fmt(state.timerDown)}</b></span><span>START VALUE <b>${fmt(state.timerDownStart)}</b></span><span>COUNT UP <b>${fmt(state.timerUp)}</b></span><span>VISIBLE <b>${state.timerDownRunning ? "COUNT DOWN" : "COUNT UP"}</b></span></div><div class="display-footline"><span>COUNTDOWN TAKES PRECEDENCE</span><strong>${state.timerRunning ? "RUN" : "STOP"}</strong></div>`;
    screenCaption.textContent = "TIMER CONFIGURATION";
    inspectorTitle.textContent = "Timers";
    inspectorCopy.textContent = "Os contadores podem operar em simultâneo; o countdown tem prioridade na zona inferior do display COM/NAV quando está ativo.";
    inspectorStats.innerHTML = stat("COUNT DOWN", fmt(state.timerDown)) + stat("COUNT UP", fmt(state.timerUp)) + stat("STATE", state.timerRunning ? "RUNNING" : "PAUSED") + stat("VISIBLE", state.timerDownRunning ? "DOWN" : "UP");
  }

  function renderMessages() {
    display.innerHTML = `<div class="display-topline"><span class="active-status">MESSAGE</span><span>ALERT</span><span>ENT ACK</span></div><div class="function-title"><span>STUCK MIC</span><em>RECEIVE MODE</em></div><div class="data-grid"><span>TRANSMIT <b>35 SEC+</b></span><span>RADIO <b>RX ONLY</b></span><span>ACTION <b>RELEASE PTT</b></span><span>STATUS <b>ACK PENDING</b></span></div><div class="display-footline"><span>PRESS ENT TO ACKNOWLEDGE</span><strong>WARNING</strong></div>`;
    screenCaption.textContent = "MESSAGES / TROUBLESHOOTING";
    inspectorTitle.textContent = "Messages";
    inspectorCopy.textContent = "Galeria de estado de troubleshooting para rever o espaço de mensagens, ação requerida e retorno ao ecrã anterior.";
    inspectorStats.innerHTML = stat("MESSAGE", "STUCK MIC") + stat("ACTION", "RELEASE PTT") + stat("ACK", "ENT") + stat("RETURN", "PREVIOUS PAGE");
  }

  function renderDatabase() {
    display.innerHTML = `<div class="display-topline"><span class="active-status">SYS</span><span>DATABASE UPDATE</span><span>USB</span></div><div class="data-grid"><span>FLASH <b>GNC255.CDB</b></span><span>VERSION <b>2409</b></span><span>UNIT ID <b>7A3C91E8</b></span><span>EFFECTIVE <b>09/2026</b></span></div><div class="cdi-row">VERIFY VERSION<span class="cdi-line">[ ENT ] BEGIN UPDATE</span></div><div class="display-footline"><span>USB 2.0 · FAT32</span><strong>READY</strong></div>`;
    screenCaption.textContent = "LOAD DATABASE";
    inspectorTitle.textContent = "Load database";
    inspectorCopy.textContent = "Fluxo visual da página de atualização: dispositivo USB, versão no flash drive, confirmação ENT e estado de conclusão.";
    inspectorStats.innerHTML = stat("MEDIA", "USB 2.0") + stat("FORMAT", "FAT32") + stat("VERSION", "2409") + stat("STATUS", "READY");
  }

  function renderPowerOff() {
    display.innerHTML = `<div class="cdi-row">GNC 255<span class="cdi-line">POWER OFF</span></div>`;
    screenCaption.textContent = "POWER OFF";
    inspectorTitle.textContent = "Power off";
    inspectorCopy.textContent = "Estado de alimentação desligada. Pressiona o knob COM para voltar ao layout principal.";
    inspectorStats.innerHTML = stat("COM", "OFF") + stat("NAV", "OFF") + stat("DISPLAY", "DARK") + stat("ACTION", "PWR VOL");
  }

  function render() {
    renderFunctionTree();
    if (!state.powered) renderPowerOff();
    else if (state.screen === "main") renderMain();
    else if (state.screen === "obs") renderObs();
    else if (state.screen === "tf") renderTf();
    else if (state.screen === "functions") renderFunctionHome();
    else if (state.screen === "function") renderFunctionPage(state.selectedFunction);
    else if (state.screen === "timers") renderTimers();
    else if (state.screen === "messages") renderMessages();
    else if (state.screen === "database") renderDatabase();
    $("#power-status").textContent = state.powered ? "POWER ON · LOCAL STATE" : "POWER OFF";
    $("#monitor-label").textContent = `MON ${state.monitor ? "ON" : "OFF"}`;
    $("#standby-label").textContent = state.monitor ? "MN" : "STB";
    $("#timer-label").textContent = `TMR ${state.timerDownRunning || state.timerDown > 0 ? fmt(state.timerDown) : fmt(state.timerUp)}`;
    document.querySelectorAll(".quick-state").forEach((button) => {
      const active = button.dataset.screen === state.screen && (!button.dataset.mode || button.dataset.mode === state.mode);
      button.classList.toggle("is-active", active);
    });
  }

  function adjustFrequency(direction) {
    const mode = state.mode;
    const current = Number.parseFloat(state.standby[mode]);
    let next = current + direction * .025;
    if (mode === "COM") next = Math.max(118, Math.min(136.975, next));
    else next = Math.max(108, Math.min(117.950, next));
    state.standby[mode] = next.toFixed(3);
    state.screen = "main";
    setToast(`Standby ${mode} ajustada para ${state.standby[mode]}.`, true);
    render();
  }

  function handleAction(action) {
    if (action === "power") { state.powered = !state.powered; setToast(state.powered ? "Rádio ligado." : "Rádio desligado.", state.powered); render(); return; }
    if (!state.powered) return;
    if (action === "cn") { state.mode = state.mode === "COM" ? "NAV" : "COM"; state.screen = "main"; setToast(`Modo ${state.mode} selecionado.`, true); }
    if (action === "flip") { const mode = state.mode; [state.active[mode], state.standby[mode]] = [state.standby[mode], state.active[mode]]; state.screen = "main"; setToast(`${mode} FLIP/FLOP executado.`, true); }
    if (action === "tune-up") adjustFrequency(1);
    if (action === "tune-down") adjustFrequency(-1);
    if (action === "mon") { state.monitor = !state.monitor; setToast(`Monitor standby ${state.monitor ? "ligado" : "desligado"}.`, true); }
    if (action === "sq") { state.sq = !state.sq; setToast(`Squelch ${state.sq ? "automático" : "manual / aberto"}.`, true); }
    if (action === "nav-id") { state.navId = !state.navId; setToast(`NAV ID ${state.navId ? "ligado" : "desligado"}.`, true); }
    if (action === "obs") { state.screen = "obs"; }
    if (action === "tf") { state.tfMode = state.tfMode === "TO" ? "FROM" : "TO"; state.screen = "tf"; setToast(`Indicação ${state.tfMode}.`, true); }
    if (action === "func") { state.screen = "functions"; }
    if (action === "clr") { state.screen = "main"; state.selectedFunction = null; setToast("CLR: retorno ao ecrã principal."); }
    if (action === "ent") {
      if (state.screen === "messages") setToast("Mensagem reconhecida com ENT.", true);
      else if (state.screen === "timers" || (state.screen === "function" && state.selectedFunction && state.selectedFunction.startsWith("timer-"))) {
        state.timerDown = state.timerDown || state.timerDownStart;
        state.timerRunning = !state.timerRunning;
        state.timerDownRunning = state.timerRunning;
        setToast(`Timer ${state.timerRunning ? "iniciado" : "parado"}.`, true);
      } else setToast("ENT: valor confirmado.", true);
    }
    if (action === "volume-up") { state.volume = Math.min(100, state.volume + 5); setToast(`COM volume ${state.volume}.`, true); }
    if (action === "volume-down") { state.volume = Math.max(0, state.volume - 5); setToast(`COM volume ${state.volume}.`, true); }
    if (action === "save") { state.userCom.push(["USER " + String(state.userCom.length + 1).padStart(2, "0"), state.standby.COM, "USER"]); setToast(`Canal ${state.standby.COM} guardado em USER FREQS.`, true); }
    if (action === "emergency") { state.active.COM = "121.500"; state.standby.COM = "123.450"; state.mode = "COM"; state.screen = "main"; setToast("Emergency Channel 121.500 ativo.", true); }
    if (action === "database") { state.screen = "database"; }
    if (action === "timer-toggle") {
      state.screen = "timers";
      state.timerDown = state.timerDown || state.timerDownStart;
      state.timerRunning = !state.timerRunning;
      state.timerDownRunning = state.timerRunning;
      setToast(`Timer ${state.timerRunning ? "iniciado" : "parado"}.`, true);
    }
    if (action === "timer-reset") { state.timerDown = state.timerDownStart; state.timerUp = 0; state.timerRunning = false; state.timerDownRunning = false; setToast("Timers repostos e parados.", true); }
    render();
  }

  document.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) { handleAction(actionButton.dataset.action); return; }
    const stateButton = event.target.closest("[data-screen]");
    if (stateButton) {
      state.screen = stateButton.dataset.screen;
      if (stateButton.dataset.mode) state.mode = stateButton.dataset.mode;
      if (state.screen === "functions") state.selectedFunction = state.selectedFunction || "com-recent";
      setToast(`Estado ${state.screen.toUpperCase()} aberto.`);
      render();
      return;
    }
    const functionButton = event.target.closest("[data-function]");
    if (functionButton) {
      state.selectedFunction = functionButton.dataset.function;
      state.screen = "function";
      setToast(`Página ${functionEntry(state.selectedFunction).item[1]} aberta.`, true);
      render();
    }
  });

  window.setInterval(() => {
    if (state.timerRunning) state.timerUp += 1;
    if (state.timerDownRunning) {
      state.timerDown = Math.max(0, state.timerDown - 1);
      if (state.timerDown === 0) { state.timerDownRunning = false; setToast("Countdown chegou a zero e passou a count up.", true); }
    }
    if (state.screen === "timers" || state.screen === "main") render();
  }, 1000);

  render();
})();
