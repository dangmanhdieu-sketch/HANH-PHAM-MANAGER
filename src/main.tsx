document.documentElement.dataset.hpMode = 'light';
document.documentElement.style.colorScheme = 'light';
try { localStorage.setItem('hp-ui-mode', 'light'); } catch {}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
