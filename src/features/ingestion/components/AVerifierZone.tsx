/**
 * AVerifierZone.tsx — Liste des documents à relire dirigéement (mibeko-front#44),
 * remplace l'ancien sas de curation à deux étapes. Documents `draft` sans
 * travail en cours (même condition que `PipelineCell`/`StatusDot` ailleurs
 * dans cette feature) — un document en cours d'extraction n'a rien de stable
 * à relire.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPythonDocuments, type PythonDocumentSummary } from '../api/pythonApi';
import { RoleBadge, Spinner } from './badges';
import { AVerifierPanel } from './AVerifierPanel';

function estEnCours(doc: PythonDocumentSummary): boolean {
  return doc.latest_run_status === 'running' || doc.extraction_status === 'processing';
}

export function AVerifierZone() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: docs, isLoading } = useQuery({
    queryKey: ['python-documents', 'draft'],
    queryFn: () => getPythonDocuments({ limit: 100, curation: 'draft' }),
    refetchInterval: 10000,
  });

  const aVerifier = (docs || []).filter((d) => !estEnCours(d));
  const selected = aVerifier.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="flex gap-4 h-[calc(100vh-260px)] min-h-[400px]">
      <div className="w-72 shrink-0 border border-b1 rounded-lg bg-s1 overflow-y-auto">
        {isLoading && (
          <div className="p-4 text-t3 text-sm flex items-center gap-2">
            <Spinner className="w-4 h-4" /> Chargement…
          </div>
        )}
        {!isLoading && aVerifier.length === 0 && (
          <div className="p-4 text-t3 text-sm">Aucun document à vérifier.</div>
        )}
        {aVerifier.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setSelectedId(doc.id)}
            className={[
              'w-full text-left px-3 py-2.5 border-b border-b1 flex items-center gap-2 hover:bg-s2 transition-colors',
              selectedId === doc.id ? 'bg-s2' : '',
            ].join(' ')}
          >
            <RoleBadge role={doc.document_role} />
            <span className="text-xs text-t1 truncate">{doc.titre_officiel}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        {selected ? (
          <AVerifierPanel
            documentId={selected.id}
            curationStatus={selected.curation_status}
            onValidated={() => setSelectedId(null)}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-t3 text-sm">
            Sélectionnez un document à vérifier.
          </div>
        )}
      </div>
    </div>
  );
}
