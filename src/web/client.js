// Artifacts MMO Agent — Web Client
// Connects to the WebSocket server, renders all panels in real-time.

const WS_URL = `ws://${location.host}`;
const MAX_LOG_LINES = 500;
const SKILLS = ['mining','woodcutting','fishing','weaponcrafting','gearcrafting','jewelrycrafting','cooking','alchemy'];

// ─── State ────────────────────────────────────────────────────────────────────

let ws = null;
let reconnectTimer = null;
let agentRunning = false;
let currentScript = '';
let currentLine = 0;
let sessionStart = Date.now();
let runtimeTimer = null;

// XP tracking for rates
let xpSnapshot = {};
let xpSnapshotTime = Date.now();

// ─── WebSocket ────────────────────────────────────────────────────────────────

function connect() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    setConn(true);
    clearTimeout(reconnectTimer);
    appendLog('agentLog', '[WS] Connected to server', 'system');
  };

  ws.onclose = () => {
    setConn(false);
    appendLog('agentLog', '[WS] Connection lost — reconnecting...', 'system');
    reconnectTimer = setTimeout(connect, 3000);
  };

  ws.onerror = () => {};

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    handleMessage(msg);
  };
}

function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

// ─── Message handlers ─────────────────────────────────────────────────────────

function handleMessage(msg) {
  switch (msg.type) {
    case 'hello':
      handleHello(msg.data);
      break;
    case 'agent_log':
      appendLog('agentLog', msg.data.line, classifyAgentLine(msg.data.line));
      break;
    case 'execution_log':
      appendLog('execLog', msg.data.line, 'exec');
      break;
    case 'state_update':
      handleStateUpdate(msg.data);
      break;
    case 'stats_update':
      handleStatsUpdate(msg.data);
      break;
    case 'script_update':
      if (msg.data?.script) renderScript(msg.data.script, msg.data.currentLine ?? 0);
      break;
    case 'error':
      appendLog('agentLog', `[ERROR] ${msg.data.message}`, 'error');
      break;
  }
}

function handleHello(data) {
  appendLog('agentLog', `[WS] Connected — character: ${data.character}`, 'system');
  if (data.state) {
    handleStateUpdate(data.state);
    if (data.state.recentLog) {
      for (const line of data.state.recentLog.slice(-30)) {
        const cls = line.includes('[AGENT]') ? 'agent' : line.includes('[ERROR]') ? 'error' : 'exec';
        appendLog('execLog', line, cls);
      }
    }
    if (data.state.script) {
      renderScript(data.state.script, data.state.currentLine ?? 0);
    }
  }
}

function handleStateUpdate(data) {
  if (!data) return;
  if (data.script !== undefined && data.script !== currentScript) {
    currentScript = data.script;
    renderScript(data.script, data.currentLine ?? 0);
  }
  if (data.currentLine !== undefined) {
    currentLine = data.currentLine;
    highlightLine(currentLine);
  }
  if (data.status) {
    setStatus(data.status);
    agentRunning = data.status === 'running';
    updateButtons();
  }
  el('hdrLine').textContent = data.currentLine ?? '-';
}

function handleStatsUpdate(data) {
  el('hdrActions').textContent = data.metrics?.actionsExecuted ?? 0;
  el('hdrGold').textContent = data.metrics?.goldGained ?? 0;
  el('statStatus').textContent = data.status ?? '-';
  el('statActions').textContent = data.metrics?.actionsExecuted ?? 0;
  el('statGold').textContent = data.metrics?.goldGained ?? 0;
  el('statGoldHr').textContent = data.goldPerHour ?? 0;
  el('statRuntime').textContent = formatDuration(data.runtime ?? 0);
  el('hdrRuntime').textContent = formatDuration(data.runtime ?? 0);

  if (data.metrics?.xpGains) {
    renderSkills(data.metrics.xpGains);
  }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

function setConn(connected) {
  const dot = el('connDot');
  const label = el('connLabel');
  dot.className = 'conn-dot' + (connected ? ' connected' : '');
  label.textContent = connected ? 'Connected' : 'Disconnected';
}

function setStatus(status) {
  const badge = el('statusBadge');
  badge.className = `status-badge status-${status}`;
  badge.textContent = status;
}

function updateButtons() {
  el('btnStart').disabled = agentRunning;
  el('btnResume').disabled = agentRunning;
  el('btnStop').disabled = !agentRunning;
}

// ─── Log panels ───────────────────────────────────────────────────────────────

function appendLog(panelId, text, cls = 'exec') {
  const panel = el(panelId);
  const atBottom = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 40;

  const line = document.createElement('div');
  line.className = `log-line ${cls}`;
  line.textContent = text;
  panel.appendChild(line);

  // Trim to MAX_LOG_LINES
  while (panel.children.length > MAX_LOG_LINES) {
    panel.removeChild(panel.firstChild);
  }

  // Update count badge
  const countId = panelId === 'agentLog' ? 'agentCount' : 'execCount';
  el(countId).textContent = panel.children.length;

  if (atBottom) panel.scrollTop = panel.scrollHeight;
}

function classifyAgentLine(line) {
  if (line.includes('[HUMAN]')) return 'human';
  if (line.includes('[ERROR]') || line.toLowerCase().includes('error')) return 'error';
  if (line.includes('[WS]') || line.includes('[AGENT]')) return 'agent';
  return 'system';
}

// ─── Script viewer ────────────────────────────────────────────────────────────

function renderScript(script, activeLine) {
  currentScript = script;
  currentLine = activeLine;

  const body = el('scriptBody');
  body.innerHTML = '';

  const lines = script.split('\n');
  el('scriptLineInfo').textContent = `${activeLine}/${lines.length} lines`;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const isCurrent = lineNum === activeLine;

    const row = document.createElement('div');
    row.className = 'script-line' + (isCurrent ? ' current' : '');
    row.id = `sline-${lineNum}`;

    const gutter = document.createElement('div');
    gutter.className = 'script-gutter';
    gutter.textContent = lineNum;

    const arrow = document.createElement('div');
    arrow.className = 'script-arrow';
    arrow.textContent = isCurrent ? '→' : ' ';

    const text = document.createElement('div');
    text.className = 'script-text';
    text.innerHTML = highlightDSL(lines[i]);

    row.appendChild(gutter);
    row.appendChild(arrow);
    row.appendChild(text);
    body.appendChild(row);
  }

  if (activeLine > 0) scrollToLine(activeLine);
}

