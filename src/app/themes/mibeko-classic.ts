/**
 * mibeko-classic.ts — Thème clair « Mibeko Classique » (DESIGN_2).
 *
 * Minimalisme institutionnel inspiré des archives juridiques congolaises :
 * fond crème, vert forêt profond pour les actions, terracotta sobre en
 * accent secondaire. Contrastes calibrés WCAG AA pour la lecture longue,
 * y compris en plein soleil.
 */
import type { ThemeDefinition } from './types';

export const mibekoClassic: ThemeDefinition = {
  id: 'mibeko-classic',
  name: 'Mibeko Classique',
  description: 'Clair et institutionnel — crème, vert forêt, terracotta. Pensé pour la lecture.',
  mode: 'light',
  colors: {
    bg: '#fcf9f8',
    s1: '#ffffff',
    s2: '#f6f3f2',
    s3: '#f0eded',
    s4: '#e4e2e1',
    b1: 'rgba(27,28,28,.10)',
    b2: 'rgba(27,28,28,.16)',
    b3: 'rgba(27,28,28,.26)',
    t1: '#1b1c1c',
    t2: '#414844',
    t3: '#727974',
    t4: '#a8aea9',
    gold: '#1e6b47', // Vert forêt plus prononcé (au lieu de #03271a qui paraissait noir)
    onGold: '#ffffff',
    goldD: 'rgba(30,107,71,.08)',
    goldD2: 'rgba(30,107,71,.15)',
    blue: '#2f5e9e',
    blueD: 'rgba(47,94,158,.10)',
    green: '#10b981', // Vert de succès distinct du vert forêt primaire
    greenD: 'rgba(16,185,129,.10)',
    red: '#ba1a1a',
    redD: 'rgba(186,26,26,.08)',
    purple: '#5c4a8a',
    purpleD: 'rgba(92,74,138,.10)',
    amber: '#8f4c31',
    amberD: 'rgba(143,76,49,.10)',
  },
  fonts: {
    display: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
    googleFontsHref:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap',
  },
  radii: {
    sm: '4px',
    md: '6px',
    lg: '8px',
  },
  preview: {
    bg: '#fcf9f8',
    surface: '#ffffff',
    accent: '#1e6b47',
    text: '#1b1c1c',
    border: 'rgba(27,28,28,.16)',
  },
};
