import { renderToString } from 'react-dom/server';
import Home from './pages/Home';
import XsLeaks from './pages/XsLeaks';
import CsptEnglish from './pages/CsptEnglish';
import CsptArabic from './pages/CsptArabic';
import NotFound from './pages/NotFound';

export function renderPage(name) {
  const Page = { home: Home, article: XsLeaks, csptEnglish: CsptEnglish, csptArabic: CsptArabic, notFound: NotFound }[name];
  return renderToString(<Page />);
}
