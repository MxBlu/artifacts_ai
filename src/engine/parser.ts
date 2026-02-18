// DSL Parser: tokenizer → AST

// ─── AST Node Types ──────────────────────────────────────────────────────────

export type ASTNode =
  | GotoNode
  | GatherNode
  | FightNode
  | BankNode
  | EquipNode
  | UnequipNode
  | RecycleNode
  | CraftNode
  | GENode
  | NPCNode
  | TaskNode
  | UseNode
  | TransitionNode
  | RestNode
  | WaitCooldownNode
  | LogNode
  | SetNode
  | IfNode
  | LoopCountNode
  | LoopUntilNode
  | LoopWhileNode
  | LoopForeverNode;

export interface GotoNode       { type: 'goto';        x?: Expr; y?: Expr; location?: string }
export interface GatherNode     { type: 'gather' | 'woodcut' | 'mine' | 'fish' }
export interface FightNode      { type: 'fight';       monster?: string }
export interface BankNode       { type: 'bank';        action: 'deposit' | 'withdraw'; item?: string; quantity?: Expr; allItems?: boolean }
export interface EquipNode      { type: 'equip';       item: string }
export interface UnequipNode    { type: 'unequip';     slot: string }
export interface RecycleNode    { type: 'recycle';     item: string }
export interface CraftNode      { type: 'craft';       item: string; quantity?: Expr }
export interface GENode         { type: 'ge';          action: 'buy' | 'sell' | 'collect'; item?: string; quantity?: Expr; price?: Expr }
export interface NPCNode        { type: 'npc';         action: 'buy' | 'sell'; item: string; quantity?: Expr }
export interface TaskNode       { type: 'task';        action: 'new' | 'complete' | 'cancel' | 'exchange' | 'trade'; item?: string; quantity?: Expr }
export interface UseNode        { type: 'use';         item: string }
export interface TransitionNode { type: 'transition' }
export interface RestNode       { type: 'rest';        seconds: Expr }
export interface WaitCooldownNode { type: 'wait_cooldown' }
export interface LogNode        { type: 'log';         message: string }
export interface SetNode        { type: 'set';         name: string; value: Expr }
export interface IfNode         { type: 'if';          condition: Condition; body: ASTNode[]; elseBody?: ASTNode[] }
export interface LoopCountNode  { type: 'loop_count';  count: Expr; body: ASTNode[] }
export interface LoopUntilNode  { type: 'loop_until';  condition: Condition; body: ASTNode[] }
export interface LoopWhileNode  { type: 'loop_while';  condition: Condition; body: ASTNode[] }
export interface LoopForeverNode{ type: 'loop_forever';body: ASTNode[] }

// Expressions (simple numeric / variable)
export type Expr =
  | { kind: 'number'; value: number }
  | { kind: 'var';    name: string }
  | { kind: 'string'; value: string };

// Condition types
export type Condition =
  | { cond: 'inventory_full' }
  | { cond: 'inventory_space'; op: CmpOp; value: Expr }
  | { cond: 'has_item';        item: string; quantity?: Expr }
  | { cond: 'skill_level';     skill: string; op: CmpOp; value: Expr }
  | { cond: 'hp';              op: CmpOp; value: Expr }
  | { cond: 'hp_percent';      op: CmpOp; value: Expr }
  | { cond: 'gold';            op: CmpOp; value: Expr }
  | { cond: 'at_location';     x: Expr; y: Expr }
  | { cond: 'has_task' }
  | { cond: 'task_progress_complete' }
  | { cond: 'task_coins';      op: CmpOp; value: Expr };

export type CmpOp = '>=' | '<=' | '>' | '<' | '==' | '!=';

// ─── Tokenizer ────────────────────────────────────────────────────────────────

type Token = string;

