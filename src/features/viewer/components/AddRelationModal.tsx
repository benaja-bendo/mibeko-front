import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useDocumentMutations } from '@/features/documents/hooks/useDocumentData';
import { useParams } from 'react-router-dom';
import { GitGraph, Search, Trash2, Calendar } from 'lucide-react';
import type { TreeNode } from '@/shared/types/database';
import { laravelClient } from '@/shared/api';
import { displayArticleNumber } from '@/shared/lib/legalLabels';

interface AddRelationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: TreeNode | null;
}

const RELATION_TYPES = [
  { value: 'CREE', label: 'Crée' },
  { value: 'MODIFIE', label: 'Modifie' },
  { value: 'ABROGE', label: 'Abroge' },
  { value: 'CITE', label: 'Cite' },
  { value: 'COMPLETE', label: 'Complète' },
  { value: 'RENUMEROTE', label: 'Renumérote' },
];

interface SearchResult {
  id: string;
  label: string;
  type: 'ARTICLE' | 'DOCUMENT';
}

interface Relation {
  id: string;
  relation_type: string;
  target_article?: { numero_article: string };
  target_document?: { titre_officiel: string };
  commentaire?: string;
}

export default function AddRelationModal({ open, onOpenChange, article }: AddRelationModalProps) {
  const { id: documentId } = useParams<{ id: string }>();
  const { createRelation, deleteRelation } = useDocumentMutations(documentId || '');

  const [search, setSearch] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [selectedTarget, setSelectedTarget] = React.useState<SearchResult | null>(null);
  const [relationType, setRelationType] = React.useState('CITE');
  const [commentaire, setCommentaire] = React.useState('');
  const [effectiveDate, setEffectiveDate] = React.useState('');
  const [existingRelations, setExistingRelations] = React.useState<Relation[]>([]);

  // Fetch existing relations when modal opens
  React.useEffect(() => {
    if (open && article?.id) {
      laravelClient.get<{data: Relation[]}>(`articles/${article.id}/relations`)
        .then(res => setExistingRelations(res.data.data || []))
        .catch(err => console.error('Failed to fetch relations', err));
    }
  }, [open, article?.id]);

  const handleSearch = async () => {
    if (search.length < 3) return;
    try {
      const res = await laravelClient.get<{data: SearchResult[]}>(`relations/search?q=${encodeURIComponent(search)}`);
      setResults(res.data.data || []);
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  const handleCreate = () => {
    if (!selectedTarget || !article) return;

    createRelation.mutate({
      source_article_id: article.id,
      target_article_id: selectedTarget.type === 'ARTICLE' ? selectedTarget.id : undefined,
      target_doc_id: selectedTarget.type === 'DOCUMENT' ? selectedTarget.id : undefined,
      relation_type: relationType,
      commentaire,
      effective_date: effectiveDate || undefined,
    }, {
      onSuccess: () => {
        setSelectedTarget(null);
        setSearch('');
        setResults([]);
        setCommentaire('');
        // Refresh list
        laravelClient.get<{data: Relation[]}>(`articles/${article.id}/relations`)
          .then(res => setExistingRelations(res.data.data || []));
      }
    });
  };

  const handleDelete = (id: string) => {
    deleteRelation.mutate(id, {
      onSuccess: () => {
        setExistingRelations(prev => prev.filter(r => r.id !== id));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-s1 border-b1 p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-b1">
          <DialogTitle className="text-gold font-display text-[15px] flex items-center gap-2">
            <GitGraph className="w-4 h-4" /> Relations de l'article {article?.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[450px]">
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {/* Relations Existantes */}
            <div className="mb-6">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-t3 mb-3">Relations existantes</h4>
              {existingRelations.length === 0 ? (
                <p className="text-t3 text-[11px] italic">Aucune relation définie.</p>
              ) : (
                <div className="space-y-2">
                  {existingRelations.map(rel => (
                    <div key={rel.id} className="p-2 bg-s2 border border-b1 rounded-md flex items-center justify-between group">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-gold/10 text-gold rounded uppercase">
                            {rel.relation_type}
                          </span>
                          <span className="text-[11px] text-t1 font-medium">
                            {rel.target_article ? `Art. ${displayArticleNumber(rel.target_article.numero_article)}` : rel.target_document?.titre_officiel}
                          </span>
                        </div>
                        {rel.commentaire && <span className="text-[10px] text-t3 italic">{rel.commentaire}</span>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-red opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(rel.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ajouter une relation */}
            <div className="pt-4 border-t border-b1">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-t3 mb-3">Ajouter un lien</h4>

              {!selectedTarget ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-t3" />
                      <Input
                        placeholder="Rechercher un article ou document..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-9 text-[12px] bg-s2 border-b1"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSearch} className="h-9">
                      Chercher
                    </Button>
                  </div>

                  <div className="max-h-[150px] overflow-y-auto space-y-1">
                    {results.map(res => (
                      <button
                        key={res.id}
                        onClick={() => setSelectedTarget(res)}
                        className="w-full text-left p-2 text-[11px] text-t2 hover:bg-s3 rounded transition-colors flex items-center justify-between"
                      >
                        <span className="truncate flex-1">{res.label}</span>
                        <span className="text-[8px] font-mono text-t3 ml-2">{res.type}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-2 bg-gold/5 border border-gold/20 rounded-md flex items-center justify-between">
                    <span className="text-[11px] text-gold font-medium truncate flex-1">{selectedTarget.label}</span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTarget(null)} className="h-6 text-[10px] text-t3">Changer</Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-t3 uppercase font-mono">Type</label>
                      <select
                        className="w-full bg-s2 border border-b1 rounded h-8 text-[11px] px-2 outline-none"
                        value={relationType}
                        onChange={(e) => setRelationType(e.target.value)}
                      >
                        {RELATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-t3 uppercase font-mono">Date d'effet</label>
                      <div className="relative">
                        <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-t3" />
                        <Input
                          type="date"
                          className="pl-7 h-8 text-[11px] bg-s2 border-b1"
                          value={effectiveDate || ''}
                          onChange={(e) => setEffectiveDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-t3 uppercase font-mono">Commentaire</label>
                    <textarea
                      className="w-full bg-s2 border border-b1 rounded p-2 text-[11px] outline-none min-h-[60px]"
                      placeholder="Ex: Modifié par l'article 12..."
                      value={commentaire || ''}
                      onChange={(e) => setCommentaire(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-b1 bg-s2 flex justify-end gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Fermer</Button>
            <Button
              variant="gold"
              size="sm"
              onClick={handleCreate}
              disabled={!selectedTarget || createRelation.isPending}
            >
              {createRelation.isPending ? 'Création...' : 'Ajouter la relation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
