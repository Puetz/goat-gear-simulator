import '@fontsource-variable/fredoka/wdth.css';
import '@fontsource/lilita-one/latin-400.css';
import './styles/app.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CatalogError } from './catalog/catalog.ts';
import { ErrorScreen } from './ui/ErrorScreen.tsx';

const element = document.getElementById('root');
if (!element) throw new Error('Missing #root element');
const root = createRoot(element);

// The catalog is parsed while the app's modules load, so an invalid items.json surfaces here.
try {
  const { App } = await import('./ui/App.tsx');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  console.error(error);
  root.render(
    error instanceof CatalogError ? (
      <ErrorScreen
        title="items.json has problems"
        intro="Fix these in items.json, then run pnpm catalog:check to confirm:"
        problems={error.problems}
      />
    ) : (
      <ErrorScreen
        title="The simulator couldn't start"
        intro="Reload the page. If it keeps happening, this is the error:"
        problems={[String(error)]}
      />
    ),
  );
}
