
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initOutbox } from './lib/outbox';
import { registerSW } from 'virtual:pwa-register';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <App />
);

// Start the durable write-outbox: replays any queued writes on reconnect/focus.
initOutbox();

// Register the service worker (vite-plugin-pwa) with a controlled update prompt:
// a new version is fetched in the background and applied only when the user taps.
const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('pwa-need-refresh'));
  },
});
(window as Window & { __pwaUpdate?: (reload?: boolean) => void }).__pwaUpdate = updateSW;
