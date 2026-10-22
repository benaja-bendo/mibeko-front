import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/app/providers/queryClient';
import { bootstrapTheme } from '@/app/themes';
// Polices du thème par défaut, auto-hébergées (latin seul : le français y tient).
// Lex Gold garde sa feuille Google Fonts, chargée par le moteur de thèmes.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-600.css';
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
