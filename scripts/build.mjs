import { build } from 'vite';
import { generateResearchContent } from './content.mjs';
import react from '@vitejs/plugin-react';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const temporary = resolve('node_modules/.cache/anas-prerender');
await generateResearchContent();
await build();
try {
  await build({
    configFile: false,
    plugins: [react()],
    logLevel: 'warn',
    build: {
      ssr: 'src/prerender.jsx',
      outDir: temporary,
      emptyOutDir: true,
      copyPublicDir: false,
      rolldownOptions: { output: { entryFileNames: 'prerender.mjs' } },
    },
  });
  const { renderPage } = await import(pathToFileURL(resolve(temporary, 'prerender.mjs')).href);
  for (const [filename, name] of [['index.html', 'home'], ['xsleaks-part1.html', 'article'], ['cspt-to-ato.html', 'csptEnglish'], ['cspt-to-ato-ar.html', 'csptArabic'], ['404.html', 'notFound']]) {
    const path = resolve('dist', filename);
    const html = await readFile(path, 'utf8');
    if (!html.includes('<div id="root"></div>')) throw new Error(`Missing React root in ${filename}`);
    await writeFile(path, html.replace('<div id="root"></div>', () => `<div id="root">${renderPage(name)}</div>`));
  }
  console.log('Rendered all React pages to static HTML in dist/. No upload or deployment performed.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
