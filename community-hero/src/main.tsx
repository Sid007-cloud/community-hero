import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept cross-origin script errors and unhandled rejections to prevent canvas failures
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message === "Script error." || !event.message) {
      console.warn("Muffled sandboxed browser environment script error:", event);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    // Gracefully handle unhandled empty rejections
    if (!event.reason) {
      event.preventDefault();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
