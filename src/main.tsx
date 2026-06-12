import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Niente StrictMode: evita la doppia esecuzione degli effect (timer flip carte,
// subscription realtime) in dev, mantenendo il comportamento del prototipo.
createRoot(document.getElementById('root')!).render(<App />);