function highlightLine(lineNum) {
  // Remove current highlight
  const prev = el('scriptBody').querySelector('.script-line.current');
  if (prev) {
    prev.classList.remove('current');
    prev.querySelector('.script-arrow').textContent = ' ';
    prev.querySelector('.script-text').style.color = '';
  }

  const row = el(`sline-${lineNum}`);
  if (row) {
    row.classList.add('current');
    row.querySelector('.script-arrow').textContent = '→';
    scrollToLine(lineNum);
  }

  el('scriptLineInfo').textContent = `${lineNum}/${currentScript.split('\n').length} lines`;
  el('hdrLine').textContent = lineNum;
}

function scrollToLine(lineNum) {
  const row = el(`sline-${lineNum}`);
  if (row) {
    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function highlightDSL(line) {
  const esc = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Comments
  if (esc.trimStart().startsWith('#')) {
    return `<span class="cmt">${esc}</span>`;
  }

  return esc
    // keywords
    .replace(/\b(goto|gather|woodcut|mine|fish|fight|bank|equip|unequip|craft|npc|task|use|transition|rest|sleep|wait_cooldown|log|set|if|else|loop|forever|until|while)\b/g,
      '<span class="kw">$1</span>')
    // numbers
    .replace(/\b(-?\d+)\b/g, '<span class="num">$1</span>')
    // strings
    .replace(/"([^"]*)"/g, '<span class="str">"$1"</span>')
    // variables
    .replace(/\{\{(\w+)\}\}/g, '<span class="str">{{$1}}</span>');
}

// ─── Skills ───────────────────────────────────────────────────────────────────

function renderSkills(xpGains) {
  const container = el('skillsList');
  container.innerHTML = '';

  for (const skill of SKILLS) {
    const xp = xpGains[skill] ?? 0;

    const row = document.createElement('div');
    row.className = 'skill-row';

    const label = document.createElement('div');
    label.className = 'skill-label';
    label.innerHTML = `${skill} <span>+${xp} XP</span>`;

    const barWrap = document.createElement('div');
    barWrap.className = 'skill-bar';
    const fill = document.createElement('div');
    fill.className = 'skill-bar-fill';
    // Visual indicator: scale so 10k XP = full bar
    fill.style.width = Math.min(100, (xp / 10000) * 100) + '%';
    barWrap.appendChild(fill);

    row.appendChild(label);
    row.appendChild(barWrap);
    container.appendChild(row);
  }
}

// ─── Controls ────────────────────────────────────────────────────────────────

function agentStart() {
  send({ type: 'agent_start', resume: false });
  agentRunning = true;
  updateButtons();
}

function agentResume() {
  send({ type: 'agent_start', resume: true });
  agentRunning = true;
  updateButtons();
}

function agentStop() {
  send({ type: 'agent_stop' });
  agentRunning = false;
  updateButtons();
}

function steerSend() {
  const input = el('steerInput').value.trim();
  if (!input) return;
  send({ type: 'steer', input });
  appendLog('agentLog', `[HUMAN] ${input}`, 'human');
  el('steerInput').value = '';
}

function steerKeydown(e) {
  if (e.key === 'Enter') steerSend();
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

connect();
updateButtons();

// Runtime clock
runtimeTimer = setInterval(() => {
  const state = el('statStatus').textContent;
  if (state === 'running') {
    const runtime = Math.floor((Date.now() - sessionStart) / 1000);
    el('hdrRuntime').textContent = formatDuration(runtime);
  }
}, 1000);
