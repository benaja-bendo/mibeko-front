import { describe, expect, it } from 'vitest';
import { workFileName } from './workFileName';

describe('workFileName', () => {
  it('translittère les accents au lieu de les effacer', () => {
    expect(workFileName('Décret n° 2025-240 du 20 juin 2025'))
      .toBe('decret-n-2025-240-du-20-juin-2025_dossier-de-travail.json');
  });

  it('tronque sur un mot un titre à rallonge', () => {
    // Cas réel : un arrêté publié dont le titre officiel fait plus de 150
    // caractères produisait un nom de fichier illisible.
    const nom = workFileName(
      'Arrêté n° 2055 du 18 juillet 2025 accordant une autorisation d’exercice de '
      + 'l’activité de production autonome de l’eau à la société IFO Interholco Ngombé',
    );

    expect(nom.length).toBeLessThan(90);
    expect(nom.endsWith('_dossier-de-travail.json')).toBe(true);
    expect(nom).not.toMatch(/-_dossier/);
  });

  it('reste utilisable sans titre', () => {
    expect(workFileName(undefined)).toBe('document_dossier-de-travail.json');
    expect(workFileName('!!!')).toBe('document_dossier-de-travail.json');
  });
});
