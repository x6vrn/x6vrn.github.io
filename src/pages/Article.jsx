import { createElement, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import CodeBlock from '../components/CodeBlock';
import MermaidDiagram from '../components/MermaidDiagram';

const hasArabic = value => /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(value);
const nodeText = node => typeof node === 'string' ? node : node.children.map(nodeText).join('');

// Bidi markup isolates technical terms without adding directional characters to the text.
function isolatedText(text) {
  return text.split(/([\x00-\x7f]+)/).map((part, index) => {
    if (!/[A-Za-z0-9]/.test(part) || hasArabic(part)) return part;
    const match = /^(\s*)([\s\S]*?\S)(\s*)$/.exec(part);
    return match ? <span key={index}>{match[1]}<bdi dir="ltr" lang="en">{match[2]}</bdi>{match[3]}</span> : part;
  });
}

function ArticleNode({ node, language }) {
  const arabic = language === 'ar';
  if (typeof node === 'string') return arabic ? isolatedText(node) : node;
  if (node.tag === 'diagram') return <MermaidDiagram diagram={node.props} language={language} />;
  if (node.tag === 'pre') {
    const code = node.children.find(child => child.tag === 'code');
    return <CodeBlock code={code.children.join('')} language={code.props.className.replace('language-', '')} number={node.blockNumber} locale={language} />;
  }
  const props = { ...node.props };
  if (arabic && /^(p|li|h[2-6]|blockquote)$/.test(node.tag)) props.dir = hasArabic(nodeText(node)) ? 'rtl' : 'ltr';
  if (node.tag === 'code') return <code {...props} dir="ltr">{nodeText(node)}</code>;
  if (arabic && node.tag === 'a') props.dir = hasArabic(nodeText(node)) ? 'rtl' : 'ltr';
  const children = node.children.map((child, index) => <ArticleNode key={index} node={child} language={language} />);
  return createElement(node.tag, props, children.length ? children : undefined);
}

export default function Article({ post }) {
  const articleRef = useRef(null);
  const [active, setActive] = useState(null);
  const language = post.language || 'en';
  const arabic = language === 'ar';
  const direction = arabic ? 'rtl' : 'ltr';
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const sections = [...articleRef.current.querySelectorAll('h2, h3')];
    const visible = new Map();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => visible.set(entry.target.id, entry.isIntersecting));
      const current = sections.find(section => visible.get(section.id));
      if (current) setActive(current.id);
    }, { rootMargin: '-5% 0px -65% 0px' });
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  return <Layout>
    <main id="main" className="article-main" lang={language}>
      <div className="article-breadcrumb">
        <a className="back-link" href="index.html#writing" dir="ltr">{arabic ? '← كل المقالات' : '← All writing'}</a>
        {post.translations && <nav className="language-switch" aria-label={arabic ? 'لغة المقال' : 'Article language'} dir="ltr">
          <a href={post.translations.en} hrefLang="en" lang="en" aria-current={language === 'en' ? 'page' : undefined}>English</a>
          <a href={post.translations.ar} hrefLang="ar" lang="ar" aria-current={arabic ? 'page' : undefined}>العربية</a>
        </nav>}
      </div>
      <header className="article-header" dir={direction}>
        <div className="post-meta" dir="ltr"><span>{(post.categories || ['XS-LEAKS', 'CHROMIUM']).map((category, index) => <span key={category}>{index > 0 && <span className="meta-separator">/</span>}{category}</span>)}</span>{post.minutes && <span>{post.minutes} MIN READ</span>}</div>
        <h1 dir="auto">{post.title}</h1>{post.subtitle && <p className="article-subtitle" dir="auto">{post.subtitle}</p>}
      </header>
      <div className="article-layout" dir="ltr">
        <article className="article-content" ref={articleRef} aria-label={arabic ? 'المقال' : 'Article'} lang={language} dir={direction}>
          {post.body.map((node, index) => <ArticleNode key={index} node={node} language={language} />)}
          <div className="article-end" dir={direction}><a href="index.html#writing">{arabic ? 'كل المقالات ←' : '← All writing'}</a></div>
        </article>
        <aside className="article-sidebar" lang={language} dir={direction}><details className="toc" open>
          <summary>{arabic ? 'المحتويات' : 'CONTENTS'}</summary><nav aria-label={arabic ? 'محتويات المقال' : 'Table of contents'}><ol>{post.toc.map(section => <li key={section.id} className={`toc-${section.level}`}><a href={`#${section.id}`} aria-current={active === section.id ? 'location' : undefined}>{arabic ? isolatedText(section.title) : section.title}</a></li>)}</ol></nav>
        </details></aside>
      </div>
    </main>
  </Layout>;
}
