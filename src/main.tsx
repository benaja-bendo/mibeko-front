import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { pdfjs } from 'react-pdf';
import './index.css';
import App from './App.tsx';

// Configuration du worker PDF.js indispensable pour react-pdf
// On utilise le worker copié dans le dossier public pour éviter tout problème de chemin ou de CORS
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
