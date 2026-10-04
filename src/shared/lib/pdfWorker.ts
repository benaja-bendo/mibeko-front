import { pdfjs } from 'react-pdf';

/**
 * Worker PDF.js auto-hébergé : Vite l'émet comme asset du bundle, ce qui
 * garantit la même version que l'API pdfjs et supprime la dépendance CDN
 * (que la CSP de docker/nginx/default.conf bloquerait de toute façon).
 *
 * Module à effet de bord, importé par les seuls composants qui montent un
 * `<Document>` react-pdf. Posé dans main.tsx, il faisait entrer react-pdf et
 * pdfjs-dist dans le graphe du point d'entrée : chaque page, connexion
 * comprise, préchargeait le chunk `pdf` (mibeko-front#69).
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();
