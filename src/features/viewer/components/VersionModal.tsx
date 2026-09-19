import React from 'react';
import { useParams } from 'react-router-dom';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import { useDocumentMutations } from '@/features/documents/hooks/useDocumentData';
import { apiErrorMessage } from '@/features/documents/api/laravelApi';
import { laravelClient } from '@/shared/api';
import { cn } from '@/shared/lib/utils';
import { AlertCircle, Clock, Plus, Save, Search } from 'lucide-react';
import type { ArticleVersionUI } from '@/shared/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';

interface DocumentSearchResult {
  id: string;
  label: string;
  type: 'ARTICLE' | 'DOCUMENT';
}

/**
 * Enregistrement d'un amendement (dashboard#166) : contrairement à une
 * correction (`SidePanel`, `PATCH articles/{id}`), qui ne fork jamais de
 * version, cette action DOIT désigner le texte qui a réellement modifié
 * l'article — c'est ce qui distingue un amendement légal d'une simple
 * réécriture. Le champ est obligatoire côté API (`Rule::exists`) : on le
 * rend obligatoire ici aussi plutôt que de laisser l'éditeur découvrir le
 * 422 après coup.
 */
export default function VersionModal() {
  const { id: documentId } = useParams<{ id: string }>();
  const { versionModalOpen, setVersionModalOpen, versionFilter, setVersionFilter, selectedNode } = useViewerStore();
  const { addArticleVersion } = useDocumentMutations(documentId || '');

  const [newContent, setNewContent] = React.useState('');
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = React.useState(false);

  const [modifierSearch, setModifierSearch] = React.useState('');
  const [modifierResults, setModifierResults] = React.useState<DocumentSearchResult[]>([]);
  const [selectedModifier, setSelectedModifier] = React.useState<DocumentSearchResult | null>(null);

  React.useEffect(() => {
    if (selectedNode?.content) {
      setNewContent(selectedNode.content);
    }
  }, [selectedNode]);

  // Un nouvel article sélectionné, ou la fermeture du formulaire, repart
  // d'un choix vierge : le texte modificateur d'un article n'a pas de raison
  // d'en présélectionner un autre.
  React.useEffect(() => {
    if (!showAddForm) {
      setModifierSearch('');
      setModifierResults([]);
      setSelectedModifier(null);
    }
  }, [showAddForm, selectedNode?.id]);

  if (!selectedNode) return null;

  const handleModifierSearch = async () => {
    if (modifierSearch.length < 3) return;
    try {
      const res = await laravelClient.get<{ data: DocumentSearchResult[] }>(
        `relations/search?q=${encodeURIComponent(modifierSearch)}`,
      );
      setModifierResults((res.data.data || []).filter((r) => r.type === 'DOCUMENT'));
    } catch (err) {
      console.error('Recherche du texte modificateur échouée', err);
    }
  };

  const canSubmit = newContent.trim().length > 0 && startDate.length > 0 && selectedModifier !== null;

  const handleAddVersion = () => {
    if (!selectedModifier) return;

    addArticleVersion.mutate({
      id: selectedNode.id,
      content: newContent,
      start_date: startDate,
      modifie_par_document_id: selectedModifier.id,
    }, {
      onSuccess: () => {
        setShowAddForm(false);
        setVersionModalOpen(false);
      }
    });
  };

  const versions = selectedNode.versions || [];
  const filteredVersions = versions.filter((v: ArticleVersionUI) => (
    versionFilter === 'all' || v.type === versionFilter
  ));

  return (
    <Dialog open={versionModalOpen} onOpenChange={(open) => setVersionModalOpen(open)}>
      <DialogContent className="max-w-[800px] h-[82vh] p-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="h-[54px] border-b border-b1 flex flex-row items-center px-5 gap-3 shrink-0 space-y-0">
          <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-gold" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <DialogTitle className="block text-[15px] font-medium text-gold leading-tight">
              Historique et amendements
            </DialogTitle>
            <span className="block text-[10px] text-t3 font-mono uppercase tracking-widest">
              Article {selectedNode.numero} • {selectedNode.id.substring(0, 8)}
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* List Section */}
          <div className="flex-1 flex flex-col border-r border-b1 overflow-hidden">
            <div className="flex gap-1 p-3 border-b border-b1 shrink-0 bg-s1/50">
              {(['all', 'creation', 'modification', 'pending'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setVersionFilter(filter)}
                  className={cn(
                    "h-[24px] px-3 rounded-full border border-b1 bg-transparent text-t3 text-[10px] font-mono uppercase tracking-[0.05em] transition-all hover:border-b2 hover:text-t2",
                    versionFilter === filter && "bg-gold text-on-gold border-gold font-bold"
                  )}
                >
                  {filter === 'all' ? 'Tout' : filter === 'creation' ? 'Créations' : filter === 'modification' ? 'Modifs' : 'Projets'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
              {filteredVersions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-t3 gap-2 opacity-50">
                  <Clock className="w-8 h-8" strokeWidth={1} />
                  <p className="text-[12px] italic font-serif">Aucun historique disponible</p>
                </div>
              ) : (
                filteredVersions.map((v: ArticleVersionUI, i: number) => (
                  <div key={v.id || i} className={cn(
                    "p-4 rounded-xl border transition-all relative group",
                    i === 0 ? "bg-s2 border-gold/30 shadow-lg" : "bg-s1/50 border-b1 hover:border-b2"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-gold font-bold">v{versions.length - i}</span>
                        <span className="w-1 h-1 rounded-full bg-b2" />
                        <span className="text-[10px] text-t2 font-medium">{v.created_at || '19/05/2026'}</span>
                      </div>
                      {i === 0 && (
                        <span className="text-[9px] bg-gold/10 text-gold px-2 py-0.5 rounded-full border border-gold/20 font-bold uppercase tracking-tighter">
                          En vigueur
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-t1 leading-relaxed font-serif line-clamp-3">
                      {v.contenu_texte}
                    </p>
                    {v.modifie_par_document_titre ? (
                      <p className="mt-2 text-[10px] text-gold/80 font-mono truncate">
                        Amendement — modifié par : {v.modifie_par_document_titre}
                      </p>
                    ) : (
                      <p className="mt-2 text-[10px] text-t4 font-mono italic">
                        Aucun texte modificateur identifié
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Form Section */}
          <div className="w-[320px] bg-s2/30 flex flex-col p-5">
            {!showAddForm ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-gold/5 flex items-center justify-center mb-4">
                  <Plus className="w-6 h-6 text-gold/40" />
                </div>
                <h3 className="text-t1 text-[14px] font-medium mb-2">Enregistrer un amendement</h3>
                <p className="text-t3 text-[11px] mb-6 leading-relaxed">
                  Un texte identifié a réellement modifié cet article : cette action ouvre une nouvelle
                  période de validité. Pour une simple correction (OCR, découpage), utilisez plutôt
                  « Corriger le texte » dans le panneau de l'article — elle ne crée jamais de version.
                </p>
                <Button
                  onClick={() => setShowAddForm(true)}
                  variant="gold"
                  className="w-full"
                >
                  Commencer
                </Button>
              </div>
            ) : (
              <div className="h-full flex flex-col overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-t1 text-[13px] font-medium">Nouvel amendement</h3>
                  <button onClick={() => setShowAddForm(false)} className="text-t3 hover:text-t1 text-[11px]">Annuler</button>
                </div>

                <div className="space-y-4 flex-1 flex flex-col">
                  <div>
                    <label className="block text-[9.5px] font-mono text-t3 uppercase mb-1.5 tracking-wider">
                      Texte modificateur <span className="text-red">*</span>
                    </label>
                    {!selectedModifier ? (
                      <div className="space-y-2">
                        <div className="flex gap-1.5">
                          <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-t3" />
                            <Input
                              placeholder="Rechercher le texte qui modifie…"
                              value={modifierSearch}
                              onChange={(e) => setModifierSearch(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleModifierSearch()}
                              className="pl-8 h-8 text-[11px] bg-s1 border-b1"
                            />
                          </div>
                          <Button variant="outline" size="sm" onClick={handleModifierSearch} className="h-8 text-[10.5px] px-2.5">
                            Chercher
                          </Button>
                        </div>
                        <div className="max-h-[110px] overflow-y-auto space-y-1">
                          {modifierResults.map((res) => (
                            <button
                              key={res.id}
                              onClick={() => setSelectedModifier(res)}
                              className="w-full text-left p-1.5 text-[11px] text-t2 hover:bg-s3 rounded transition-colors truncate"
                            >
                              {res.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 bg-gold/5 border border-gold/20 rounded-md flex items-center justify-between gap-2">
                        <span className="text-[11px] text-gold font-medium truncate flex-1">{selectedModifier.label}</span>
                        <button onClick={() => setSelectedModifier(null)} className="text-[10px] text-t3 hover:text-t1 shrink-0">Changer</button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-mono text-t3 uppercase mb-1.5 tracking-wider">Date d'effet</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-s1 border border-b1 rounded-md px-3 py-2 text-[12px] text-t1 outline-none focus:border-gold/50"
                    />
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="block text-[9.5px] font-mono text-t3 uppercase mb-1.5 tracking-wider">Contenu amendé</label>
                    <textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      className="flex-1 w-full min-h-[140px] bg-s1 border border-b1 rounded-md p-3 text-[12px] text-t1 font-serif leading-relaxed resize-none outline-none focus:border-gold/50"
                      placeholder="Saisissez le texte tel que modifié par le texte modificateur..."
                    />
                  </div>

                  <Button
                    onClick={handleAddVersion}
                    disabled={!canSubmit || addArticleVersion.isPending}
                    variant="gold"
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {addArticleVersion.isPending ? 'Enregistrement...' : 'Enregistrer l\'amendement'}
                  </Button>

                  {addArticleVersion.isError && (
                    <p className="text-red text-[10.5px] font-mono bg-red-d border border-red/20 rounded px-2.5 py-2 flex items-start gap-1.5">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-px" />
                      <span>{apiErrorMessage(addArticleVersion.error, "Échec de l'enregistrement de l'amendement.")}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
