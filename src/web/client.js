// Artifacts MMO Agent — Web Client
// Connects to the WebSocket server, renders all panels in real-time.

const WS_URL = `ws://${location.host}`;
const MAX_LOG_LINES = 500;
const SKILLS = ['mining','woodcutting','fishing','weaponcrafting','gearcrafting','jewelrycrafting','cooking','alchemy'];

// ─── State ────────────────────────────────────────────────────────────────────

let ws = null;
let reconnectTimer = null;
let agentRunning = false;
let manualMode = false;
let currentScript = '';
let currentLine = 0;
let sessionStart = Date.now();
let runtimeTimer = null;

// Live character snapshot (from hello payload)
let characterSnapshot = null;

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
    case 'level_up':
      showLevelUpToast(msg.data.skill, msg.data.newLevel);
      appendLog('agentLog', `LEVEL UP! ${msg.data.skill} → ${msg.data.newLevel}`, 'agent');
      break;
    case 'error':
      appendLog('agentLog', `[ERROR] ${msg.data.message}`, 'error');
      break;
  }
}

function handleHello(data) {
  appendLog('agentLog', `[WS] Connected — character: ${data.character}`, 'system');
  if (data.characterSnapshot) {
    characterSnapshot = data.characterSnapshot;
  }
  if (typeof data.manualMode === 'boolean') {
    setManualMode(data.manualMode);
  }
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
  // Render skills immediately with whatever data we have
  const xpGains = data.state?.metrics?.xpGains ?? {};
  const xpPerHour = data.state?.metrics?.xpPerHour ?? {};
  renderSkills(xpGains, xpPerHour);
}

function handleStateUpdate(data) {
  if (!data) return;
  if (typeof data.manualMode === 'boolean') {
    setManualMode(data.manualMode);
  }
  if (data.characterSnapshot) {
    characterSnapshot = data.characterSnapshot;
    renderSkills(
      data.metrics?.xpGains ?? {},
      data.metrics?.xpPerHour ?? {}
    );
  }
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
    renderSkills(data.metrics.xpGains, data.xpPerHour ?? {});
  }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function showLevelUpToast(skill, level) {
  const toast = document.createElement('div');
  toast.className = 'toast-levelup';
  toast.innerHTML = `<span class="toast-icon">&#x2B06;</span> <strong>${skill}</strong> reached level <strong>${level}</strong>!`;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  // Fade out after 4s
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 4000);
}

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
  el('btnStart').disabled = agentRunning || manualMode;
  el('btnResume').disabled = agentRunning || manualMode;
  el('btnStop').disabled = !agentRunning;
  el('btnTakeControl').disabled = manualMode;
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

// XP required to reach each level (cumulative). Index = level.
// Approximate formula used by Artifacts MMO; enough for visual XP bar.
function xpForLevel(lvl) {
  // Each level roughly doubles: base 150xp, x1.2 factor per level
  if (lvl <= 1) return 0;
  let total = 0;
  for (let i = 1; i < lvl; i++) total += Math.floor(150 * Math.pow(1.2, i - 1));
  return total;
}

function renderSkills(xpGains, xpPerHour) {
  const container = el('skillsList');
  container.innerHTML = '';

  // Include 'combat' in addition to gathering/crafting skills
  const allSkills = [...SKILLS, 'combat'];

  for (const skill of allSkills) {
    const xpGained = xpGains[skill] ?? 0;
    const xphr = xpPerHour?.[skill] ?? 0;

    // Get live level from character snapshot
    const levelKey = skill === 'combat' ? 'level' : `${skill}_level`;
    const level = characterSnapshot?.[levelKey] ?? '-';

    const row = document.createElement('div');
    row.className = 'skill-row';

    const label = document.createElement('div');
    label.className = 'skill-label';
    const levelStr = level !== '-' ? `Lv${level}` : '';
    const xphrStr = xphr > 0 ? ` · ${xphr.toLocaleString()}/hr` : '';
    label.innerHTML =
      `<span class="skill-name">${skill}</span>` +
      `<span class="skill-info">${levelStr}${xphr > 0 ? xphrStr : ''}${xpGained > 0 ? ` +${xpGained.toLocaleString()} XP` : ''}</span>`;

    // XP bar: progress within current level
    let barPct = 0;
    if (typeof level === 'number' && xpGained > 0) {
      const lvlStart = xpForLevel(level);
      const lvlEnd = xpForLevel(level + 1);
      const span = lvlEnd - lvlStart || 1;
      const charXp = characterSnapshot?.[skill === 'combat' ? 'xp' : `${skill}_xp`] ?? 0;
      barPct = Math.min(100, ((charXp - lvlStart) / span) * 100);
    }

    const barWrap = document.createElement('div');
    barWrap.className = 'skill-bar';
    const fill = document.createElement('div');
    fill.className = 'skill-bar-fill';
    fill.style.width = barPct + '%';
    barWrap.appendChild(fill);

    row.appendChild(label);
    if (level !== '-' || xpGained > 0) {
      row.appendChild(barWrap);
      container.appendChild(row);
    }
  }

  // If nothing at all, show placeholder
  if (container.children.length === 0) {
    container.innerHTML = '<div style="color:var(--text2);font-size:11px;">No skill data yet</div>';
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

function takeControl() {
  send({ type: 'take_control' });
}

function releaseControl() {
  send({ type: 'release_control' });
}

function setManualMode(on) {
  manualMode = on;
  el('steerInput').closest('.steer-bar').style.display = on ? 'none' : '';
  el('manualBar').style.display = on ? 'flex' : 'none';
  el('btnTakeControl').style.display = on ? 'none' : '';
  el('btnReleaseControl').style.display = on ? '' : 'none';
  // Update status badge
  if (on) {
    const badge = el('statusBadge');
    badge.className = 'status-badge status-paused';
    badge.textContent = 'manual';
  }
  updateButtons();
}

function manualAction(dsl) {
  send({ type: 'manual_action', dsl });
}

function manualGoto() {
  const coords = prompt('Move to (x y):');
  if (!coords) return;
  const parts = coords.trim().split(/\s+/);
  if (parts.length === 2) {
    manualAction(`goto ${parts[0]} ${parts[1]}`);
  } else if (parts.length === 1) {
    manualAction(`goto ${parts[0]}`);
  }
}

function manualSend() {
  const input = el('manualInput').value.trim();
  if (!input) return;
  manualAction(input);
  el('manualInput').value = '';
}

function manualKeydown(e) {
  if (e.key === 'Enter') manualSend();
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
