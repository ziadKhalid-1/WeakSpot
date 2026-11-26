import React from 'react';
import { createRoot } from 'react-dom/client';
import './tokens.css';
import './base.css';
import './components/components.css';
import './lib/supabase.js'; // checks the Supabase env vars at startup
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
