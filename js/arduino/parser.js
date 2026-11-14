// Lexer and parser for the Arduino C++ subset: globals, functions, if/else, for, while, do, switch,
// arrays, the usual operators, #define constants. Throws { code, line, name } on a syntax error.

const TYPE_WORDS = new Set(['void', 'int', 'long', 'short', 'char', 'byte', 'float', 'double', 'bool', 'boolean', 'unsigned', 'signed',
  'const', 'static', 'volatile', 'String', 'word', 'size_t', 'uint8_t', 'uint16_t', 'uint32_t', 'int8_t', 'int16_t', 'int32_t']);
const OPS = ['<<=', '>>=', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '==', '!=', '<=', '>=', '&&', '||', '<<', '>>',
  '+', '-', '*', '/', '%', '=', '<', '>', '!', '~', '&', '|', '^', '?', ':', ';', ',', '(', ')', '{', '}', '[', ']', '.'];
const err = (code, line, name = '') => Object.assign(new Error(code), { code, line, name });

export function lex(src) {
  const toks = [], defs = new Map();
  let i = 0, line = 1;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
    if (c === '#') {
      let j = i; while (j < n && src[j] !== '\n') j++;
      const m = /^#\s*define\s+([A-Za-z_]\w*)\s+(.+)$/.exec(src.slice(i, j).trim());
      if (m) defs.set(m[1], lex(m[2]).toks);
      i = j; continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const m = /^(0[xX][0-9a-fA-F]+|0[bB][01]+|\d*\.?\d+(?:[eE][+-]?\d+)?|\d+\.)[uUlLfF]*/.exec(src.slice(i));
      const raw = m[1];
      const isFloat = /^[^xXbB]*[.eE]/.test(raw) && !/^0[xX]/.test(raw);
      toks.push({ t: 'num', v: /^0[bB]/.test(raw) ? parseInt(raw.slice(2), 2) : Number(raw), fl: isFloat || /[fF]$/.test(m[0]) && !/^0[xX]/.test(raw), line });
      i += m[0].length; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i; while (j < n && /\w/.test(src[j])) j++;
      toks.push({ t: 'id', v: src.slice(i, j), line }); i = j; continue;
    }
    if (c === '"') {
      let j = i + 1, s = '';
      while (j < n && src[j] !== '"') { if (src[j] === '\\') { j++; s += { n: '\n', t: '\t', r: '\r', 0: '\0' }[src[j]] ?? src[j]; } else s += src[j]; j++; }
      if (j >= n) throw err('string', line);
      toks.push({ t: 'str', v: s, line }); i = j + 1; continue;
    }
    if (c === "'") {
      let j = i + 1, s = '';
      if (src[j] === '\\') { j++; s = { n: '\n', t: '\t', r: '\r', 0: '\0' }[src[j]] ?? src[j]; j++; } else { s = src[j]; j++; }
      if (src[j] !== "'") throw err('string', line);
      toks.push({ t: 'num', v: s.charCodeAt(0), fl: false, ch: true, line }); i = j + 1; continue;
    }
    const op = OPS.find(o => src.startsWith(o, i));
    if (!op) throw err('char', line, c);
    toks.push({ t: 'op', v: op, line }); i += op.length;
  }
  return { toks, defs };
}

// A type from words like `unsigned long`, as { kind, bits, signed }.
export function typeOf(words) {
  const w = new Set(words);
  if (w.has('void')) return { kind: 'void' };
  if (w.has('float') || w.has('double')) return { kind: 'float' };
  if (w.has('bool') || w.has('boolean')) return { kind: 'bool' };
  if (w.has('String')) return { kind: 'string' };
  const uns = w.has('unsigned') || w.has('byte') || w.has('word') || /^uint/.test([...w].join(' '));
  let bits = 16;
  if (w.has('long') || w.has('uint32_t') || w.has('int32_t') || w.has('size_t')) bits = 32;
  if (w.has('byte') || w.has('char') || w.has('uint8_t') || w.has('int8_t')) bits = 8;
  return { kind: 'int', bits, signed: !uns, char: w.has('char') && !uns };
}

