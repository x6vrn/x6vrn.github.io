import { useEffect, useMemo, useRef, useState } from 'react';
import hljs from 'highlight.js/lib/core';
import cpp from 'highlight.js/lib/languages/cpp';
import javascript from 'highlight.js/lib/languages/javascript';
import http from 'highlight.js/lib/languages/http';
import plaintext from 'highlight.js/lib/languages/plaintext';

hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('http', http);
hljs.registerLanguage('plaintext', plaintext);
const languageLabels = { javascript: 'JavaScript', cpp: 'C++ / Chromium', http: 'HTTP', plaintext: 'Text' };

export default function CodeBlock({ code, language = 'plaintext', number, locale = 'en' }) {
  const arabic = locale === 'ar';
  const copyLabel = arabic ? 'نسخ' : 'Copy';
  const codeRef = useRef(null);
  const timerRef = useRef(null);
  const [interactive, setInteractive] = useState(false);
  const [label, setLabel] = useState(copyLabel);
  const [status, setStatus] = useState('');
  const highlighted = useMemo(() => hljs.highlight(code, { language, ignoreIllegals: true }).value, [code, language]);
  useEffect(() => {
    setInteractive(true);
    return () => clearTimeout(timerRef.current);
  }, []);
  const copy = async () => {
    clearTimeout(timerRef.current);
    try {
      await navigator.clipboard.writeText(code);
      setLabel(arabic ? 'تم النسخ' : 'Copied!');
      setStatus(arabic ? `تم نسخ المقطع ${number}.` : `Code block ${number} copied to clipboard.`);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(codeRef.current);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      setLabel(arabic ? 'تم التحديد' : 'Selected');
      setStatus(arabic ? 'تم تحديد الكود. اضغط Control+C أو Command+C لنسخه.' : 'Code selected. Press Control+C or Command+C to copy.');
    }
    timerRef.current = setTimeout(() => setLabel(copyLabel), 2000);
  };
  return <div className="code-block" dir="ltr">
    <div className="code-toolbar"><span lang="en">{languageLabels[language] || language}</span><button className="copy-button" type="button" hidden={!interactive} onClick={copy} aria-label={arabic ? `نسخ المقطع ${number}` : `Copy code block ${number}`} lang={locale}>{label}</button></div>
    <pre tabIndex={0} dir="ltr"><code ref={codeRef} dir="ltr" className={`language-${language} hljs`} dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>
    <span className="copy-status" role="status" aria-live="polite" lang={locale}>{status}</span>
  </div>;
}
