# Anas / Web security research

A dark React blog covering web security and browser internals, built with Vite and published at https://x6vrn.github.io/.

## Develop locally

Use Node.js 22.13 or newer within the Node 22 release line.

```sh
npm ci
npm run dev
```

Open http://localhost:4173/.

## Build and preview

```sh
npm run build
npm run preview
```

The build renders the React pages into HTML in `dist/` and hydrates them in the browser. Articles, navigation, and diagrams remain available without JavaScript. These commands only build and serve local files.

## GitHub Pages

The `.github/workflows/pages.yml` workflow installs the locked dependencies, builds the site, and deploys only `dist/` to GitHub Pages when `main` changes. It can also be started manually from the Actions tab. The workflow pins its actions to commit SHAs.

Pages uses **GitHub Actions** as its publishing source. Vite's base path is `/` for the root site at https://x6vrn.github.io/. Assets use `/blog-assets/` to avoid the account's existing `/assets/` project site. The Google verification HTML is copied from `public/` into the site root during the build.

## Articles and languages

- `xsleaks-part1.html`: the XS-Leaks article.
- `cspt-to-ato.html`: the English CSPT article.
- `cspt-to-ato-ar.html`: the Arabic CSPT article.

The CSPT pages link to each other through the language switch. Their source text is in `CSPT_to_ATO.md` and `CSPT_to_ATO_ar.md`. Development startup and production builds generate the two HTML entry files and corresponding content JSON from Markdown. These generated files are excluded from version control; `npm run content` recreates them separately.

Arabic prose uses RTL markup, while code, URLs, and English technical terms are isolated as LTR. The contents rail preserves English phrases and balances long Arabic headings. Code blocks use Ayu-style syntax colors inside rounded charcoal boxes.

## Source layout

- `src/pages/`: React pages and article rendering.
- `src/components/`: shared layout, code copying, and diagram components.
- `src/content/`: article content nodes.
- `src/styles.css` and `src/arabic-font.css`: styling and local font rules.
- `public/blog-assets/`: fonts, original homepage artwork, and diagrams.
- `scripts/content.mjs`: Markdown conversion without typography rewriting.
- `scripts/build.mjs`: Vite build and React HTML generation.
- `scripts/diagrams.mjs`: Mermaid rendering and label fitting.

Only the configured page entries, application content, and `public/` assets enter the deployed artifact. Unfinished Markdown drafts, dependency folders, local configuration, and development artifacts are excluded.

## Mermaid diagrams

Mermaid fences are rendered into cached SVGs in `public/blog-assets/`. The browser receives the SVG rather than the Mermaid runtime. Note boxes are fitted to the rendered text to prevent overflow, and each diagram can be opened at full size. Temporary Mermaid input and rendering files stay in the ignored dependency cache.

Existing SVGs are reused during builds. Rendering a new or edited Mermaid definition requires a local Chrome or Chromium installation; common locations are detected automatically. Set `MERMAID_CHROME_PATH` if the browser is elsewhere. Package installation skips browser downloads.

Fonts are hosted locally, with licenses in `public/blog-assets/fonts/`. The site has no analytics, external asset requests, favicon, or light theme.
