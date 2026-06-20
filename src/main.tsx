import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './theme/tokens.css';
import './theme/chrome.css';

// Default to the CS2 (2006) skin; the Window > Theme menu can switch to Modern.
document.documentElement.setAttribute('data-theme', 'cs2');

// StrictMode intentionally omitted: the canvas engine / interaction controller / pointer
// listeners are imperative singletons whose double-mount under StrictMode causes
// duplicate-listener churn. Effects are written to clean up; production builds are unaffected.
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
