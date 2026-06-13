/**
 * JournalDetail.tsx — Détail et administration d'un journal officiel.
 * Métadonnées éditables, visibilité, PDF original, textes extraits et
 * traitement manuel des manquements (ajout / rattachement / détachement).
 */
import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '@/shared/components/layout/AppLayout';
import PageContainer from '@/shared/components/layout/PageContainer';
import { useJournal, useJournalMutations } from '@/features/journals/hooks/useJournals';
import JournalEditModal from '@/features/journals/components/JournalEditModal';
import AddMissingTextModal from '@/features/journals/components/AddMissingTextModal';
import AttachDocumentModal from '@/features/journals/components/AttachDocumentModal';
import JournalPdfPreview from '@/features/journals/components/JournalPdfPreview';
import { useAuthStore } from '@/features/auth/store/authStore';
import { downloadFile } from '@/features/documents/api/laravelApi';
import { getJournalPdfUrl } from '@/features/journals/api/journalsApi';
import { Button } from '@/shared/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import {
  ArrowLeft, Newspaper, FilePen, Trash2, Download, Eye, EyeOff,
  FilePlus2, Link2, Unlink, ExternalLink, CheckCircle2, FileText,
} from 'lucide-react';

const CURATION_BADGES: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Brouillon', cls: 'text-t3 bg-s3 border-b1' },
  review:    { label: 'Révision',  cls: 'text-amber bg-amber/10 border-amber/20' },
  validated: { label: 'Validé',    cls: 'text-blue bg-blue/10 border-blue/20' },
  published: { label: 'Publié',    cls: 'text-green bg-green/10 border-green/20' },
};

