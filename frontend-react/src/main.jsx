import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applySafariFixes, addSafariClasses } from './utils/safariPolyfills.js'

// Apply Safari fixes on startup
if (typeof window !== 'undefined') {
  addSafariClasses();
  applySafariFixes();
  
  // Tambahkan error boundary untuk debugging
  window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)