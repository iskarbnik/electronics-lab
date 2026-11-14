// Interpreter for the Arduino subset. The program runs as a generator so delay() can pause it:
//   const run = new Sketch(src, host).start();  run.next() -> { value: { delay: ms } | { tick: true } } | { done: true }
// host: { pinMode(n, mode), digitalWrite(n, v), digitalRead(n), analogRead(n), analogWrite(n, v), print(text), now() }
// Integers follow the Uno: int is 16 bit, long 32 bit, byte 8 bit. Throws { code, line, name } on runtime errors.

import { parse } from './parser.js';

export class Fl { constructor(v) { this.v = v; } }
const num = x => (x instanceof Fl ? x.v : typeof x === 'string' ? Number(x) || 0 : x);
const isF = x => x instanceof Fl;
const err = (code, line, name = '') => Object.assign(new Error(code), { code, line, name });

export const CONSTS = {
  HIGH: 1, LOW: 0, INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2, LED_BUILTIN: 13, true: 1, false: 0,
  A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19, PI: new Fl(Math.PI), DEC: 10, HEX: 16, BIN: 2, OCT: 8,
};
const STEPS_PER_TICK = 400;
const MAX_DEPTH = 60;
const ULONG = { kind: 'int', bits: 32, signed: false };

function coerce(type, v) {
  if (type.kind === 'float') return new Fl(num(v));
  if (type.kind === 'bool') return num(v) ? 1 : 0;
  if (type.kind === 'string') return typeof v === 'string' ? v : text(v);
  if (type.kind === 'int') {
    const n = Math.trunc(num(v));
    if (!Number.isFinite(n)) return 0;
    const m = 2 ** type.bits, r = ((n % m) + m) % m;
    return type.signed && r >= m / 2 ? r - m : r;
  }
  return v;
}
export function text(v, arg) {
  if (typeof v === 'string') return v;
  if (isF(v)) return Number.isFinite(v.v) ? v.v.toFixed(arg ?? 2) : (Number.isNaN(v.v) ? 'nan' : 'inf');
  if (arg && arg !== 10 && Number.isInteger(v)) return (v >>> 0).toString(arg).toUpperCase();
  return String(v);
}

export class Sketch {
  constructor(src, host) {
    this.prog = parse(src);
    this.host = host;
    this.globals = new Map();
    this.steps = 0;
    this.depth = 0;
    this.seed = 12345;
  }

  *start() {
    for (const d of this.prog.globals) yield* this.declare(d, [this.globals]);
    yield* this.callFn('setup', [], 0);
    for (;;) { yield* this.callFn('loop', [], 0); yield { tick: true }; }
  }

  lookup(sc, name, line) {
    for (let i = sc.length - 1; i >= 0; i--) { const c = sc[i].get(name); if (c) return c; }
    if (name in CONSTS) return { val: CONSTS[name], konst: true };
    throw err('undef', line, name);
  }

  *declare(d, sc) {
    const scope = sc[sc.length - 1];
    if (d.arr) {
      const items = [];
      if (d.init?.k === 'list') for (const it of d.init.items) items.push(coerce(d.type, yield* this.ev(it, sc)));
      const len = d.arr.k === 'auto' ? items.length : Math.trunc(num(yield* this.ev(d.arr, sc)));
      if (len < 0 || len > 2000) throw err('index', d.line, d.name);
      while (items.length < len) items.push(coerce(d.type, 0));
      scope.set(d.name, { type: d.type, arr: items });
    } else {
      scope.set(d.name, { type: d.type, val: d.init ? coerce(d.type, yield* this.ev(d.init, sc)) : coerce(d.type, 0) });
    }
  }

  *callFn(name, args, line) {
    const f = this.prog.funcs[name];
    if (args.length !== f.params.length) throw err('argc', line, name);
    if (++this.depth > MAX_DEPTH) throw err('stack', line, name);
    const scope = new Map();
    f.params.forEach((pa, k) => scope.set(pa.name, { type: pa.type, val: coerce(pa.type, args[k]) }));
    const r = yield* this.exec(f.body, [this.globals, scope]);
    this.depth--;
    return r && r.k === 'ret' && r.v !== undefined ? coerce(f.ret, r.v) : 0;
  }

