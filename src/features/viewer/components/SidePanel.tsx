import React from 'react';
import { useParams } from 'react-router-dom';
import { useViewerStore } from '@/features/viewer/store/useViewerStore';
import { useDocumentMutations } from '@/features/documents/hooks/useDocumentData';
import { cn } from '@/shared/lib/utils';
import { X, AlignLeft, History, Info, Target, GitGraph, Save, CheckCircle2, AlertCircle, Clock, Trash2, Edit2 } from 'lucide-react';
import { apiFetch } from '@/features/documents/api/laravelApi';
import { Button } from '@/shared/components/ui/Button';
import ValidityModal from './ValidityModal';
import AddRelationModal from './AddRelationModal';
import type { ArticleVersionUI } from '@/shared/types/database';

export default function SidePanel() {
  const { id: documentId } = useParams<{ id: string }>();
  const { sidePanelOpen, closeSidePanel, activeTab, setActiveTab, selectedNode, startSelection, setDeleteModal } = useViewerStore();
  const { updateArticle } = useDocumentMutations(documentId || '');

  const [content, setContent] = React.useState('');
  const [validityModalOpen, setValidityModalOpen] = React.useState(false);
  const [relationModalOpen, setRelationModalOpen] = React.useState(false);
  const [relations, setRelations] = React.useState<Array<{
    id: string;
    relation_type: string;
    target_article?: { numero_article?: string | null } | null;
    target_document?: { titre_officiel?: string | null } | null;
  }>>([]);

  React.useEffect(() => {
    setContent(selectedNode?.content || '');
  }, [selectedNode?.id, selectedNode?.content]);

  React.useEffect(() => {
    // Fetch relations if activeTab is meta
    if (selectedNode?.id && activeTab === 'meta' && selectedNode.type === 'ARTICLE') {
      apiFetch<{data: Array<{
        id: string;
        relation_type: string;
        target_article?: { numero_article?: string | null } | null;
        target_document?: { titre_officiel?: string | null } | null;
      }>}>(`/articles/${selectedNode.id}/relations`)
        .then(data => setRelations(data.data || []))
        .catch(err => console.error('Failed to fetch relations', err));
    }
  }, [activeTab, selectedNode?.id, selectedNode?.type]);

  if (!selectedNode) return null;

  const isArticle = selectedNode.type === 'ARTICLE';
  const versions = selectedNode.versions || [];

  const handleSave = () => {
    if (isArticle) {
      updateArticle.mutate({
        id: selectedNode.id,
        content: content,
      });
    }
  };

  const handleDelete = () => {
    if (selectedNode) {
      setDeleteModal(true, selectedNode);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (isArticle) {
      updateArticle.mutate({
        id: selectedNode.id,
        validation_status: newStatus,
      });
    }
  };

  return (
    <div 
      className={cn(
        "absolute right-0 top-0 bottom-0 w-full sm:w-[320px] bg-s1 border-l border-b1 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-[200]",
        sidePanelOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="h-[44px] border-b border-b1 flex items-center px-3.5 gap-2 shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <line x1="8" y1="13" x2="16" y2="13"/>
          <line x1="8" y1="17" x2="16" y2="17"/>
        </svg>
        <span className="text-[13px] font-medium font-display text-gold flex-1">
          {isArticle ? 'Art. ' : ''}{selectedNode.numero}
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={closeSidePanel} 
          className="w-8 h-8 hover:bg-s3"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex border-b border-b1 shrink-0 bg-s1">
        <button 
          onClick={() => setActiveTab('content')}
          className={cn(
            "flex-1 h-[32px] flex items-center justify-center gap-[5px] text-[10.5px] font-body tracking-[0.04em] border-b-2 transition-colors",
            activeTab === 'content' ? "text-gold border-b-gold" : "text-t3 border-b-transparent hover:text-t2"
          )}
        >
          <AlignLeft className="w-3 h-3" /> Contenu
        </button>
        <button 
          onClick={() => setActiveTab('versions')}
          className={cn(
            "flex-1 h-[32px] flex items-center justify-center gap-[5px] text-[10.5px] font-body tracking-[0.04em] border-b-2 transition-colors",
            activeTab === 'versions' ? "text-gold border-b-gold" : "text-t3 border-b-transparent hover:text-t2"
          )}
        >
          <History className="w-3 h-3" /> Versions
        </button>
        <button 
          onClick={() => setActiveTab('meta')}
          className={cn(
            "flex-1 h-[32px] flex items-center justify-center gap-[5px] text-[10.5px] font-body tracking-[0.04em] border-b-2 transition-colors",
            activeTab === 'meta' ? "text-gold border-b-gold" : "text-t3 border-b-transparent hover:text-t2"
          )}
        >
          <Info className="w-3 h-3" /> Infos
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar">
        {activeTab === 'content' && (
          <div>
            {!isArticle ? (
              <p className="text-t3 text-[12px] italic leading-[1.6]">
                Cliquez sur un article dans l'arbre pour éditer son contenu.
              </p>
            ) : (
              <>
                <div className="text-[9.5px] font-mono uppercase tracking-[0.09em] text-t3 mb-2 pb-1 border-b border-b1 flex justify-between items-center">
                  <span>Texte en vigueur</span>
                  {updateArticle.isPending && <Clock className="w-3 h-3 animate-spin" />}
                </div>
                <textarea 
                  className="w-full bg-s2 border border-b1 rounded-md text-t1 text-[12px] font-serif p-2.5 leading-[1.7] resize-y outline-none min-h-[200px] transition-colors focus:border-b3"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <Button 
                  onClick={handleSave}
                  disabled={updateArticle.isPending}
                  variant="gold"
                  className="w-full mt-2 h-9"
                >
                  <Save className="w-3.5 h-3.5 mr-2" />
                  {updateArticle.isPending ? 'Enregistrement...' : 'Sauvegarder'}
                </Button>

                <div className="text-[9.5px] font-mono uppercase tracking-[0.09em] text-t3 mt-6 mb-2 pb-1 border-b border-b1">
                  Actions rapides
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => startSelection(selectedNode)}
                    className="text-[11px] h-8"
                  >
                    <Target className="w-3 h-3 mr-1.5" /> Localiser PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setRelationModalOpen(true)}
                    className="text-[11px] h-8"
                  >
                    <GitGraph className="w-3 h-3 mr-1.5" /> Relations
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDelete}
                    className="text-[11px] h-8 text-red hover:bg-red/10 hover:border-red/20 col-span-2"
                  >
                    <Trash2 className="w-3 h-3 mr-1.5" /> Supprimer l'élément
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'versions' && (
          <div>
            {!isArticle ? (
              <p className="text-t3 text-[12px] italic leading-[1.6]">
                Sélectionnez un article pour voir ses versions.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="text-[9.5px] font-mono uppercase tracking-[0.09em] text-t3 mb-2 pb-1 border-b border-b1">
                  Historique
                </div>
                {versions.map((v: ArticleVersionUI, i: number) => (
                  <div key={v.id || i} className="p-2.5 rounded border border-b1 bg-s2 relative group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono text-gold">v{versions.length - i}</span>
                      <span className="text-[9px] text-t3 font-mono">{v.created_at || 'Aujourd\'hui'}</span>
                    </div>
                    <p className="text-[11px] text-t2 line-clamp-2 italic font-serif leading-relaxed">
                      {v.contenu_texte?.substring(0, 80)}...
                    </p>
                    {i === 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-gold text-on-gold text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm uppercase tracking-tighter">
                        Active
                      </span>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => useViewerStore.getState().setVersionModalOpen(true)}
                  className="w-full h-[26px] rounded border border-dashed border-b2 text-t3 text-[10px] font-mono hover:border-gold hover:text-gold transition-colors uppercase tracking-widest"
                >
                  + Nouvelle version
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'meta' && (
          <div className="space-y-4">
            {!isArticle ? (
              <p className="text-t3 text-[12px] italic leading-[1.6]">
                Sélectionnez un article.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9.5px] text-t3 font-mono uppercase tracking-[0.07em]">ID Article</span>
                    <span className="text-[10px] text-t3 font-mono truncate max-w-[150px]">{selectedNode.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9.5px] text-t3 font-mono uppercase tracking-[0.07em]">N° article</span>
                    <span className="text-[11px] text-t2 font-mono font-bold">{selectedNode.numero}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-b1">
                  <span className="text-[9.5px] text-t3 font-mono uppercase tracking-[0.07em] block mb-2">Statut de validation</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'validated', label: 'Validé', icon: CheckCircle2, color: 'text-green bg-green-d' },
                      { id: 'error', label: 'Erreur', icon: AlertCircle, color: 'text-red bg-red-d' },
                      { id: 'pending', label: 'Attente', icon: Clock, color: 'text-amber bg-amber-d' },
                      { id: 'draft', label: 'Brouillon', icon: Edit2, color: 'text-t3 bg-s3' },
                    ].map(status => {
                      // Normalize the API value to match the buttons
                      const currentStatus = selectedNode.vs === 'ok' ? 'validated' : 
                                            selectedNode.vs === 'err' ? 'error' : 
                                            selectedNode.vs === 'pend' ? 'pending' : 
                                            selectedNode.vs || 'draft'; // fallback

                      return (
                        <button
                          key={status.id}
                          onClick={() => handleStatusChange(status.id === 'validated' ? 'ok' : status.id === 'error' ? 'err' : status.id === 'pending' ? 'pend' : 'draft')}
                          className={cn(
                            "h-[28px] px-2 rounded border border-b1 flex items-center gap-1.5 transition-all",
                            currentStatus === status.id 
                              ? `${status.color} border-transparent font-bold scale-[1.02]` 
                              : "bg-transparent text-t3 hover:border-b2 hover:text-t2"
                          )}
                        >
                          <status.icon className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-body">{status.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-b1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9.5px] text-t3 font-mono uppercase tracking-[0.07em]">Validité</span>
                    <button 
                      onClick={() => setValidityModalOpen(true)}
                      className="text-[9px] text-gold hover:underline"
                    >
                      Modifier
                    </button>
                  </div>
                  <span className="text-[10.5px] text-t2 font-mono bg-s2 px-2 py-1 rounded block border border-b1">
                    {selectedNode.validity || 'Période indéfinie'}
                  </span>
                </div>

                {relations.length > 0 && (
                  <div className="pt-3 border-t border-b1">
                    <span className="text-[9.5px] text-t3 font-mono uppercase tracking-[0.07em] block mb-2">Liens juridiques</span>
                    <div className="space-y-1.5">
                      {relations.map(rel => (
                        <div key={rel.id} className="text-[10px] p-1.5 bg-s2 border border-b1 rounded flex items-center gap-2">
                          <span className="px-1 bg-gold/10 text-gold rounded text-[8px] font-bold uppercase">{rel.relation_type}</span>
                          <span className="text-t2 truncate flex-1">
                            {rel.target_article ? `Art. ${rel.target_article.numero_article}` : rel.target_document?.titre_officiel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      
      <ValidityModal 
        open={validityModalOpen} 
        onOpenChange={setValidityModalOpen} 
        node={selectedNode} 
      />
      <AddRelationModal 
        open={relationModalOpen}
        onOpenChange={setRelationModalOpen}
        article={selectedNode}
      />
    </div>
  );
}
