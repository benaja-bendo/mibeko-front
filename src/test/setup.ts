import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// jsdom n'implémente ni matchMedia ni ResizeObserver (useMediaQuery, GuidedTour).
// Fonctions simples (pas de vi.fn() : `restoreMocks` les viderait avant chaque test).
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver ?? ResizeObserverMock;

// jsdom n'implémente pas non plus le défilement programmatique (auto-scroll du chat).
Element.prototype.scrollTo = Element.prototype.scrollTo ?? (() => {});
Element.prototype.scrollIntoView =
  Element.prototype.scrollIntoView ?? (() => {});

// jsdom n'implémente pas `Blob.prototype.text()` (dépôt de fichier : dossier de
// travail du viewer). `FileReader` existe, lui — on s'en sert pour combler.
if (typeof Blob.prototype.text !== 'function') {
  Blob.prototype.text = function readAsText(this: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}
