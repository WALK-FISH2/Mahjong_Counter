import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { AppErrorBoundary } from './app/errors/AppErrorBoundary';
import './app/app.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Missing root element.');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
