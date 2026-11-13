// Digital logic: gate functions, truth tables and labels.
// A gate comp has pins [A, B, Y] (two inputs) or [A, Y] (NOT) and props { fn }.

export const GATE_FNS = ['and', 'or', 'nand', 'nor', 'xor'];
export const ALL_GATE_FNS = [...GATE_FNS, 'not'];

const FN = {
  and: ([a, b]) => a && b,
  or: ([a, b]) => a || b,
  nand: ([a, b]) => !(a && b),
  nor: ([a, b]) => !(a || b),
  xor: ([a, b]) => a !== b,
  not: ([a]) => !a,
};

export const gateInputs = comp => comp.pins.length - 1;
export const gateEval = (fn, ins) => !!(FN[fn] || FN.and)(ins);

// Rows of [inputs[], output] in counting order, for a function with n inputs.
export function truthTable(fn, n = fn === 'not' ? 1 : 2) {
  const rows = [];
  for (let k = 0; k < 1 << n; k++) {
    const ins = Array.from({ length: n }, (_, i) => !!((k >> (n - 1 - i)) & 1));
    rows.push([ins, gateEval(fn, ins)]);
  }
  return rows;
}
