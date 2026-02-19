import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as dotenv from 'dotenv';
dotenv.config();

import { WebSocketServer, WebSocket } from 'ws';
import { ArtifactsAPI } from '../api';
import { Agent } from '../agent/agent';
import { loadState, saveState, ExecutionState } from '../engine/state';

const PORT = 3000;
const CHARACTER_NAME = 'greenglasses';
const AUTH_FILE = path.resolve(process.cwd(), 'auth_headers.txt');
const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'src', 'web');

// ─── Message protocol ─────────────────────────────────────────────────────────

export type MsgType =
  | 'agent_log'
  | 'execution_log'
  | 'state_update'
  | 'stats_update'
  | 'script_update'
  | 'level_up'
  | 'error'
  | 'hello';

export interface WsMessage {
  type: MsgType;
  ts: number;
  data: any;
}

// ─── Server ───────────────────────────────────────────────────────────────────

function loadApiToken(): string {
  const raw = fs.readFileSync(AUTH_FILE, 'utf8').trim();
  const match = raw.match(/Bearer\s+(\S+)/);
  if (!match) throw new Error('Could not parse Bearer token');
  return match[1];
}

function broadcast(wss: WebSocketServer, msg: WsMessage) {
  const payload = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function send(ws: WebSocket, msg: WsMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function msg(type: MsgType, data: any): WsMessage {
  return { type, ts: Date.now(), data };
}

// ─── HTTP handler (serves static files) ──────────────────────────────────────

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = req.url === '/' ? '/index.html' : (req.url ?? '/index.html');
  const filePath = path.join(PUBLIC_DIR, url);

  // Safety: stay within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const contentType: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
    };
    res.writeHead(200, { 'Content-Type': contentType[ext] ?? 'text/plain' });
    res.end(data);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const token = loadApiToken();
  const api = new ArtifactsAPI(token);

  // Single agent instance shared across connections
  let agent: Agent | null = null;
  let manualMode = false; // true when human has taken control

  const httpServer = http.createServer(serveStatic);
  const wss = new WebSocketServer({ server: httpServer });

  // ─── Stats tracking ──────────────────────────────────────────────────────

  // Snapshot of XP/gold for rate calculation
  const sessionStart = Date.now();
  let baselineXp: Record<string, number> = {};
  let baselineGold = 0;
  let sessionBaselineSet = false;

  function buildStatsUpdate(state: ExecutionState) {
    const runtime = Math.floor((Date.now() - sessionStart) / 1000);
    const hours = runtime / 3600 || 1;
    return {
      status: state.status,
      currentLine: state.currentLine,
      scriptLines: state.script.split('\n').length,
      metrics: state.metrics,
      xpPerHour: Object.fromEntries(
        Object.entries(state.metrics.xpGains).map(([k, v]) => [k, Math.round(v / hours)])
      ),
      goldPerHour: Math.round(state.metrics.goldGained / hours),
      runtime,
    };
  }

  // ─── Agent factory ───────────────────────────────────────────────────────

  function createAgent(): Agent {
    const a = new Agent(api, CHARACTER_NAME);

    a.onAgentLog = (line) => broadcast(wss, msg('agent_log', { line }));

    a.onExecutionLog = (line) => broadcast(wss, msg('execution_log', { line }));

    a.onStateChange = (state) => {
      broadcast(wss, msg('state_update', {
        status: state.status,
        currentLine: state.currentLine,
        script: state.script,
      }));
      broadcast(wss, msg('stats_update', buildStatsUpdate(state)));
    };

    a.onLevelUp = (skill, newLevel) => {
      broadcast(wss, msg('level_up', { skill, newLevel }));
    };

    return a;
  }

  // ─── WebSocket connection handler ────────────────────────────────────────

  wss.on('connection', async (ws) => {
    console.log('[WS] Client connected');

    // Send current state snapshot on connect
    const currentState = loadState();
    // Sanitise stale 'running' status: if no agent is actually running, mark as stopped
    if (currentState && currentState.status === 'running' && !agent) {
      currentState.status = 'stopped';
      saveState(currentState);
    }

    // Fetch live character data for skills panel (best-effort)
    let characterSnapshot: any = null;
    try {
      characterSnapshot = await api.getCharacter(CHARACTER_NAME);
    } catch { /* non-fatal */ }

    send(ws, msg('hello', {
      character: CHARACTER_NAME,
      characterSnapshot,
      manualMode,
      state: currentState ? {
        status: currentState.status,
        currentLine: currentState.currentLine,
        script: currentState.script,
        recentLog: currentState.executionLog.slice(-50),
        metrics: currentState.metrics,
      } : null,
    }));

    ws.on('message', async (raw) => {
      let cmd: any;
      try { cmd = JSON.parse(raw.toString()); } catch { return; }

      switch (cmd.type) {
        case 'agent_start': {
          if (agent) {
            send(ws, msg('error', { message: 'Agent already running' }));
            break;
          }
          agent = createAgent();
          const resume = !!cmd.resume;
          const humanInput: string | undefined = cmd.humanInput || undefined;
          broadcast(wss, msg('agent_log', { line: `[WS] Starting agent (resume=${resume})` }));
          agent.start({ resume, humanInput }).catch((err) => {
            broadcast(wss, msg('error', { message: err.message }));
            agent = null;
          }).then(() => { agent = null; });
          break;
        }

        case 'agent_stop': {
          if (agent) {
            agent.stop();
            agent = null;
            broadcast(wss, msg('agent_log', { line: '[WS] Agent stopped by user' }));
          }
          break;
        }

        case 'steer': {
          // Human steering: trigger immediate check-in with instruction
          if (!agent) {
            send(ws, msg('error', { message: 'No agent running to steer' }));
            break;
          }
          const input: string = cmd.input ?? '';
          broadcast(wss, msg('agent_log', { line: `[HUMAN] ${input}` }));
          // Trigger check-in via agent's checkin system
          // We reach it through the agent's public steer method
          if (typeof (agent as any).steer === 'function') {
            (agent as any).steer(input).catch((e: any) =>
              broadcast(wss, msg('error', { message: e.message }))
            );
          }
          break;
        }

        case 'script_run': {
          // Run a raw DSL script without agent
          const { ScriptExecutor } = await import('../engine/executor');
          const { createEmptyState } = await import('../engine/state');
          const script: string = cmd.script ?? '';
          const state = createEmptyState(script);
          state.status = 'running';
          const executor = new ScriptExecutor(api, CHARACTER_NAME, state);
          executor.onAction = (line) => broadcast(wss, msg('execution_log', { line }));
          executor.onStateChange = (s) => broadcast(wss, msg('stats_update', buildStatsUpdate(s)));
          broadcast(wss, msg('agent_log', { line: '[WS] Running script directly' }));
          executor.run().catch((e) => broadcast(wss, msg('error', { message: e.message })));
          break;
        }

        case 'get_state': {
          const state = loadState();
          send(ws, msg('state_update', state ? {
            status: state.status,
            currentLine: state.currentLine,
            script: state.script,
            recentLog: state.executionLog.slice(-50),
            metrics: state.metrics,
          } : null));
          break;
        }

        case 'take_control': {
          // Pause agent if running, enter manual mode
          if (agent) {
            agent.stop();
            agent = null;
            broadcast(wss, msg('agent_log', { line: '[MANUAL] Agent paused — manual control active' }));
          }
          manualMode = true;
          broadcast(wss, msg('state_update', { manualMode: true }));
          break;
        }

        case 'release_control': {
          manualMode = false;
          broadcast(wss, msg('state_update', { manualMode: false }));
          broadcast(wss, msg('agent_log', { line: '[MANUAL] Control released — agent mode' }));
          break;
        }

        case 'manual_action': {
          // Execute a single DSL command (e.g. "fight", "gather", "goto bank")
          if (!manualMode) {
            send(ws, msg('error', { message: 'Not in manual mode — take control first' }));
            break;
          }
          const { ScriptExecutor } = await import('../engine/executor');
          const { createEmptyState } = await import('../engine/state');
          const dslLine: string = cmd.dsl ?? '';
          if (!dslLine.trim()) break;
          const actionState = createEmptyState(dslLine);
          actionState.status = 'running';
          const actionExec = new ScriptExecutor(api, CHARACTER_NAME, actionState);
          actionExec.onAction = (line) => broadcast(wss, msg('execution_log', { line: `[MANUAL] ${line}` }));
          actionExec.onLevelUp = (skill, newLevel) => {
            broadcast(wss, msg('level_up', { skill, newLevel }));
          };
          broadcast(wss, msg('execution_log', { line: `[MANUAL] > ${dslLine}` }));
          actionExec.run()
            .then(async () => {
              // Refresh character after manual action
              try {
                const snap = await api.getCharacter(CHARACTER_NAME);
                broadcast(wss, msg('state_update', { characterSnapshot: snap }));
              } catch { /* non-fatal */ }
            })
            .catch((e) => broadcast(wss, msg('error', { message: e.message })));
          break;
        }
      }
    });

    ws.on('close', () => console.log('[WS] Client disconnected'));
  });

  httpServer.listen(PORT, () => {
    console.log(`Web interface: http://localhost:${PORT}`);
    console.log('Waiting for browser connection...');
  });

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down web server...');
    agent?.stop();
    httpServer.close();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
