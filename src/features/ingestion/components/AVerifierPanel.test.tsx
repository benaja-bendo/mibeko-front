import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { renderWithProviders } from '../../../test/render';
import { AVerifierPanel } from './AVerifierPanel';

const DOC_ID = 'doc-1';

function mockRelecture(overrides?: Partial<{ points_obligatoires: unknown[]; sondage_articles: unknown[] }>) {
  server.use(
    http.get(`*/api/v1/legal-documents/${DOC_ID}/relecture`, () =>
      HttpResponse.json({
        data: {
          document_controle_run_id: 'run-1',
          version_jeu: 'v3',
          resultat: 'incomplet',
          points_obligatoires: overrides?.points_obligatoires ?? [{ id: 'art-1', numero_article: '1' }],
          sondage_articles: overrides?.sondage_articles ?? [{ id: 'art-2', numero_article: '2' }],
          preuve_existante: false,
        },
      })
    )
  );
}

function mockFlags(flags: Array<{ id: string; severity: 'blocking' | 'warning'; type_probleme: string; description: string; article_id?: string | null }>) {
  server.use(
    http.get(`*/api/v1/legal-documents/${DOC_ID}/curation-flags`, () =>
      HttpResponse.json({
        data: flags.map((f) => ({
          id: f.id,
          source: 'heuristic',
          type_probleme: f.type_probleme,
          severity: f.severity,
          description: f.description,
          suggestion: null,
          confidence: null,
          resolved: false,
          resolved_by: null,
          created_at: null,
          article_id: f.article_id ?? null,
          node_id: null,
          page: null,
        })),
      })
    )
  );
}

describe('AVerifierPanel', () => {
  it('désactive Valider tant que des signalements bloquants sont ouverts', async () => {
    mockFlags([{ id: 'f1', severity: 'blocking', type_probleme: 'BLOC_MANQUANT', description: 'Pages manquantes.' }]);
    mockRelecture();

    renderWithProviders(<AVerifierPanel documentId={DOC_ID} curationStatus="draft" onValidated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Pages manquantes.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Valider' })).toBeDisabled();
  });

  it('active Valider une fois les points obligatoires et le sondage cochés, sans bloquant', async () => {
    const user = userEvent.setup();
    mockFlags([]);
    mockRelecture();

    renderWithProviders(<AVerifierPanel documentId={DOC_ID} curationStatus="draft" onValidated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Art. 1')).toBeInTheDocument();
    });

    const validerButton = screen.getByRole('button', { name: 'Valider' });
    expect(validerButton).toBeDisabled();

    const checkboxes = screen.getAllByRole('checkbox');
    for (const checkbox of checkboxes) {
      await user.click(checkbox);
    }

    expect(validerButton).toBeEnabled();
  });

  it('enregistre la preuve puis transite draft → review → validated en deux temps', async () => {
    const user = userEvent.setup();
    mockFlags([]);
    mockRelecture();

    let relecturePayload: Record<string, unknown> | null = null;
    const bulkCalls: Array<Record<string, unknown>> = [];
    const onValidated = vi.fn();

    server.use(
      http.post(`*/api/v1/legal-documents/${DOC_ID}/relecture`, async ({ request }) => {
        relecturePayload = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: { id: 'preuve-1' }, message: 'Preuve enregistrée.' }, { status: 201 });
      }),
      http.patch('*/api/v1/legal-documents/bulk', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        bulkCalls.push(body);
        return HttpResponse.json({ data: { updated_count: 1, skipped_count: 0, skipped: [] }, message: 'ok' });
      })
    );

    renderWithProviders(<AVerifierPanel documentId={DOC_ID} curationStatus="draft" onValidated={onValidated} />);

    await waitFor(() => {
      expect(screen.getByText('Art. 1')).toBeInTheDocument();
    });

    for (const checkbox of screen.getAllByRole('checkbox')) {
      await user.click(checkbox);
    }
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    await waitFor(() => expect(onValidated).toHaveBeenCalled());

    expect(relecturePayload).toMatchObject({ points_vus: ['art-1'], sondage_confirmes: ['art-2'] });
    // draft → review → validated : la machine à états de LegalDocument
    // n'autorise pas un saut direct depuis un brouillon.
    expect(bulkCalls).toEqual([
      expect.objectContaining({ ids: [DOC_ID], value: 'review' }),
      expect.objectContaining({ ids: [DOC_ID], value: 'validated' }),
    ]);
  });

  it('ne transite qu’une fois vers validated quand le document est déjà en review', async () => {
    const user = userEvent.setup();
    mockFlags([]);
    mockRelecture({ points_obligatoires: [], sondage_articles: [] });

    const bulkCalls: Array<Record<string, unknown>> = [];
    const onValidated = vi.fn();

    server.use(
      http.post(`*/api/v1/legal-documents/${DOC_ID}/relecture`, () =>
        HttpResponse.json({ data: { id: 'preuve-1' }, message: 'Preuve enregistrée.' }, { status: 201 })
      ),
      http.patch('*/api/v1/legal-documents/bulk', async ({ request }) => {
        bulkCalls.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ data: { updated_count: 1, skipped_count: 0, skipped: [] }, message: 'ok' });
      })
    );

    renderWithProviders(<AVerifierPanel documentId={DOC_ID} curationStatus="review" onValidated={onValidated} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Valider' })).toBeEnabled();
    });
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    await waitFor(() => expect(onValidated).toHaveBeenCalled());
    expect(bulkCalls).toEqual([expect.objectContaining({ ids: [DOC_ID], value: 'validated' })]);
  });
});
