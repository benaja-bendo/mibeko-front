import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { pdfjs } from 'react-pdf';
import { queryClient } from '@/app/providers/queryClient';
import { bootstrapTheme } from '@/app/themes';
import '@/app/styles/globals.css';
import App from './App.tsx';

// Applique le thème persisté : le script inline d'index.html a déjà posé les
// variables avant le premier paint ; ici on branche fonts + data-theme.
bootstrapTheme();

// Worker PDF.js auto-hébergé : Vite l'émet comme asset du bundle, ce qui
// garantit la même version que l'API pdfjs et supprime la dépendance CDN.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
