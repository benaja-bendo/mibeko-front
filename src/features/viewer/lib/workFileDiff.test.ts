import { describe, expect, it } from 'vitest';
import type { WorkFileSnapshot, WorkFileTarget } from '@/features/documents/api/laravelApi';
import { buildWorkFileDiff, extractTarget, validateWorkFile } from './workFileDiff';

const SHA = 'a'.repeat(64);

const cible = (articles: WorkFileTarget['articles'], nodes: WorkFileTarget['nodes'] = []): WorkFileTarget => ({
  schema_version: 1,
  document_id: 'doc-1',
  source_pdf: { filename: 'source.pdf', sha256: SHA, size: 10 },
  nodes,
  articles,
});

const article = (over: Partial<WorkFileTarget['articles'][number]> = {}) => ({
  id: 'art-1',
  number: '1',
  parent: null,
  order: 1,
  content: 'Texte de référence.',
  source_locator: { page: 3 },
  ...over,
});

describe('buildWorkFileDiff', () => {
  it('voit une renumérotation à identifiant conservé comme une modification, pas un retrait', () => {
    const diff = buildWorkFileDiff(cible([article()]), cible([article({ number: '1 bis' })]));

    expect(diff.removedArticles).toBe(0);
    expect(diff.addedArticles).toBe(0);
    expect(diff.renumberedArticles).toBe(1);
    expect(diff.articles[0]).toMatchObject({
      status: 'modifie',
      number: '1 bis',
      previousNumber: '1',
      contentChanged: false,
      locatorChanged: false,
    });
  });

  it('apparie par numéro quand la cible ne porte pas d identifiant', () => {
    const propose = { ...article({ content: 'Texte corrigé.' }) } as Record<string, unknown>;
    delete propose.id;

    const diff = buildWorkFileDiff(cible([article()]), cible([propose as never]));

    expect(diff.removedArticles).toBe(0);
    expect(diff.contentChanges).toBe(1);
    expect(diff.articles[0].charactersBefore).toBe('Texte de référence.'.length);
    expect(diff.articles[0].charactersAfter).toBe('Texte corrigé.'.length);
  });

  it('compte un identifiant inconnu comme un ajout ET un retrait, comme le fait le serveur', () => {
    const diff = buildWorkFileDiff(cible([article()]), cible([article({ id: 'art-inconnu' })]));

    expect(diff.addedArticles).toBe(1);
    expect(diff.removedArticles).toBe(1);
  });

  it('signale un article absent de la proposition comme retiré', () => {
    const diff = buildWorkFileDiff(
      cible([article(), article({ id: 'art-2', number: '2', order: 2 })]),
      cible([article()]),
    );

    expect(diff.removedArticles).toBe(1);
    expect(diff.articles.find((a) => a.status === 'retire')?.number).toBe('2');
  });

  it('distingue un changement de repère d un changement de texte', () => {
    const diff = buildWorkFileDiff(
      cible([article()]),
      cible([article({ source_locator: { page: 9 } })]),
    );

    expect(diff.contentChanges).toBe(0);
    expect(diff.locatorChanges).toBe(1);
    expect(diff.articles[0]).toMatchObject({ pageBefore: 3, pageAfter: 9 });
  });

  it('ignore l ordre des clés d un repère identique', () => {
    const avant = article({ source_locator: { page: 3, x: 1, y: 2 } });
    const apres = article({ source_locator: { y: 2, page: 3, x: 1 } });

    expect(buildWorkFileDiff(cible([avant]), cible([apres])).locatorChanges).toBe(0);
  });

  it('traite un repère vide stocké en tableau comme un repère absent', () => {
    // Forme réelle mesurée en production : PHP sérialise `{}` en `[]`, et 7
    // articles sur 23 d'un document réel arrivent ainsi.
    const vide = article({ source_locator: [] });

    const inchange = buildWorkFileDiff(cible([vide]), cible([article({ source_locator: [] })]));
    expect(inchange.locatorChanges).toBe(0);
    expect(inchange.articles[0].pageBefore).toBeNull();

    const renseigne = buildWorkFileDiff(cible([vide]), cible([article({ source_locator: { page: 4 } })]));
    expect(renseigne.locatorChanges).toBe(1);
    expect(renseigne.articles[0]).toMatchObject({ pageBefore: null, pageAfter: 4 });
  });

  it('ne compte pas comme retirée une division dont la cible reprend l identifiant', () => {
    const noeud = { key: 'n1', id: 'node-1', parent: null, type: 'TITRE', number: 'I', title: 'Ancien', order: 0 };
    const diff = buildWorkFileDiff(
      cible([article()], [noeud]),
      cible([article()], [{ ...noeud, title: 'Nouveau' }]),
    );

    expect(diff.nodes).toHaveLength(1);
    expect(diff.nodes[0]).toMatchObject({ status: 'modifie', titleBefore: 'Ancien', titleAfter: 'Nouveau' });
  });
});

describe('validateWorkFile', () => {
  const snapshot = {
    expected_fingerprint: 'f'.repeat(64),
    semantic_fingerprint: 'e'.repeat(64),
    target: cible([article()]),
    counts: { nodes: 0, articles: 1, characters: 19 },
  } satisfies WorkFileSnapshot;

  it('accepte un snapshot complet comme une cible nue', () => {
    expect(validateWorkFile(snapshot, snapshot)).toBeNull();
    expect(validateWorkFile(snapshot, snapshot.target)).toBeNull();
  });

  it('refuse un fichier visant un autre document', () => {
    const autre = { ...snapshot.target, document_id: 'doc-2' };

    expect(validateWorkFile(snapshot, autre)).toMatch(/autre document/);
  });

  it('refuse un PDF de référence différent', () => {
    const autre = { ...snapshot.target, source_pdf: { sha256: 'b'.repeat(64) } };

    expect(validateWorkFile(snapshot, autre)).toMatch(/PDF/);
  });

  it('refuse une version de format inconnue et un fichier vide d articles', () => {
    expect(validateWorkFile(snapshot, { ...snapshot.target, schema_version: 2 })).toMatch(/version 1/i);
    expect(validateWorkFile(snapshot, { ...snapshot.target, articles: [] })).toMatch(/aucun article/);
    expect(validateWorkFile(snapshot, 'pas du json objet')).toMatch(/JSON/);
  });
});

describe('extractTarget', () => {
  it('déplie indifféremment un snapshot ou une cible', () => {
    const target = cible([article()]);

    expect(extractTarget({ target }).document_id).toBe('doc-1');
    expect(extractTarget(target).document_id).toBe('doc-1');
  });
});
