# Mibeko Front (React + Vite)

Frontend SPA de Mibeko (LegalTech).

## Prérequis

- Node.js (idéalement 22.22.2+)
- npm

## Installation

```bash
npm install
```

## Développement

Le serveur Vite proxifie :

- `/api/v1/*` → Laravel (`http://localhost:8000`)
- `/py/*` → Python (`http://localhost:8001`)

```bash
npm run dev
```

## Qualité

```bash
npm run lint
```

## Tests

Stack : Vitest + Testing Library + MSW (mock HTTP).

```bash
npm test
npm run test:run
npm run test:coverage
```

## Build

```bash
npm run build
```

## Variables d’environnement

- Copier `.env.example` en `.env` (local uniquement)
- Ne jamais committer `.env` (déjà ignoré par `.gitignore`)

## GitHub

- CI : `.github/workflows/ci.yml` (lint + tests + build)
- Déploiement : `.github/workflows/deploy-prod.yml` (build/push GHCR + déploiement VPS)
```
