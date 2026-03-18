import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AppProvider } from './context/AppContext';
import { GoogleOAuthProvider } from '@react-oauth/google'; // 1. Import the provider

const root = ReactDOM.createRoot(document.getElementById('root'));

// 2. Grab your Client ID from the .env file
const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

root.render(
  <React.StrictMode>
    {/* 3. Wrap your AppProvider with the GoogleOAuthProvider */}
    <GoogleOAuthProvider clientId={clientId}>
      <AppProvider>
        <App />
      </AppProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);