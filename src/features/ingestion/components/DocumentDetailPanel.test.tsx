import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { vi } from 'vitest';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { DocumentDetailPanel } from './DocumentDetailPanel';

function mockDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: 'doc_penal',
    titre_officiel: 'code penal',
    document_role: 'STOCK',
    type_code: 'CODE',
    legal_scope: 'national',
    extraction_status: 'partial',
    curation_status: 'published',
    has_md: true,
    has_json: false,
    nb_articles: 549,
    nb_nodes: 86,
    document_key: 'code-penal',
    statut: 'vigueur',
    files: [
      {
        id: 'file_pdf',
        document_id: 'doc_penal',
        file_path: '/x.pdf',
        storage_provider: 'minio',
        original_filename: 'Penal-Code-1836.pdf',
        file_category: 'SOURCE_PDF',
        file_size: 6816233,
      },
    ],
    extraction_runs: [],
    ...overrides,
  };
}

describe('DocumentDetailPanel — Réparer', () => {
  it('expose le re-OCR (Ré-extraire) pour un document publié ayant un PDF source', async () => {
    server.use(http.get('*/documents/:id', () => HttpResponse.json(mockDocument())));
    const onReprocess = vi.fn();

    renderWithProviders(
      <DocumentDetailPanel docId="doc_penal" onClose={() => {}} onParse={() => {}} onReprocess={onReprocess} />
    );

    await waitFor(() => expect(screen.getByText('Réparer')).toBeInTheDocument());

    const button = screen.getByRole('button', { name: /Ré-extraire \(OCR\)/i });
    fireEvent.click(button);
    expect(onReprocess).toHaveBeenCalledWith('doc_penal');
  });

  it("n'affiche pas le re-OCR si le document n'a pas de PDF source", async () => {
    server.use(http.get('*/documents/:id', () => HttpResponse.json(mockDocument({ files: [] }))));

    renderWithProviders(
      <DocumentDetailPanel docId="doc_penal" onClose={() => {}} onParse={() => {}} onReprocess={() => {}} />
    );

    // Le re-parsing MD reste proposé, mais pas le re-OCR (pas de PDF).
    await waitFor(() => expect(screen.getByRole('button', { name: /Re-parser MD/i })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Ré-extraire \(OCR\)/i })).not.toBeInTheDocument();
  });
});
