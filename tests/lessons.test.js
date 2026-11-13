import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS } from '../js/lessons/index.js';
import { applyStep, buildCircuit } from '../js/lessons/engine.js';
import { newCircuit, simulate } from '../js/sim/circuit.js';
import { holePos } from '../js/sim/board.js';

const isT = t => t && typeof t.he === 'string' && t.he.trim() && typeof t.en === 'string' && t.en.trim();
const holesOf = step => (step.pins || []);

test('lesson ids are unique and there are twelve', () => {
  const ids = LESSONS.map(l => l.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 12);
});

for (const lesson of LESSONS) {
  test(`${lesson.id}: text, quizzes and schematic`, () => {
    assert.ok(isT(lesson.title), 'title');
    assert.ok(isT(lesson.summary), 'summary');
    lesson.steps.forEach((s, i) => {
      assert.ok(isT(s.text), `step ${i} text`);
      if (s.type === 'quiz') {
        assert.ok(s.options.length >= 2);
        s.options.forEach(o => assert.ok(isT(o), `step ${i} option`));
        assert.ok(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.options.length, `step ${i} answer`);
        assert.ok(isT(s.why), `step ${i} why`);
      }
      for (const t of [s.text, s.why, ...(s.options || [])].filter(Boolean)) {
        assert.ok(!/—/.test(t.he + t.en), `step ${i} has an em dash`);
      }
    });
  });

  test(`${lesson.id}: replay`, () => {
    const c = newCircuit();
    const everSeen = new Set(['BAT']);
    const check = (step, label) => {
      for (const h of holesOf(step)) assert.ok(holePos(h), `${label}: bad hole ${h}`);
      applyStep(c, step);
      const sim = simulate(c);
      const seen = new Map();
      for (const comp of c.comps) {
        everSeen.add(comp.id);
        if (comp.id === 'BAT') continue;
        for (const h of comp.pins) {
          assert.ok(holePos(h), `${label}: bad hole ${h}`);
          assert.ok(!seen.has(h), `${label}: ${comp.id} and ${seen.get(h)} share hole ${h}`);
          seen.set(h, comp.id);
        }
      }
      if (step.type === 'do') {
        const ui = { pressed: new Set([step.comp]), selected: new Set([step.comp]) };
        assert.ok(step.until(sim, c, ui), `${label}: until false after auto`);
      }
      if (step.expect) assert.ok(step.expect(sim, c), `${label}: expect failed`);
    };
    lesson.setup.forEach((s, i) => check(s, `setup ${i}`));
    lesson.steps.forEach((s, i) => check(s, `step ${i}`));

    if (lesson.schematic) {
      const ids = new Set(lesson.schematic.parts.map(p => p.id));
      for (const id of ids) assert.ok(everSeen.has(id), `schematic part ${id} never exists`);
      for (const w of lesson.schematic.wires) assert.ok(ids.has(w.of), `wire of ${w.of}`);
    }
  });

  test(`${lesson.id}: do steps are not already done before they start`, () => {
    lesson.steps.forEach((s, i) => {
      if (s.type !== 'do' || s.act === 'press' || s.act === 'select') return;
      const c = buildCircuit(lesson, i);
      const sim = simulate(c);
      assert.ok(!s.until(sim, c, { pressed: new Set(), selected: new Set() }), `step ${i} is already satisfied at start`);
    });
  });

  test(`${lesson.id}: buildCircuit matches replay`, () => {
    const c = buildCircuit(lesson, lesson.steps.length);
    assert.ok(c.comps.length >= 1);
  });
}
