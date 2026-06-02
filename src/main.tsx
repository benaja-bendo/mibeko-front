import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { pdfjs } from 'react-pdf';
import { queryClient } from '@/app/providers/queryClient';
import '@/app/styles/globals.css';
import App from './App.tsx';

// Configuration du worker PDF.js indispensable pour react-pdf
// On utilise le worker copié dans le dossier public pour éviter tout problème de chemin ou de CORS
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