function tokenizeLine(line: string): Token[] {
  const stripped = line.replace(/#.*$/, '').trim();
  if (!stripped) return [];

  const tokens: Token[] = [];
  let i = 0;

  while (i < stripped.length) {
    // Skip whitespace
    if (/\s/.test(stripped[i])) { i++; continue; }

    // Quoted string
    if (stripped[i] === '"') {
      let j = i + 1;
      while (j < stripped.length && stripped[j] !== '"') j++;
      tokens.push(stripped.slice(i, j + 1));
      i = j + 1;
      continue;
    }

    // Operator tokens (multi-char first)
    const twoChar = stripped.slice(i, i + 2);
    if (['>=', '<=', '==', '!='].includes(twoChar)) {
      tokens.push(twoChar);
      i += 2;
      continue;
    }
    if (['>', '<', '=', ':'].includes(stripped[i])) {
      tokens.push(stripped[i]);
      i++;
      continue;
    }

    // Variable interpolation {{name}}
    if (stripped.slice(i, i + 2) === '{{') {
      let j = stripped.indexOf('}}', i + 2);
      if (j === -1) j = stripped.length - 2;
      tokens.push(stripped.slice(i, j + 2));
      i = j + 2;
      continue;
    }

    // Word/number token
    let j = i;
    while (j < stripped.length && !/[\s:=<>!"{}]/.test(stripped[j])) j++;
    if (j > i) {
      tokens.push(stripped.slice(i, j));
      i = j;
    } else {
      i++; // skip unknown char
    }
  }

  return tokens;
}

// ─── Expression Parser ────────────────────────────────────────────────────────

function parseExpr(token: string): Expr {
  if (!token) throw new Error('Empty expression');

  // Variable interpolation {{name}}
  if (token.startsWith('{{') && token.endsWith('}}')) {
    return { kind: 'var', name: token.slice(2, -2).trim() };
  }

  // Numeric
  const n = Number(token);
  if (!isNaN(n)) return { kind: 'number', value: n };

  // Quoted string
  if (token.startsWith('"') && token.endsWith('"')) {
    return { kind: 'string', value: token.slice(1, -1) };
  }

  // Variable name (unquoted)
  return { kind: 'var', name: token };
}

// ─── Condition Parser ─────────────────────────────────────────────────────────

function parseCmpOp(token: string): CmpOp {
  if (['>=', '<=', '>', '<', '==', '!='].includes(token)) return token as CmpOp;
  throw new Error(`Unknown comparison operator: ${token}`);
}

function parseCondition(tokens: Token[]): Condition {
  const head = tokens[0]?.toLowerCase();

  if (head === 'inventory_full') return { cond: 'inventory_full' };
  if (head === 'has_task')       return { cond: 'has_task' };
  if (head === 'task_progress_complete') return { cond: 'task_progress_complete' };

  if (head === 'inventory_space') {
    return { cond: 'inventory_space', op: parseCmpOp(tokens[1]), value: parseExpr(tokens[2]) };
  }
  if (head === 'has_item') {
    return { cond: 'has_item', item: tokens[1], quantity: tokens[2] ? parseExpr(tokens[2]) : undefined };
  }
  if (head === 'hp_percent') {
    return { cond: 'hp_percent', op: parseCmpOp(tokens[1]), value: parseExpr(tokens[2]) };
  }
  if (head === 'hp') {
    return { cond: 'hp', op: parseCmpOp(tokens[1]), value: parseExpr(tokens[2]) };
  }
  if (head === 'gold') {
    return { cond: 'gold', op: parseCmpOp(tokens[1]), value: parseExpr(tokens[2]) };
  }
  if (head === 'at_location') {
    return { cond: 'at_location', x: parseExpr(tokens[1]), y: parseExpr(tokens[2]) };
  }
  if (head === 'task_coins') {
    return { cond: 'task_coins', op: parseCmpOp(tokens[1]), value: parseExpr(tokens[2]) };
  }
  // skill_level <skill> >= <n>  OR  <skill>_level >= <n>
  if (head === 'skill_level') {
    return { cond: 'skill_level', skill: tokens[1], op: parseCmpOp(tokens[2]), value: parseExpr(tokens[3]) };
  }
  // Shorthand: woodcutting_level >= 5
  const skillMatch = head?.match(/^(\w+)_level$/);
  if (skillMatch) {
    return { cond: 'skill_level', skill: skillMatch[1], op: parseCmpOp(tokens[1]), value: parseExpr(tokens[2]) };
  }

  throw new Error(`Unknown condition: ${tokens.join(' ')}`);
}

// ─── Script Parser ────────────────────────────────────────────────────────────

interface ParseLine {
  indent: number;
  tokens: Token[];
  raw: string;
}

function getIndent(line: string): number {
  let i = 0;
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
    i += line[i] === '\t' ? 2 : 1;
  }
  return i;
}

function parseLines(script: string): ParseLine[] {
  return script.split('\n').map((raw, _i) => ({
    indent: getIndent(raw),
    tokens: tokenizeLine(raw),
    raw,
  })).filter(l => l.tokens.length > 0);
}

function parseBlock(lines: ParseLine[], pos: { i: number }, baseIndent: number): ASTNode[] {
  const nodes: ASTNode[] = [];
  while (pos.i < lines.length) {
    const line = lines[pos.i];
    if (line.indent < baseIndent) break;
    if (line.indent > baseIndent) { pos.i++; continue; } // skip deeper lines (handled by block parsers)

    const node = parseLine(lines, pos, baseIndent);
    if (node) nodes.push(node);
  }
  return nodes;
}

function parseLine(lines: ParseLine[], pos: { i: number }, baseIndent: number): ASTNode | null {
  const line = lines[pos.i];
  const toks = line.tokens;
  const cmd = toks[0]?.toLowerCase();

  // ─── goto ───
  if (cmd === 'goto') {
    pos.i++;
    // goto <number> <number> or goto <location_name>
    const t1 = toks[1];
    const t2 = toks[2];
    if (t1 && t2 && !isNaN(Number(t1)) && !isNaN(Number(t2))) {
      return { type: 'goto', x: parseExpr(t1), y: parseExpr(t2) };
    }
    if (t1 && t1.startsWith('{{')) {
      // goto {{x}} {{y}}
      return { type: 'goto', x: parseExpr(t1), y: parseExpr(t2 || '0') };
    }
    // named location
    return { type: 'goto', location: t1 };
  }

  // ─── gather / woodcut / mine / fish ───
  if (cmd === 'gather' || cmd === 'woodcut' || cmd === 'mine' || cmd === 'fish') {
    pos.i++;
    return { type: cmd as any };
  }

  // ─── fight ───
  if (cmd === 'fight') {
    pos.i++;
    return { type: 'fight', monster: toks[1] };
  }

  // ─── bank ───
  if (cmd === 'bank') {
    pos.i++;
    const action = toks[1]?.toLowerCase();
    if (action === 'deposit') {
      if (toks[2]?.toLowerCase() === 'allitems') return { type: 'bank', action: 'deposit', allItems: true };
      return { type: 'bank', action: 'deposit', item: toks[2] };
    }
    if (action === 'withdraw') {
      return { type: 'bank', action: 'withdraw', item: toks[2], quantity: toks[3] ? parseExpr(toks[3]) : undefined };
    }
    throw new Error(`Unknown bank action: ${action}`);
  }

  // ─── equip / unequip ───
  if (cmd === 'equip')   { pos.i++; return { type: 'equip',   item: toks[1] }; }
  if (cmd === 'unequip') { pos.i++; return { type: 'unequip', slot: toks[1] }; }

  // ─── recycle ───
  if (cmd === 'recycle') { pos.i++; return { type: 'recycle', item: toks[1] }; }

  // ─── craft ───
  if (cmd === 'craft') {
    pos.i++;
    return { type: 'craft', item: toks[1], quantity: toks[2] ? parseExpr(toks[2]) : undefined };
  }

  // ─── ge ───
  if (cmd === 'ge') {
    pos.i++;
    const action = toks[1]?.toLowerCase() as 'buy' | 'sell' | 'collect';
    if (action === 'collect') return { type: 'ge', action: 'collect' };
    return {
      type: 'ge', action,
      item: toks[2],
      quantity: toks[3] ? parseExpr(toks[3]) : undefined,
      price: toks[4] ? parseExpr(toks[4]) : undefined,
    };
  }

  // ─── npc ───
  if (cmd === 'npc') {
    pos.i++;
    const action = toks[1]?.toLowerCase() as 'buy' | 'sell';
    return { type: 'npc', action, item: toks[2], quantity: toks[3] ? parseExpr(toks[3]) : undefined };
  }

  // ─── task ───
  if (cmd === 'task') {
    pos.i++;
    const action = toks[1]?.toLowerCase() as any;
    return { type: 'task', action, item: toks[2], quantity: toks[3] ? parseExpr(toks[3]) : undefined };
  }

  // ─── use ───
  if (cmd === 'use') { pos.i++; return { type: 'use', item: toks[1] }; }

  // ─── transition ───
  if (cmd === 'transition') { pos.i++; return { type: 'transition' }; }

  // ─── rest ───
  if (cmd === 'rest') { pos.i++; return { type: 'rest', seconds: parseExpr(toks[1] ?? '3') }; }

  // ─── wait_cooldown ───
  if (cmd === 'wait_cooldown') { pos.i++; return { type: 'wait_cooldown' }; }

  // ─── log ───
  if (cmd === 'log') {
    pos.i++;
    const msg = toks.slice(1).join(' ').replace(/^"|"$/g, '');
    return { type: 'log', message: msg };
  }

  // ─── set ───
  if (cmd === 'set') {
    pos.i++;
    // set <name> = <value>
    const name = toks[1];
    // toks[2] should be '='
    const val = toks[3] ?? toks[2]; // handle 'set x 5' or 'set x = 5'
    const valueToken = toks[2] === '=' ? toks[3] : toks[2];
    return { type: 'set', name, value: parseExpr(valueToken) };
  }

  // ─── if ───
  if (cmd === 'if') {
    pos.i++;
    // condition tokens are everything between 'if' and ':'
    const condTokens = toks.slice(1).filter(t => t !== ':');
    const condition = parseCondition(condTokens);
    const bodyIndent = baseIndent + 2;
    // find actual body indent from next line
    const nextIndent = lines[pos.i]?.indent;
    const actualBodyIndent = nextIndent ?? bodyIndent;
    const body = parseBlock(lines, pos, actualBodyIndent);
    // check for else
    let elseBody: ASTNode[] | undefined;
    if (pos.i < lines.length && lines[pos.i].indent === baseIndent && lines[pos.i].tokens[0]?.toLowerCase() === 'else') {
      pos.i++;
      const elseNextIndent = lines[pos.i]?.indent;
      elseBody = parseBlock(lines, pos, elseNextIndent ?? actualBodyIndent);
    }
    return { type: 'if', condition, body, elseBody };
  }

  // ─── else (standalone - shouldn't appear here, consumed above) ───
  if (cmd === 'else') { pos.i++; return null; }

  // ─── loop ───
  if (cmd === 'loop') {
    pos.i++;
    const sub = toks[1]?.toLowerCase();

    const nextIndent = lines[pos.i]?.indent;
    const bodyIndent = nextIndent ?? baseIndent + 2;

    if (sub === 'forever') {
      // consume trailing ':' if present
      const body = parseBlock(lines, pos, bodyIndent);
      return { type: 'loop_forever', body };
    }
    if (sub === 'until') {
      const condTokens = toks.slice(2).filter(t => t !== ':');
      const condition = parseCondition(condTokens);
      const body = parseBlock(lines, pos, bodyIndent);
      return { type: 'loop_until', condition, body };
    }
    if (sub === 'while') {
      const condTokens = toks.slice(2).filter(t => t !== ':');
      const condition = parseCondition(condTokens);
      const body = parseBlock(lines, pos, bodyIndent);
      return { type: 'loop_while', condition, body };
    }
    // loop <count>:
    const count = parseExpr(toks[1]);
    const body = parseBlock(lines, pos, bodyIndent);
    return { type: 'loop_count', count, body };
  }

  // Unknown - skip
  pos.i++;
  return null;
}

export function parseScript(script: string): ASTNode[] {
  const lines = parseLines(script);
  if (lines.length === 0) return [];
  const pos = { i: 0 };
  const baseIndent = lines[0].indent;
  return parseBlock(lines, pos, baseIndent);
}
