import { createRoot, hydrateRoot } from 'react-dom/client';
import './styles.css';

export function mount(Page) {
  const root = document.getElementById('root');
  const page = <Page />;
  if (root.hasChildNodes()) hydrateRoot(root, page);
  else createRoot(root).render(page);
}
