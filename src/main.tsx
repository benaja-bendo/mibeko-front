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

// Configuration du worker PDF.js indispensable pour react-pdf
// On utilise le worker copié dans le dossier public pour éviter tout problème de chemin ou de CORS
// pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
// On pointe le worker vers la version CDN demandée
// pdfjs.GlobalWorkerOptions.workerSrc = 'https://app.unpkg.com/pdfjs-dist@6.0.227/files/build/pdf.worker.min.mjs';
// AJOUTEZ celle-ci (Vite gérera le chemin et le hashage du fichier de façon transparente) :
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
