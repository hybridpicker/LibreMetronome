// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Suppress UNSAFE_componentWillMount warning from react-helmet
const originalConsoleError = console.error;
console.error = function(...args) {
  if (args[0] && typeof args[0] === 'string' && 
      args[0].includes('UNSAFE_componentWillMount') && 
      args[0].includes('SideEffect(NullComponent)')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Disable Console Logs in production
if (process.env.NODE_ENV !== 'development') {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