  *exec(n, sc) {
    if (++this.steps >= STEPS_PER_TICK) { this.steps = 0; yield { tick: true }; }
    switch (n.k) {
      case 'block': {
        const inner = n.flat ? sc : [...sc, new Map()];
        for (const s of n.body) { const r = s.k === 'decl' ? yield* this.declare(s, inner) : yield* this.exec(s, inner); if (r) return r; }
        return;
      }
      case 'decl': yield* this.declare(n, sc); return;
      case 'expr': yield* this.ev(n.e, sc); return;
      case 'if':
        if (num(yield* this.ev(n.c, sc))) return yield* this.exec(n.a, sc);
        if (n.b) return yield* this.exec(n.b, sc);
        return;
      case 'while':
        while (num(yield* this.ev(n.c, sc))) { const r = yield* this.exec(n.body, sc); if (r?.k === 'brk') break; if (r?.k === 'ret') return r; }
        return;
      case 'do':
        do { const r = yield* this.exec(n.body, sc); if (r?.k === 'brk') break; if (r?.k === 'ret') return r; } while (num(yield* this.ev(n.c, sc)));
        return;
      case 'for': {
        const inner = [...sc, new Map()];
        if (n.init) yield* this.exec(n.init, inner);
        while (!n.c || num(yield* this.ev(n.c, inner))) {
          const r = yield* this.exec(n.body, inner);
          if (r?.k === 'brk') break;
          if (r?.k === 'ret') return r;
          if (n.step) yield* this.ev(n.step, inner);
        }
        return;
      }
      case 'switch': {
        const v = num(yield* this.ev(n.e, sc));
        let at = -1;
        for (let k = 0; k < n.cases.length; k++) if (n.cases[k].test && num(yield* this.ev(n.cases[k].test, sc)) === v) { at = k; break; }
        if (at < 0) at = n.cases.findIndex(c => !c.test);
        if (at < 0) return;
        const inner = [...sc, new Map()];
        for (let k = at; k < n.cases.length; k++) for (const s of n.cases[k].body) {
          const r = s.k === 'decl' ? yield* this.declare(s, inner) : yield* this.exec(s, inner);
          if (r?.k === 'brk') return;
          if (r) return r;
        }
        return;
      }
      case 'return': return { k: 'ret', v: n.e ? yield* this.ev(n.e, sc) : undefined };
      case 'break': return { k: 'brk' };
      case 'continue': return { k: 'cont' };
    }
  }

  *ev(n, sc) {
    switch (n.k) {
      case 'num': return n.fl ? new Fl(n.v) : n.v;
      case 'str': return n.v;
      case 'id': { const c = this.lookup(sc, n.name, n.line); if (c.arr) throw err('array', n.line, n.name); return c.val; }
      case 'index': {
        const c = this.lookup(sc, n.obj.name, n.line);
        const i = Math.trunc(num(yield* this.ev(n.idx, sc)));
        if (!c.arr || i < 0 || i >= c.arr.length) throw err('index', n.line, n.obj.name);
        return c.arr[i];
      }
      case 'un': {
        const v = yield* this.ev(n.e, sc);
        if (n.op === '!') return num(v) ? 0 : 1;
        if (n.op === '-') return isF(v) ? new Fl(-v.v) : -num(v);
        if (n.op === '~') return ~num(v);
        return v;
      }
      case 'cast': return coerce(n.type, yield* this.ev(n.e, sc));
      case 'tern': return num(yield* this.ev(n.c, sc)) ? yield* this.ev(n.a, sc) : yield* this.ev(n.b, sc);
      case 'logic': {
        const l = num(yield* this.ev(n.l, sc));
        if (n.op === '&&') return l ? (num(yield* this.ev(n.r, sc)) ? 1 : 0) : 0;
        return l ? 1 : (num(yield* this.ev(n.r, sc)) ? 1 : 0);
      }
      case 'bin': return this.binop(n.op, yield* this.ev(n.l, sc), yield* this.ev(n.r, sc), n.line);
      case 'assign': {
        const cell = yield* this.cellOf(n.t, sc);
        let v = yield* this.ev(n.v, sc);
        if (n.op !== '=') v = this.binop(n.op.slice(0, -1), cell.get(), v, n.line);
        return cell.set(v);
      }
      case 'inc': {
        const cell = yield* this.cellOf(n.t, sc);
        const old = cell.get();
        const stored = cell.set(this.binop(n.op === '++' ? '+' : '-', old, 1, n.line));
        return n.prefix ? stored : old;
      }
      case 'call': return yield* this.call(n, sc);
    }
    throw err('unexpected', n.line || 0, n.k);
  }

  *cellOf(t, sc) {
    if (t.k === 'id') {
      const c = this.lookup(sc, t.name, t.line);
      if (c.konst || c.arr) throw err('lvalue', t.line, t.name);
      return { get: () => c.val, set: v => (c.val = coerce(c.type, v)) };
    }
    const c = this.lookup(sc, t.obj.name, t.line);
    const i = Math.trunc(num(yield* this.ev(t.idx, sc)));
    if (!c.arr || i < 0 || i >= c.arr.length) throw err('index', t.line, t.obj.name);
    return { get: () => c.arr[i], set: v => (c.arr[i] = coerce(c.type, v)) };
  }

