import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { AuthProvider } from './auth/AuthContext';
import { ImobiliariaProvider } from './hooks/useImobiliaria';
import { setDocumentTitle } from './config/app';
import './styles.css';

setDocumentTitle();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ImobiliariaProvider>
          <AppRoutes />
        </ImobiliariaProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
