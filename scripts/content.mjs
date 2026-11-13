import MarkdownIt from 'markdown-it';
import { renderMermaidDiagram } from './diagrams.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const markdown = new MarkdownIt({ html: false, linkify: true, typographer: false });
const translations = { en: 'cspt-to-ato.html', ar: 'cspt-to-ato-ar.html' };
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// Rendering changes Markdown markup into elements. It does not edit the supplied prose.
async function contentNodes(tokens) {
  const nodes = [];
  const stack = [nodes];
  const toc = [];
  let codeNumber = 0;
  let section = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.hidden) continue;
    const children = stack[stack.length - 1];
    if (token.type === 'inline') {
      children.push(...inlineNodes(token.children || []));
    } else if (token.type === 'fence' || token.type === 'code_block') {
      const explicit = token.info.trim().split(/\s+/)[0];
      if (explicit === 'mermaid') {
        children.push({ tag: 'diagram', props: await renderMermaidDiagram(token.content), children: [] });
        continue;
      }
      const language = explicit === 'js' ? 'javascript' : explicit || (/^(?:HTTP\/\d|(?:GET|POST|OPTIONS)\s+\S+\s+HTTP\/)/.test(token.content) ? 'http' : 'plaintext');
      children.push({ tag: 'pre', props: { tabIndex: 0, dir: 'ltr' }, blockNumber: ++codeNumber, children: [{ tag: 'code', props: { className: `language-${language}` }, children: [token.content] }] });
    } else if (token.nesting === 1) {
      const node = { tag: token.tag, props: Object.fromEntries(token.attrs || []), children: [] };
      if (/^h[2-6]$/.test(token.tag)) {
        node.props.id = `section-${++section}`;
        toc.push({ id: node.props.id, title: tokens[index + 1].content, level: token.tag });
      }
      children.push(node);
      stack.push(node.children);
    } else if (token.nesting === -1) {
      stack.pop();
    } else if (token.type === 'hr') {
      children.push({ tag: 'hr', props: {}, children: [] });
    }
  }
  return { body: nodes, toc, codeBlocks: codeNumber };
}

function inlineNodes(tokens) {
  const nodes = [];
  const stack = [nodes];
  for (const token of tokens) {
    const children = stack[stack.length - 1];
    if (token.type === 'text') children.push(token.content);
    else if (token.type === 'softbreak') children.push('\n');
    else if (token.type === 'hardbreak') children.push({ tag: 'br', props: {}, children: [] });
    else if (token.type === 'code_inline') children.push({ tag: 'code', props: { dir: 'ltr' }, children: [token.content] });
    else if (token.nesting === 1) {
      const node = { tag: token.tag, props: Object.fromEntries(token.attrs || []), children: [] };
      children.push(node); stack.push(node.children);
    } else if (token.nesting === -1) stack.pop();
    else throw new Error(`Unsupported Markdown inline token: ${token.type}`);
  }
  return nodes;
}

export async function generateResearchContent() {
  for (const language of ['en', 'ar']) {
    const sourceFile = language === 'ar' ? 'CSPT_to_ATO_ar.md' : 'CSPT_to_ATO.md';
    const source = await readFile(resolve(sourceFile), 'utf8');
    const tokens = markdown.parse(source, {});
    if (tokens[0].type !== 'heading_open' || tokens[0].tag !== 'h1') throw new Error(`Missing title in ${sourceFile}`);
    const title = tokens[1].content;
    const { body, toc, codeBlocks } = await contentNodes(tokens.slice(3));
    const post = { title, language, direction: language === 'ar' ? 'rtl' : 'ltr', categories: ['CSPT', 'WEB SECURITY'], translations, sourceFile, sourceSha256: createHash('sha256').update(source).digest('hex'), body, toc };
    await writeFile(resolve(`src/content/cspt-to-ato-${language}.json`), `${JSON.stringify(post, null, 2)}\n`);
    await writeFile(resolve(translations[language]), `<!doctype html>
<html lang="${language}" dir="${post.direction}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="theme-color" content="#090b0d">
  <meta name="description" content="${escapeHtml(title)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:type" content="article">
  <title>${escapeHtml(title)}</title>
</head>
<body class="article-page">
  <div id="root"></div>
  <script type="module" src="/src/entry-cspt-${language}.jsx"></script>
</body>
</html>`);
    console.log(`Rendered ${sourceFile} unchanged: ${toc.length} sections, ${codeBlocks} code blocks.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await generateResearchContent();
