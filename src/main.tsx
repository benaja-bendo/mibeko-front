import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/app/providers/queryClient';
import { bootstrapTheme } from '@/app/themes';
import '@/app/styles/globals.css';
import App from './App.tsx';

// Applique le thème persisté : le script inline d'index.html a déjà posé les
// variables avant le premier paint ; ici on branche fonts + data-theme.
bootstrapTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
