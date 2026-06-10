/**
 * lex-gold.ts — Thème par défaut « Lex Gold » (DESIGN_1).
 *
 * « Prestige Technical » : minimalisme sombre, charbon profond et accent
 * bronze, pensé pour les longues sessions de revue documentaire. Les valeurs
 * reprennent exactement le design system historique de l'application
 * (globals.css) — ce thème est donc sans régression visuelle.
 */
import type { ThemeDefinition } from './types';

export const lexGold: ThemeDefinition = {
  id: 'lex-gold',
  name: 'Lex Gold',
  description: 'Sombre et feutré — charbon profond, accent bronze, précision technique.',
  mode: 'dark',
  colors: {
    bg: '#0c0d0f',
    s1: '#141517',
    s2: '#1b1d21',
    s3: '#222428',
    s4: '#2a2d33',
    b1: 'rgba(255,255,255,.055)',
    b2: 'rgba(255,255,255,.10)',
    b3: 'rgba(255,255,255,.16)',
    t1: '#e9e7e1',
    t2: '#9b9891',
    t3: '#5e5c57',
    t4: '#3a3936',
    gold: '#c8a86a',
    onGold: '#120e00',
    goldD: 'rgba(200,168,106,.12)',
    goldD2: 'rgba(200,168,106,.22)',
    blue: '#5c8fd4',
    blueD: 'rgba(92,143,212,.13)',
    green: '#56a07a',
    greenD: 'rgba(86,160,122,.12)',
    red: '#c4614e',
    redD: 'rgba(196,97,78,.12)',
    purple: '#9478c8',
    purpleD: 'rgba(148,120,200,.13)',
    amber: '#c4903a',
    amberD: 'rgba(196,144,58,.12)',
  },
  fonts: {
    display: "'Fraunces', serif",
    body: "'Instrument Sans', sans-serif",
    mono: "'DM Mono', monospace",
    googleFontsHref:
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,600;1,9..144,300&family=DM+Mono:wght@400;500&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap',
  },
  radii: {
    sm: '5px',
    md: '9px',
    lg: '14px',
  },
  preview: {
    bg: '#0c0d0f',
    surface: '#1b1d21',
    accent: '#c8a86a',
    text: '#e9e7e1',
    border: 'rgba(255,255,255,.10)',
  },
};
