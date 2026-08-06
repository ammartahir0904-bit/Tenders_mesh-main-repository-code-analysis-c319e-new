// ─── main.tsx: Application entry point ───

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './app/Layout';
import { ToastProvider } from './components/ui/Toast';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Layout />
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);