function CurationBadge({ status }: { status?: string | null }) {
  const cfg = CURATION_BADGES[status || 'draft'] || CURATION_BADGES.draft;
  return (
    <span className={`inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export default function JournalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.includes('admin');

  const { data: journal, isLoading, error } = useJournal(id || '', { managerView: true });
  const { update, remove, detachDocument } = useJournalMutations(id || '');

  const [editOpen, setEditOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [attachOpen, setAttachOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  if (isLoading) {
    return (
      <AppLayout space="editor">
        <div className="h-full flex items-center justify-center text-gold font-mono text-xs tracking-widest uppercase">
          Chargement du journal…
        </div>
      </AppLayout>
    );
  }

  if (error || !journal) {
    return (
      <AppLayout space="editor">
        <div className="h-full flex flex-col items-center justify-center gap-4 text-red font-mono text-xs tracking-widest uppercase">
          Journal introuvable.
          <Button variant="outline" size="sm" onClick={() => navigate('/editor/journals')}>
            <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Retour à la liste
          </Button>
        </div>
      </AppLayout>
    );
  }

  const documents = journal.legal_documents ?? [];
  const publishedCount = documents.filter(d => d.curation_status === 'published').length;

  const handleDownload = () => {
    const safe = (journal.title || 'journal').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadFile(getJournalPdfUrl(journal.id), `${safe}.pdf`).catch(err =>
      console.error('Erreur lors du téléchargement:', err)
    );
  };

  return (
    <AppLayout space="editor">
      <PageContainer className="flex flex-col gap-4 min-h-full">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-3">
          <button
            onClick={() => navigate('/editor/journals')}
            className="w-[30px] h-[30px] rounded border border-b1 text-t2 flex items-center justify-center hover:bg-s3 transition-colors shrink-0 mt-1"
            title="Retour à la liste"
          >
            <ArrowLeft className="w-[15px] h-[15px]" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
            <Newspaper className="w-5 h-5 text-gold" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-[16px] sm:text-[19px] font-display font-semibold text-t1 leading-tight">
              {journal.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-mono text-t3">
              {journal.number && <span>n° {journal.number}</span>}
              {journal.publication_date && <span>· {journal.publication_date.slice(0, 10)}</span>}
              <span>· {publishedCount}/{documents.length} textes publiés</span>
              {journal.is_published ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-green bg-green/10 border-green/20">
                  <CheckCircle2 className="w-3 h-3" /> Visible au public
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-t3 bg-s2 border-b1">
                  <EyeOff className="w-3 h-3" /> Masqué du public
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5 text-[11px]">
              <FilePen className="w-3.5 h-3.5" /> Modifier
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5 text-[11px]">
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button
              variant={journal.is_published ? 'outline' : 'gold'}
              size="sm"
              disabled={update.isPending}
              onClick={() => update.mutate({ is_published: !journal.is_published })}
              className="gap-1.5 text-[11px]"
            >
              {journal.is_published
                ? <><EyeOff className="w-3.5 h-3.5" /> Dépublier</>
                : <><Eye className="w-3.5 h-3.5" /> Publier le journal</>}
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="gap-1.5 text-[11px] text-red hover:bg-red/10 hover:border-red/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Contenu : textes + PDF */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 min-h-0">
          {/* Liste des textes */}
          <div className="bg-s1 border border-b1 rounded-2xl overflow-hidden flex flex-col min-h-[300px]">
            <div className="h-[44px] border-b border-b1 flex items-center px-4 gap-2 shrink-0">
              <span className="text-[10px] font-bold tracking-[0.05em] uppercase text-t2 font-mono flex-1">
                Textes du journal ({documents.length})
              </span>
              <Button variant="outline" size="sm" onClick={() => setAttachOpen(true)} className="gap-1.5 text-[11px] h-7">
                <Link2 className="w-3 h-3" /> <span className="hidden sm:inline">Rattacher</span>
              </Button>
              <Button variant="gold" size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 text-[11px] h-7">
                <FilePlus2 className="w-3 h-3" /> <span className="hidden sm:inline">Texte manquant</span><span className="sm:hidden">Ajouter</span>
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-b1/60">
              {documents.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-t3 text-[12px] italic mb-3">
                    Aucun texte rattaché — l'extraction n'a rien produit ou tout a été détaché.
                  </p>
                  <Button variant="gold" size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 text-[11px]">
                    <FilePlus2 className="w-3.5 h-3.5" /> Ajouter le premier texte manuellement
                  </Button>
                </div>
              )}

              {documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-s2/50 transition-colors group">
                  <FileText className="w-4 h-4 text-t3 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/editor/viewer/${doc.id}`}
                      className="text-[12.5px] text-t1 hover:text-gold transition-colors line-clamp-1"
                    >
                      {doc.titre_officiel}
                    </Link>
                    <p className="text-[10px] text-t3 font-mono mt-0.5">
                      {doc.type_code || 'DOC'}
                      {typeof doc.articles_count === 'number' && ` · ${doc.articles_count} article${doc.articles_count > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <CurationBadge status={doc.curation_status} />
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Link
                      to={`/editor/viewer/${doc.id}`}
                      className="w-7 h-7 rounded border border-b1 text-t2 flex items-center justify-center hover:bg-s3 hover:text-gold transition-colors"
                      title="Ouvrir dans le viewer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => detachDocument.mutate(doc.id)}
                      disabled={detachDocument.isPending}
                      className="w-7 h-7 rounded border border-b1 text-t2 flex items-center justify-center hover:bg-red/10 hover:text-red hover:border-red/20 transition-colors"
                      title="Détacher du journal"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-b1 px-4 py-2 shrink-0">
              <p className="text-[10px] text-t3 font-mono">
                Extraction incomplète ? Ajoutez le texte manquant puis structurez-le dans le viewer.
              </p>
            </div>
          </div>

          {/* Aperçu PDF */}
          <div className="min-h-[420px] lg:min-h-0">
            <JournalPdfPreview journalId={journal.id} />
          </div>
        </div>
      </PageContainer>

      {/* Modals */}
      <JournalEditModal journal={journal} open={editOpen} onOpenChange={setEditOpen} />
      <AddMissingTextModal journalId={journal.id} open={addOpen} onOpenChange={setAddOpen} />
      <AttachDocumentModal journalId={journal.id} open={attachOpen} onOpenChange={setAttachOpen} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer ce journal&nbsp;?</DialogTitle>
            <DialogDescription>
              Le journal « {journal.title} » sera supprimé. Ses textes ne seront
              pas supprimés : ils seront simplement détachés et resteront
              disponibles dans le catalogue des documents.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" disabled={remove.isPending} onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={remove.isPending}
              onClick={() => remove.mutate(undefined, { onSuccess: () => navigate('/editor/journals') })}
              className="gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {remove.isPending ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
