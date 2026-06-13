import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useJournalMutations } from '@/features/journals/hooks/useJournals';
import { searchDocuments, type LaravelDocument } from '@/features/documents/api/laravelApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Link2, Search, AlertTriangle } from 'lucide-react';

/**
 * Rattache au journal un texte déjà présent dans la solution (ingéré à part
 * ou détaché par erreur). Les documents consolidés (STOCK) ne sont pas
 * rattachables : la contrainte d'intégrité les réserve hors JO.
 */
export default function AttachDocumentModal({
  journalId,
  open,
  onOpenChange,
}: {
  journalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { attachDocument } = useJournalMutations(journalId);
  const [query, setQuery] = React.useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['journal-attach-search', query],
    queryFn: () => searchDocuments(query),
    enabled: open && query.trim().length >= 2,
  });

  const results: LaravelDocument[] = data?.data ?? [];

  React.useEffect(() => {
    if (open) {
      setQuery('');
      attachDocument.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-gold" />
            Rattacher un texte existant
          </DialogTitle>
          <DialogDescription>
            Recherchez un texte déjà présent dans la solution pour le lier à ce
            journal officiel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <Input
              placeholder="Rechercher par titre (2 caractères min.)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-[320px] overflow-y-auto space-y-1.5 custom-scrollbar">
            {isFetching && (
              <p className="text-t3 text-[11px] font-mono px-1 py-2">Recherche…</p>
            )}

            {!isFetching && query.trim().length >= 2 && results.length === 0 && (
              <p className="text-t3 text-[12px] italic px-1 py-2">Aucun texte trouvé.</p>
            )}

            {results.map(doc => {
              const isStock = doc.document_role === 'STOCK';
              const alreadyHere = doc.official_journal_id === journalId;
              const attachedElsewhere = !!doc.official_journal_id && !alreadyHere;

              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-b1 bg-s2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-t1 truncate">{doc.titre_officiel}</p>
                    <p className="text-[10px] text-t3 font-mono mt-0.5 flex items-center gap-2">
                      <span>{doc.type_code || 'DOC'}</span>
                      {isStock && (
                        <span className="inline-flex items-center gap-1 text-amber">
                          <AlertTriangle className="w-3 h-3" /> Consolidé (STOCK) — non rattachable
                        </span>
                      )}
                      {attachedElsewhere && <span className="text-amber">Déjà lié à un autre JO</span>}
                      {alreadyHere && <span className="text-green">Déjà dans ce journal</span>}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isStock || alreadyHere || attachDocument.isPending}
                    onClick={() => attachDocument.mutate(doc.id)}
                    className="text-[11px] h-7 shrink-0"
                  >
                    {attachedElsewhere ? 'Re-rattacher ici' : 'Rattacher'}
                  </Button>
                </div>
              );
            })}
          </div>

          {attachDocument.isError && (
            <p className="text-red text-[11px] font-mono">
              Le rattachement a échoué (les documents consolidés ne sont pas rattachables).
            </p>
          )}
          {attachDocument.isSuccess && (
            <p className="text-green text-[11px] font-mono">Texte rattaché au journal.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
