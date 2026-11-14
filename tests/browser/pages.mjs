// Browser check of the calculators and parts pages: they load, compute, stay inside the screen and
// keep unit values readable in Hebrew. Used by run.mjs.
export async function pagesCheck({ browser, cfg, BASE, PARTS, fail, shot }) {
  const label = `${cfg.name}/pages`;
  const ctx = await browser.newContext(cfg.ctx);
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(`console ${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  const checks = async where => {
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error(`horizontal scroll on ${where}`);
    if (cfg.lang !== 'he') return;
    const bad = await page.evaluate(() => {
      const re = /(?<![\w.\/])-?\d+(?:[.,]\d+)?\s?(?:µA|mA|A|mV|V|kΩ|MΩ|Ω|mW|W|µF|mF|F)(?![A-Za-z0-9µΩ])/;
      const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) {
        const e = n.parentElement;
        if (!e || e.closest('bdi,code,svg,script,style,select,[dir=ltr],[hidden]')) continue;
        const m = re.exec(n.nodeValue); if (m) out.push(m[0]);
      }
      return out;
    });
    if (bad.length) throw new Error(`${where}: unit values outside a bidi run: ${bad.join(', ')}`);
  };
  try {
    await page.goto(BASE); await page.waitForSelector('.qlink');
    await page.click('.qlink[href="#/tools"]'); await page.waitForSelector('.tool');
    const txt = sel => page.$eval(sel, e => e.textContent);
    if (!(await txt('[data-tool=ohm] .tres')).includes('19.1 mA')) throw new Error('Ohm calculator did not give 19.1 mA');
    await page.fill('[data-tool=led] input[name=vs]', '5');
    await page.selectOption('[data-tool=led] select', 'blue');
    if (!(await txt('[data-tool=led] .tres')).includes('150 Ω')) throw new Error('LED calculator did not give 150 Ω');
    if (!(await txt('[data-tool=rc] .tres')).includes('470 ms')) throw new Error('RC calculator did not give 470 ms');
    if ((await page.$$('[data-tool=bands] .bandsvg rect')).length !== 5) throw new Error('colour bands not drawn');
    await checks('tools');
    await page.click('.page .back'); await page.waitForSelector('.qlink');
    await page.click('.qlink[href="#/parts"]'); await page.waitForSelector('.pcard');
    const n = (await page.$$('.pcard')).length, syms = (await page.$$('.pcard svg .sym')).length;
    if (n !== PARTS.length || syms !== n) throw new Error(`parts page shows ${n} cards and ${syms} symbols, expected ${PARTS.length}`);
    await checks('parts');
    await page.click('.pcard .plink'); await page.waitForSelector('.lesson .boardsvg');
    if (problems.length) throw new Error(problems.join(' | '));
    console.log(`  ok   ${label}`);
  } catch (e) { fail(label, e.message.split('\n')[0]); await shot(page, label); }
  finally { await ctx.close(); }
}
