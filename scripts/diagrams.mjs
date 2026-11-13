import { run } from '@mermaid-js/mermaid-cli';
import puppeteer from 'puppeteer';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

function dimensions(svg) {
  const viewBox = /\bviewBox="([^"]+)"/.exec(svg);
  if (!viewBox) throw new Error('The rendered Mermaid SVG is missing a viewBox.');
  const [, , width, height] = viewBox[1].trim().split(/[\s,]+/).map(Number);
  if (!(width > 0 && height > 0)) throw new Error('The Mermaid SVG has invalid dimensions.');
  return { width: Math.ceil(width), height: Math.ceil(height) };
}

async function installedBrowser() {
  const candidates = [
    process.env.MERMAID_CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}/Google/Chrome/Application/chrome.exe`,
    process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { await access(candidate); return candidate; } catch { /* Try the next browser location. */ }
  }
  throw new Error('To render a changed Mermaid diagram, install Chrome/Chromium or set MERMAID_CHROME_PATH to its executable. Existing rendered diagrams do not need a browser to build.');
}

export async function renderMermaidDiagram(source) {
  const directive = /^%%\{init:\s*(.+)\}%%/m.exec(source);
  const backgroundColor = directive ? JSON.parse(directive[1]).themeVariables?.background || '#090b0d' : '#090b0d';
  const hash = createHash('sha256').update(source).update('\0fit-note-labels-v1').digest('hex');
  const basename = `cspt-sequence-${hash.slice(0, 12)}`;
  const src = `blog-assets/${basename}.svg`;
  const output = resolve('public', src);
  try {
    const cached = await readFile(output, 'utf8');
    return { src, ...dimensions(cached) };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const temporary = resolve('node_modules/.cache/anas-mermaid');
  await mkdir(temporary, { recursive: true });
  const input = resolve(temporary, `${basename}.mmd`);
  const temporarySvg = resolve(temporary, `${basename}.svg`);
  let browser;
  try {
    await writeFile(input, source);
    browser = await puppeteer.launch({
      executablePath: await installedBrowser(),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    await run(input, temporarySvg, {
      quiet: true,
      browser,
      parseMMDOptions: {
        svgId: basename,
        backgroundColor,
        mermaidConfig: { securityLevel: 'strict' },
      },
    });
    let svg = await readFile(temporarySvg, 'utf8');
    // Fit note rectangles to the glyphs actually rendered by the browser.
    // Mermaid's font measurement can otherwise underestimate Arial labels.
    const page = await browser.newPage();
    await page.setContent(svg);
    await page.evaluate(() => document.fonts.ready);
    svg = await page.evaluate(() => {
      const root = document.querySelector('svg');
      const padding = 12;
      for (const rect of root.querySelectorAll('rect.note')) {
        const labels = [...rect.parentElement.querySelectorAll('text.noteText')];
        if (!labels.length) continue;
        const box = rect.getBBox();
        const bounds = labels.map(label => label.getBBox());
        const left = Math.min(box.x, ...bounds.map(label => label.x - padding));
        const right = Math.max(box.x + box.width, ...bounds.map(label => label.x + label.width + padding));
        rect.setAttribute('x', String(left));
        rect.setAttribute('width', String(right - left));
      }
      const bounds = root.getBBox();
      root.setAttribute('viewBox', `${bounds.x - 24} ${bounds.y - 16} ${bounds.width + 48} ${bounds.height + 32}`);
      return new XMLSerializer().serializeToString(root);
    });
    await page.close();
    const size = dimensions(svg);
    // Explicit intrinsic dimensions reserve the layout before the image loads.
    svg = svg.replace(/<svg\b([^>]*)>/, (_, attributes) => {
      let attrs = attributes.replace(/\swidth="[^"]*"/g, '').replace(/\sheight="[^"]*"/g, '');
      return `<svg${attrs} width="${size.width}" height="${size.height}">`;
    });
    await writeFile(output, svg);
    console.log(`Rendered Mermaid sequence diagram: ${size.width} × ${size.height}.`);
    return { src, ...size };
  } finally {
    if (browser) await browser.close();
    await rm(input, { force: true });
    await rm(temporarySvg, { force: true });
  }
}
