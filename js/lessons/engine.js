// Applies lesson steps to a circuit.
import { newCircuit, clone, addComp, simulate } from '../sim/circuit.js';

export function applyStep(circuit, step) {
  if (step.type === 'wire') addComp(circuit, { id: step.id, type: 'wire', pins: step.pins, props: { color: step.color } });
  else if (step.type === 'place') addComp(circuit, { id: step.id, type: step.kind, pins: step.pins, props: step.props || {} });
  else if (step.type === 'do' && step.auto) step.auto(circuit);
  return circuit;
}

// Circuit after the setup and steps [0, upto). Simulated after every step so that burnt LEDs stay burnt.
export function buildCircuit(lesson, upto = 0) {
  const c = newCircuit();
  for (const s of lesson.setup || []) { applyStep(c, s); simulate(c); }
  for (const s of lesson.steps.slice(0, upto)) { applyStep(c, s); simulate(c); }
  return c;
}
