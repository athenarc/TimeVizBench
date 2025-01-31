import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import { CookiesProvider } from 'react-cookie';
import { SnackbarProvider } from 'notistack';
import { CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';
import { store } from './store/store';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <SnackbarProvider
        preventDuplicate
        anchorOrigin={{horizontal: 'center', vertical: 'bottom'}}
      >
        <CookiesProvider defaultSetOptions={{ path: '/' }}>
          <CssBaseline />
          <App />
        </CookiesProvider>
      </SnackbarProvider>
    </Provider>
  </React.StrictMode>
);
