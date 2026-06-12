import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Niente StrictMode: evita la doppia esecuzione degli effect (timer flip carte,
// subscription realtime) in dev, mantenendo il comportamento del prototipo.
createRoot(document.getElementById('root')!).render(<App />);

// PWA: registra il service worker (installabilità + shell offline).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* no-op */ });
  });
}
