import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { initDb } from './data/db'
import { cronEngine } from './services/cronService'
import { fetchSystemTimeInfo } from './utils/dateFormatter'

// ── Global keyboard shortcuts (T4.5) ──────────────────────────────────────────
let currentZoom = 1;
window.addEventListener('keydown', (e) => {
  // Zoom controls
  if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    currentZoom = Math.min(currentZoom + 0.1, 2.0);
    document.body.style.zoom = currentZoom;
  } else if (e.ctrlKey && e.key === '-') {
    e.preventDefault();
    currentZoom = Math.max(currentZoom - 0.1, 0.5);
    document.body.style.zoom = currentZoom;
  } else if (e.ctrlKey && e.key === '0') {
    e.preventDefault();
    currentZoom = 1;
    document.body.style.zoom = currentZoom;

  // Ctrl+K is handled in App.jsx (CommandPalette toggle) — do not bind here,
  // a second listener caused palette-open + focus-steal firing together.

  // Ctrl+Shift+A → navigate to Approvals
  } else if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    e.preventDefault();
    window.history.pushState({}, '', '/approvals');
    window.dispatchEvent(new PopStateEvent('popstate'));

  // Ctrl+Shift+D → navigate to Dashboard
  } else if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    window.history.pushState({}, '', '/dashboard');
    window.dispatchEvent(new PopStateEvent('popstate'));

  // Ctrl+Shift+I → navigate to Invoices
  } else if (e.ctrlKey && e.shiftKey && e.key === 'I') {
    e.preventDefault();
    window.history.pushState({}, '', '/invoices');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
});

// Initialize the database and system timezone offset before rendering
Promise.all([initDb(), fetchSystemTimeInfo()]).then(() => {
  cronEngine.start();

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
}).catch(err => {
  console.error('Database initialization failed:', err);
  ReactDOM.createRoot(document.getElementById('root')).render(
    <div style={{ padding: 40, color: 'white', background: '#111', height: '100vh' }}>
      <h1>Mickii Engine Error</h1>
      <p>Database initialization failed. Please check if the tauri-plugin-sql is correctly configured.</p>
      <pre>{err.toString()}</pre>
    </div>
  );
});
