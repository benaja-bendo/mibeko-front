import { useQuery } from '@tanstack/react-query';
import { getDeletionImpact } from '@/features/documents/api/laravelApi';

/**
 * Récapitulatif partagé de l'impact d'une suppression définitive : ce qui
 * disparaît (compteurs) + garde-fous (citations entrantes, dossiers utilisateurs).
 * Utilisé par la liste des documents ET le viewer pour une UX de suppression
 * cohérente. Échec/insuffisance de droits → ne bloque pas (rien n'est rendu).
 */
export default function DeletionImpactPanel({ documentId }: { documentId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['deletion-impact', documentId],
    queryFn: () => getDeletionImpact(documentId).then((r) => r.data),
    staleTime: 0,
  });

  if (isLoading) {
    return <div className="mt-3 text-[12px] font-mono text-t3">Calcul de l'impact…</div>;
  }
  if (isError || !data) return null;

  const lines: Array<[string, number]> = [
    ['divisions', data.nodes],
    ['articles', data.articles],
    ['versions', data.versions],
    ['anomalies', data.flags],
    ['fichiers', data.media],
    ['relations', data.relations],
  ];

  return (
    <div className="mt-3 rounded-lg border border-b1 bg-s2/50 p-3 text-left">
      <div className="text-[10px] font-mono uppercase tracking-widest text-t3 mb-2">
        Seront supprimés définitivement
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
        {lines.map(([label, n]) => (
          <div key={label} className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-semibold tabular-nums text-t1">{n}</span>
            <span className="text-[11px] text-t3">{label}</span>
          </div>
        ))}
      </div>

      {(data.incoming_relations > 0 || data.dossier_references > 0) && (
        <div className="mt-3 space-y-1.5 border-t border-b1 pt-2">
          {data.incoming_relations > 0 && (
            <p className="text-[11.5px] text-amber">
              ⚠ Ce texte est cité par {data.incoming_relations} relation(s) d'autres documents — ces liens seront rompus.
            </p>
          )}
          {data.dossier_references > 0 && (
            <p className="text-[11.5px] text-amber">
              ⚠ {data.dossier_references} article(s) sont enregistrés dans des dossiers utilisateurs.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
