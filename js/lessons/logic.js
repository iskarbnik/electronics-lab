// Shared pieces of the logic gate lessons: the prebuilt input and output stages and their schematics.
// Board layout: inputs A (columns 2 to 4) and B (columns 8 to 10) sit in the top half, the gate sits in
// the bottom half (row j), the LED stage is in columns 18 to 22 at the top.
import { T, SETUP, wire, place } from './common.js';


// Switch SA feeds node T4 and RA pulls it down. Same for SB, node T10.
export const inputA = () => [
  wire('WA1', ['p+2', 'a2'], 'red', SETUP),
  place('SA', 'switch', ['c2', 'c4'], {}, SETUP),
  place('RA', 'resistor', ['p-4', 'a4'], { r: 10000 }, SETUP),
];
export const inputB = () => [
  wire('WB1', ['p+8', 'a8'], 'red', SETUP),
  place('SB', 'switch', ['c8', 'c10'], {}, SETUP),
  place('RB', 'resistor', ['p-10', 'a10'], { r: 10000 }, SETUP),
];
// Resistor, LED and ground wire at columns 18 to 22 (sum) or 24 to 28 (carry).
export const outChain = (n = 1) => {
  const o = n === 1 ? 18 : 24;
  return [
    place('R' + n, 'resistor', ['a' + o, 'a' + (o + 3)], { r: 470 }, SETUP),
    place('D' + n, 'led', ['b' + (o + 3), 'b' + (o + 4)], { color: n === 1 ? 'green' : 'yellow' }, SETUP),
    wire('WO' + n, ['a' + (o + 4), 'p-' + (o + 4)], 'black', SETUP),
  ];
};
export const gateOnBoard = (fn, two = true) => place('G1', 'gate', two ? ['j13', 'j14', 'j15'] : ['j13', 'j14'], { fn }, SETUP);
export const linkA = () => wire('XA', ['e4', 'f13'], 'blue', SETUP);
export const linkB = () => wire('XB', ['e10', 'f14'], 'yellow', SETUP);
export const linkY = two => wire('XY', [two ? 'f15' : 'f14', 'e18'], 'green', SETUP);

const w = (pts, of, extra) => ({ pts, of, dir: 1, ...extra });

// Schematic of one gate with one or two switch inputs and an LED.
export function gateSchematic(fn, two = true) {
  const parts = [
    { id: 'BAT', type: 'battery', x: 2, y: 6, rot: 90 },
    ...(two ? [{ id: 'SB', type: 'switch', x: 5, y: 3, rot: 90 }, { id: 'RB', type: 'resistor', x: 5, y: 9, rot: 90 }] : []),
    { id: 'SA', type: 'switch', x: 8, y: 3, rot: 90 },
    { id: 'RA', type: 'resistor', x: 8, y: 9, rot: 90 },
    { id: 'G1', type: 'gate', x: 12, y: 6, rot: 0 },
    { id: 'R1', type: 'resistor', x: 17, y: 6, rot: 0 },
    { id: 'D1', type: 'led', x: 21, y: 9, rot: 90 },
  ];
  const yA = two ? 5.5 : 6, yOut = two ? 'f15' : 'f14';
  const wires = [
    w([[2, 4], [2, 0], [8, 0]], 'BAT'),
    w([[8, 0], [8, 1]], 'SA'),
    w([[8, 5], [8, 7]], 'RA', { net: 'b4' }),
    w([[8, 11], [8, 12]], 'RA'),
    w([[8, yA], [10, yA]], 'RA', { net: 'b4' }),
    w([[2, 8], [2, 12], [21, 12]], 'BAT', { dir: -1 }),
    w([[14, 6], [15, 6]], 'D1', { net: yOut }),
    w([[19, 6], [21, 6], [21, 7]], 'D1'),
    w([[21, 11], [21, 12]], 'D1'),
  ];
  const dots = [[8, yA], [8, 12]];
  if (two) {
    wires.push(
      w([[5, 0], [5, 1]], 'SB'),
      w([[5, 5], [5, 7]], 'RB', { net: 'b10' }),
      w([[5, 11], [5, 12]], 'RB'),
      w([[5, 6.5], [10, 6.5]], 'RB', { net: 'b10' }));
    dots.push([5, 0], [5, 6.5], [5, 12]);
  }
  return { parts, wires, dots };
}

// Half adder schematic: two gates sharing both inputs.
export function adderSchematic() {
  const parts = [
    { id: 'BAT', type: 'battery', x: 2, y: 8, rot: 90 },
    { id: 'SB', type: 'switch', x: 5, y: 3, rot: 90 }, { id: 'RB', type: 'resistor', x: 5, y: 12, rot: 90 },
    { id: 'SA', type: 'switch', x: 8, y: 3, rot: 90 }, { id: 'RA', type: 'resistor', x: 8, y: 12, rot: 90 },
    { id: 'G1', type: 'gate', x: 13, y: 4, rot: 0 }, { id: 'G2', type: 'gate', x: 13, y: 10, rot: 0 },
    { id: 'R1', type: 'resistor', x: 18, y: 4, rot: 0 }, { id: 'D1', type: 'led', x: 26, y: 7, rot: 90 },
    { id: 'R2', type: 'resistor', x: 18, y: 10, rot: 0 }, { id: 'D2', type: 'led', x: 21, y: 13, rot: 90 },
  ];
  const wires = [
    w([[2, 6], [2, 0], [8, 0]], 'BAT'),
    w([[5, 0], [5, 1]], 'SB'), w([[8, 0], [8, 1]], 'SA'),
    w([[5, 5], [5, 10]], 'RB', { net: 'b10' }), w([[8, 5], [8, 10]], 'RA', { net: 'b4' }),
    w([[5, 14], [5, 16]], 'RB'), w([[8, 14], [8, 16]], 'RA'),
    w([[8, 6], [9, 6], [9, 3.5], [11, 3.5]], 'RA', { net: 'b4' }),
    w([[9, 6], [9, 9.5], [11, 9.5]], 'RA', { net: 'b4' }),
    w([[5, 7], [10, 7], [10, 4.5], [11, 4.5]], 'RB', { net: 'b10' }),
    w([[10, 7], [10, 10.5], [11, 10.5]], 'RB', { net: 'b10' }),
    w([[15, 4], [16, 4]], 'D1', { net: 'f8' }),
    w([[20, 4], [26, 4], [26, 5]], 'D1'),
    w([[26, 9], [26, 16]], 'D1'),
    w([[15, 10], [16, 10]], 'D2', { net: 'f15' }),
    w([[20, 10], [21, 10], [21, 11]], 'D2'),
    w([[21, 15], [21, 16]], 'D2'),
    w([[2, 10], [2, 16], [26, 16]], 'BAT', { dir: -1 }),
  ];
  return { parts, wires, dots: [[8, 6], [9, 6], [5, 7], [10, 7], [5, 0], [5, 16], [8, 16], [21, 16]] };
}