  binop(op, a, b, line) {
    if (typeof a === 'string' || typeof b === 'string') {
      if (op === '+') return text(a) + text(b);
      if (op === '==') return a === b ? 1 : 0;
      if (op === '!=') return a !== b ? 1 : 0;
      throw err('type', line, op);
    }
    const f = isF(a) || isF(b), x = num(a), y = num(b);
    const r = v => (f ? new Fl(v) : v);
    switch (op) {
      case '+': return r(x + y);
      case '-': return r(x - y);
      case '*': return r(x * y);
      case '/': return f ? new Fl(x / y) : (y === 0 ? 0 : Math.trunc(x / y));
      case '%': return y === 0 ? 0 : Math.trunc(x) % Math.trunc(y);
      case '<': return x < y ? 1 : 0;
      case '>': return x > y ? 1 : 0;
      case '<=': return x <= y ? 1 : 0;
      case '>=': return x >= y ? 1 : 0;
      case '==': return x === y ? 1 : 0;
      case '!=': return x !== y ? 1 : 0;
      case '&': return x & y;
      case '|': return x | y;
      case '^': return x ^ y;
      case '<<': return x << y;
      case '>>': return x >> y;
    }
    throw err('unexpected', line, op);
  }

  *call(n, sc) {
    const args = [];
    for (const a of n.args) args.push(yield* this.ev(a, sc));
    const h = this.host, A = k => num(args[k]);
    if (this.prog.funcs[n.name]) return yield* this.callFn(n.name, args, n.line);
    const need = c => { if (args.length < c) throw err('argc', n.line, n.name); };
    switch (n.name) {
      case 'pinMode': need(2); h.pinMode(A(0), A(1)); return 0;
      case 'digitalWrite': need(2); h.digitalWrite(A(0), A(1) ? 1 : 0); return 0;
      case 'digitalRead': need(1); return h.digitalRead(A(0));
      case 'analogRead': need(1); return h.analogRead(A(0));
      case 'analogWrite': need(2); h.analogWrite(A(0), Math.max(0, Math.min(255, Math.trunc(A(1))))); return 0;
      case 'delay': need(1); yield { delay: Math.max(0, A(0)) }; return 0;
      case 'delayMicroseconds': need(1); if (A(0) >= 1000) yield { delay: A(0) / 1000 }; return 0;
      case 'millis': return coerce(ULONG, Math.floor(h.now()));
      case 'micros': return coerce(ULONG, Math.floor(h.now() * 1000));
      case 'Serial.begin': return 0;
      case 'Serial.print': case 'Serial.println': {
        const s = args.length ? text(args[0], args.length > 1 ? A(1) : undefined) : '';
        h.print(n.name === 'Serial.println' ? s + '\n' : s);
        return 0;
      }
      case 'Serial.available': return 0;
      case 'Serial.read': return -1;
      case 'abs': need(1); return isF(args[0]) ? new Fl(Math.abs(args[0].v)) : Math.abs(args[0]);
      case 'min': need(2); return A(0) <= A(1) ? args[0] : args[1];
      case 'max': need(2); return A(0) >= A(1) ? args[0] : args[1];
      case 'constrain': need(3); return A(0) < A(1) ? args[1] : A(0) > A(2) ? args[2] : args[0];
      case 'map': { need(5); const d = A(2) - A(1); return d === 0 ? 0 : Math.trunc((A(0) - A(1)) * (A(4) - A(3)) / d + A(3)); }
      case 'pow': need(2); return new Fl(Math.pow(A(0), A(1)));
      case 'sqrt': need(1); return new Fl(Math.sqrt(A(0)));
      case 'sq': need(1); return isF(args[0]) ? new Fl(A(0) ** 2) : A(0) * A(0);
      case 'sin': return new Fl(Math.sin(A(0)));
      case 'cos': return new Fl(Math.cos(A(0)));
      case 'randomSeed': this.seed = Math.trunc(A(0)) || 1; return 0;
      case 'random': {
        need(1);
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        const lo = args.length > 1 ? A(0) : 0, hi = args.length > 1 ? A(1) : A(0);
        return hi <= lo ? lo : lo + (this.seed >> 8) % Math.trunc(hi - lo);
      }
      case 'int': case 'long': return Math.trunc(A(0));
      case 'float': return new Fl(A(0));
      case 'byte': return coerce({ kind: 'int', bits: 8, signed: false }, A(0));
      case 'String': return text(args[0], args.length > 1 ? A(1) : undefined);
    }
    throw err('undefFn', n.line, n.name);
  }
}
