import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { Provider } from "react-redux";
import { store } from './redux/store.js';

/**
 * ============================================================================
 * MAIN APPLICATION ENTRY POINT (`main.jsx`)
 * ============================================================================
 * Mounts React 19 application wrapped in the Redux Provider.
 * ============================================================================
 */
createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>
);
