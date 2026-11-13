import ArrowUpRight from './ArrowUpRight';

export default function MermaidDiagram({ diagram, language = 'en' }) {
  const arabic = language === 'ar';
  const label = arabic ? 'فتح المخطط بالحجم الكامل' : 'Open full-size diagram';
  return <figure className="diagram-figure mermaid-figure" dir="ltr">
    <a href={diagram.src} target="_blank" rel="noopener noreferrer" aria-label={label}>
      <img src={diagram.src} width={diagram.width} height={diagram.height} loading="lazy" alt="Sequence diagram: client-side path traversal reaches an open redirect, followed by a CORS preflight and a conditional request carrying the custom authentication header." />
    </a>
    <figcaption><a href={diagram.src} target="_blank" rel="noopener noreferrer" lang={language} dir={arabic ? 'rtl' : 'ltr'}>{label} <ArrowUpRight /></a></figcaption>
  </figure>;
}
