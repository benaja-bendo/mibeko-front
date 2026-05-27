import React from 'react';
import { useParams } from 'react-router-dom';
import { useViewerStore } from '../../store/useViewerStore';
import { useDocumentMutations } from '../../hooks/useDocumentData';
import { cn } from '../../lib/utils';
import { Clock, Plus, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import { Button } from '../ui/Button';

export default function VersionModal() {
  const { id: documentId } = useParams<{ id: string }>();
  const { versionModalOpen, setVersionModalOpen, versionFilter, setVersionFilter, selectedNode } = useViewerStore();
  const { addArticleVersion } = useDocumentMutations(documentId || '');

  const [newContent, setNewContent] = React.useState('');
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = React.useState(false);

  React.useEffect(() => {
    if (selectedNode?.content) {
      setNewContent(selectedNode.content);
    }
  }, [selectedNode]);

  if (!selectedNode) return null;

  const handleAddVersion = () => {
    addArticleVersion.mutate({
      id: selectedNode.id,
      content: newContent,
      start_date: startDate,
    }, {
      onSuccess: () => {
        setShowAddForm(false);
        setVersionModalOpen(false);
      }
    });
  };

  const versions = selectedNode.versions || [];
  const filteredVersions = versions.filter((v: any) => (
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
              Gestion du versionnement
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
                    versionFilter === filter && "bg-gold text-[#120e00] border-gold font-bold"
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
                filteredVersions.map((v: any, i: number) => (
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
                <h3 className="text-t1 text-[14px] font-medium mb-2">Nouvelle version</h3>
                <p className="text-t3 text-[11px] mb-6 leading-relaxed">
                  Créez une nouvelle itération de cet article pour garder une trace des modifications.
                </p>
                <Button 
                  onClick={() => setShowAddForm(true)}
                  variant="gold"
                  className="w-full"
                >
                  Commencer l'édition
                </Button>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-t1 text-[13px] font-medium">Nouvelle version</h3>
                  <button onClick={() => setShowAddForm(false)} className="text-t3 hover:text-t1 text-[11px]">Annuler</button>
                </div>
                
                <div className="space-y-4 flex-1 flex flex-col">
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
                    <label className="block text-[9.5px] font-mono text-t3 uppercase mb-1.5 tracking-wider">Contenu</label>
                    <textarea 
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      className="flex-1 w-full bg-s1 border border-b1 rounded-md p-3 text-[12px] text-t1 font-serif leading-relaxed resize-none outline-none focus:border-gold/50"
                      placeholder="Saisissez le nouveau texte ici..."
                    />
                  </div>

                  <Button 
                    onClick={handleAddVersion}
                    disabled={addArticleVersion.isPending}
                    variant="gold"
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {addArticleVersion.isPending ? 'Création...' : 'Publier la version'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
