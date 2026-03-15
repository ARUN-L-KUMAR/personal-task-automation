import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { Router } from './app/router';
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
    <React.StrictMode>
        <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID!}>
            <Router />
        </GoogleOAuthProvider>
    </React.StrictMode>
);