const BIN = { '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6, '<': 7, '>': 7, '<=': 7, '>=': 7, '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10 };
const ASSIGN = new Set(['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=']);

export function parse(src) {
  const { toks: raw, defs } = lex(src);
  // expand #define names
  const toks = [];
  for (const tk of raw) { if (tk.t === 'id' && defs.has(tk.v)) for (const d of defs.get(tk.v)) toks.push({ ...d, line: tk.line }); else toks.push(tk); }
  let p = 0;
  const peek = (k = 0) => toks[p + k];
  const line = () => (toks[p] || toks[toks.length - 1] || { line: 1 }).line;
  const isOp = (v, k = 0) => peek(k)?.t === 'op' && peek(k).v === v;
  const accept = v => { if (isOp(v)) { p++; return true; } return false; };
  const expect = v => { if (!accept(v)) throw err('expected', line(), v); };
  const ident = () => { const t = peek(); if (t?.t !== 'id') throw err('expected', line(), 'name'); p++; return t.v; };
  const isType = (k = 0) => peek(k)?.t === 'id' && TYPE_WORDS.has(peek(k).v);
  const readType = () => { const w = []; while (isType()) w.push(peek().v), p++; return typeOf(w); };

  function primary() {
    const t = peek();
    if (!t) throw err('eof', line());
    if (t.t === 'num') { p++; return { k: 'num', v: t.v, fl: t.fl, ch: !!t.ch }; }
    if (t.t === 'str') { p++; return { k: 'str', v: t.v }; }
    if (accept('(')) { const e = expr(); expect(')'); return e; }
    if (t.t === 'id') {
      p++;
      let name = t.v;
      if (isOp('.') && peek(1)?.t === 'id') { p++; name += '.' + ident(); }
      if (accept('(')) {
        const args = [];
        if (!accept(')')) { do args.push(assign()); while (accept(',')); expect(')'); }
        return { k: 'call', name, args, line: t.line };
      }
      return { k: 'id', name, line: t.line };
    }
    throw err('unexpected', t.line, t.v);
  }
  function postfix() {
    let e = primary();
    for (;;) {
      if (isOp('[')) { p++; const i = expr(); expect(']'); e = { k: 'index', obj: e, idx: i, line: line() }; }
      else if (isOp('++') || isOp('--')) { const op = toks[p++].v; e = { k: 'inc', op, prefix: false, t: e, line: line() }; }
      else return e;
    }
  }
  function unary() {
    const t = peek();
    if (t?.t === 'op') {
      if (['!', '-', '+', '~'].includes(t.v)) { p++; return { k: 'un', op: t.v, e: unary() }; }
      if (t.v === '++' || t.v === '--') { p++; return { k: 'inc', op: t.v, prefix: true, t: unary(), line: t.line }; }
      if (t.v === '(' && isType(1)) { p++; const ty = readType(); expect(')'); return { k: 'cast', type: ty, e: unary() }; }
    }
    return postfix();
  }
  function binary(min) {
    let l = unary();
    for (;;) {
      const t = peek();
      const pr = t?.t === 'op' ? BIN[t.v] : 0;
      if (!pr || pr < min) return l;
      p++;
      const r = binary(pr + 1);
      l = { k: t.v === '&&' || t.v === '||' ? 'logic' : 'bin', op: t.v, l, r, line: t.line };
    }
  }
  function ternary() {
    const c = binary(1);
    if (accept('?')) { const a = assign(); expect(':'); const b = assign(); return { k: 'tern', c, a, b }; }
    return c;
  }
  function assign() {
    const l = ternary();
    const t = peek();
    if (t?.t === 'op' && ASSIGN.has(t.v)) {
      if (l.k !== 'id' && l.k !== 'index') throw err('lvalue', t.line);
      p++; return { k: 'assign', op: t.v, t: l, v: assign(), line: t.line };
    }
    return l;
  }
  function expr() { return assign(); }

  // declarators after the type: name [ [n] ] [= init] {, ...}
  function declRest(type, ln) {
    const out = [];
    do {
      const name = ident();
      let arr = null, init = null;
      if (accept('[')) { arr = isOp(']') ? { k: 'auto' } : expr(); expect(']'); }
      if (accept('=')) {
        if (isOp('{')) { p++; init = { k: 'list', items: [] }; if (!isOp('}')) do { if (isOp('}')) break; init.items.push(assign()); } while (accept(',')); expect('}'); }
        else init = assign();
      }
      out.push({ k: 'decl', type, name, arr, init, line: ln });
    } while (accept(','));
    return out;
  }

  function block() {
    expect('{');
    const body = [];
    while (!isOp('}')) { if (!peek()) throw err('eof', line()); body.push(...stmt()); }
    p++;
    return { k: 'block', body };
  }
  function stmt() {
    const t = peek(), ln = t.line;
    if (isOp('{')) return [block()];
    if (accept(';')) return [];
    if (t.t === 'id') {
      switch (t.v) {
        case 'if': { p++; expect('('); const c = expr(); expect(')'); const a = one(); let b = null; if (peek()?.v === 'else') { p++; b = one(); } return [{ k: 'if', c, a, b }]; }
        case 'while': { p++; expect('('); const c = expr(); expect(')'); return [{ k: 'while', c, body: one() }]; }
        case 'do': { p++; const body = one(); if (peek()?.v !== 'while') throw err('expected', line(), 'while'); p++; expect('('); const c = expr(); expect(')'); expect(';'); return [{ k: 'do', c, body }]; }
        case 'for': {
          p++; expect('(');
          let init = null, c = null, step = null;
          if (!accept(';')) { init = isType() ? { k: 'block', body: declRest(readType(), ln), flat: true } : { k: 'expr', e: expr() }; expect(';'); }
          if (!accept(';')) { c = expr(); expect(';'); }
          if (!isOp(')')) step = expr();
          expect(')');
          return [{ k: 'for', init, c, step, body: one() }];
        }
        case 'return': { p++; const e = isOp(';') ? null : expr(); expect(';'); return [{ k: 'return', e, line: ln }]; }
        case 'break': p++; expect(';'); return [{ k: 'break' }];
        case 'continue': p++; expect(';'); return [{ k: 'continue' }];
        case 'switch': {
          p++; expect('('); const e = expr(); expect(')'); expect('{');
          const cases = [];
          while (!accept('}')) {
            let test = null;
            if (peek()?.v === 'case') { p++; test = ternary(); } else if (peek()?.v === 'default') p++; else throw err('unexpected', line(), peek()?.v ?? '');
            expect(':');
            const body = [];
            while (!isOp('}') && peek()?.v !== 'case' && peek()?.v !== 'default') { if (!peek()) throw err('eof', line()); body.push(...stmt()); }
            cases.push({ test, body });
          }
          return [{ k: 'switch', e, cases }];
        }
      }
      if (isType()) { const ty = readType(); const ds = declRest(ty, ln); expect(';'); return ds; }
    }
    const e = expr(); expect(';');
    return [{ k: 'expr', e, line: ln }];
  }
  function one() { const s = stmt(); return s.length === 1 ? s[0] : { k: 'block', body: s }; }

  const globals = [], funcs = {};
  while (p < toks.length) {
    const ln = line();
    if (!isType()) throw err('unexpected', ln, String(peek().v));
    const type = readType();
    const name = ident();
    if (accept('(')) {
      const params = [];
      if (!accept(')')) {
        do {
          if (peek()?.v === 'void' && isOp(')', 1)) { p++; break; }
          const pt = readType(), pn = ident();
          if (accept('[')) expect(']');
          params.push({ type: pt, name: pn });
        } while (accept(','));
        expect(')');
      }
      funcs[name] = { ret: type, params, body: block(), line: ln };
    } else {
      p--;                                    // put the name back for declRest
      globals.push(...declRest(type, ln)); expect(';');
    }
  }
  if (!funcs.setup) throw err('nosetup', 1);
  if (!funcs.loop) throw err('noloop', 1);
  return { globals, funcs };
}
