import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { setupServiceWorker } from './pwa/registerSW';

// Ask the browser to keep our data even under storage pressure (best effort, may be ignored).
void navigator.storage?.persist?.()?.catch(() => undefined);
setupServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
