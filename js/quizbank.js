// The quiz bank is every quiz step of every lesson. Pure helpers, so they are easy to test.
export function buildBank(lessonLists) {
  const bank = [];
  for (const lessons of lessonLists) for (const l of lessons) l.steps.forEach((s, i) => {
    if (s.type === 'quiz') bank.push({ id: `${l.id}#${i}`, lesson: l.id, text: s.text, options: s.options, answer: s.answer, why: s.why });
  });
  return bank;
}

// n distinct questions in random order. rand() returns [0, 1).
export function pick(bank, n, rand = Math.random) {
  const a = [...bank];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, Math.min(n, a.length));
}

// The same question with its options shuffled; `answer` follows the right option.
export function shuffleOptions(q, rand = Math.random) {
  const idx = q.options.map((_, k) => k);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return { ...q, options: idx.map(k => q.options[k]), answer: idx.indexOf(q.answer) };
}

export const percent = (right, total) => (total ? Math.round(right / total * 100) : 0);
