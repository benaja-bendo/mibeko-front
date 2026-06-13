/**
 * Options pdfjs partagées par tous les visualiseurs PDF de l'application.
 *
 * Les assets sont servis localement par le plugin Vite `mibeko:pdfjs-assets`.
 * `wasmUrl` est indispensable : les PDF du JO sont des scans JBIG2/JPX dont
 * le décodage se fait en wasm depuis pdfjs-dist v5+. Objet figé au niveau
 * module pour garder une identité stable (sinon react-pdf recharge le
 * document à chaque rendu).
 */
export const PDF_OPTIONS = {
  wasmUrl: '/pdfjs-assets/wasm/',
  iccUrl: '/pdfjs-assets/iccs/',
  cMapUrl: '/pdfjs-assets/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs-assets/standard_fonts/',
} as const;
