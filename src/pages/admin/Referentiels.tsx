import React from 'react';
import AppLayout from '@/shared/components/layout/AppLayout';
import {
  useDocumentTypes,
  useDocumentTypeMutations,
  useInstitutions,
  useInstitutionMutations,
  useTags,
  useTagMutations,
} from '@/features/admin/hooks/useAdmin';
import type { DocumentTypeRef, InstitutionRef, TagRef } from '@/features/admin/api/adminApi';
import DocumentTypeModal from '@/features/admin/components/DocumentTypeModal';
import InstitutionModal from '@/features/admin/components/InstitutionModal';
import TagModal from '@/features/admin/components/TagModal';
import ConfirmDeleteDialog from '@/features/admin/components/ConfirmDeleteDialog';
import { Button } from '@/shared/components/ui/Button';
import { Plus, Pencil, Trash2, BookText, Building2, Tag as TagIcon } from 'lucide-react';

type Tab = 'types' | 'institutions' | 'tags';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'types', label: 'Types de loi', icon: <BookText className="w-3.5 h-3.5" /> },
  { key: 'institutions', label: 'Institutions', icon: <Building2 className="w-3.5 h-3.5" /> },
  { key: 'tags', label: 'Tags', icon: <TagIcon className="w-3.5 h-3.5" /> },
];

export default function Referentiels() {
  const [tab, setTab] = React.useState<Tab>('types');

  return (
    <AppLayout space="admin">
      <div className="flex flex-col h-full">
        <header className="px-6 py-5 border-b border-b1">
          <h1 className="text-t1 font-display text-xl font-semibold">Référentiels</h1>
          <p className="text-t3 text-xs font-mono mt-0.5">
            Données structurantes du fonds juridique — éditables sans redéploiement
          </p>
          <div className="flex gap-1 mt-4">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  'flex items-center gap-2 text-[12px] rounded-md px-3 py-1.5 transition-colors border',
                  tab === t.key
                    ? 'bg-gold/10 text-gold border-gold/20'
                    : 'text-t3 hover:text-t2 border-transparent hover:bg-s2',
                ].join(' ')}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {tab === 'types' && <TypesSection />}
          {tab === 'institutions' && <InstitutionsSection />}
          {tab === 'tags' && <TagsSection />}
        </div>
      </div>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------
// Briques communes de présentation
// ---------------------------------------------------------------------------

function SectionShell({
  count,
  isLoading,
  isError,
  onCreate,
  createLabel,
  children,
}: {
  count: number;
  isLoading: boolean;
  isError: boolean;
  onCreate: () => void;
  createLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-t3 text-xs font-mono">
          {isLoading ? 'Chargement…' : `${count} entrée${count > 1 ? 's' : ''}`}
        </span>
        <Button variant="gold" size="sm" className="gap-1.5" onClick={onCreate}>
          <Plus className="w-3.5 h-3.5" />
          {createLabel}
        </Button>
      </div>

      {isError ? (
        <div className="text-red text-sm font-mono py-8 text-center">
          Impossible de charger les données.
        </div>
      ) : (
        <div className="bg-s1 border border-b1 rounded-xl overflow-hidden">{children}</div>
      )}
    </div>
  );
}

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left text-[10px] font-mono uppercase tracking-widest text-t4 px-4 py-2.5 ${className}`}>
      {children}
    </th>
  );
}

function RowActions({
  onEdit,
  onDelete,
  deleteDisabled,
  deleteHint,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled?: boolean;
  deleteHint?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={onEdit}
        className="p-1.5 rounded-md text-t3 hover:text-t1 hover:bg-s2 transition-colors"
        title="Modifier"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onDelete}
        disabled={deleteDisabled}
        className="p-1.5 rounded-md text-t3 hover:text-red hover:bg-red/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-t3"
        title={deleteDisabled ? deleteHint : 'Supprimer'}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function CountBadge({ value }: { value: number }) {
  return (
    <span
      className={[
        'inline-block text-[11px] font-mono rounded px-1.5 py-0.5 border',
        value > 0
          ? 'text-t2 bg-s2 border-b1'
          : 'text-t4 bg-transparent border-b1',
      ].join(' ')}
    >
      {value}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Types de loi
// ---------------------------------------------------------------------------

function TypesSection() {
  const { data = [], isLoading, isError } = useDocumentTypes();
  const { remove } = useDocumentTypeMutations();
  const [editing, setEditing] = React.useState<DocumentTypeRef | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<DocumentTypeRef | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (r: DocumentTypeRef) => {
    setEditing(r);
    setModalOpen(true);
  };

  return (
    <>
      <SectionShell
        count={data.length}
        isLoading={isLoading}
        isError={isError}
        onCreate={openCreate}
        createLabel="Nouveau type"
      >
        <table className="w-full">
          <thead className="border-b border-b1 bg-s2/40">
            <tr>
              <Th className="w-24">Code</Th>
              <Th>Libellé</Th>
              <Th className="w-28">Niveau</Th>
              <Th className="w-24">Usage</Th>
              <Th className="w-24 text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.code} className="border-b border-b1 last:border-0 hover:bg-s2/40">
                <td className="px-4 py-2.5">
                  <span className="font-mono text-[12px] text-gold">{r.code}</span>
                </td>
                <td className="px-4 py-2.5 text-t1 text-sm">{r.name}</td>
                <td className="px-4 py-2.5 text-t3 text-sm font-mono">{r.hierarchy_level}</td>
                <td className="px-4 py-2.5"><CountBadge value={r.documents_count} /></td>
                <td className="px-4 py-2.5">
                  <RowActions
                    onEdit={() => openEdit(r)}
                    onDelete={() => setToDelete(r)}
                    deleteDisabled={r.documents_count > 0}
                    deleteHint={`${r.documents_count} document(s) utilisent ce type`}
                  />
                </td>
              </tr>
            ))}
            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-t4 text-sm">
                  Aucun type. Créez-en un pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SectionShell>

      <DocumentTypeModal open={modalOpen} onOpenChange={setModalOpen} record={editing} />
      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer ce type ?"
        description={`« ${toDelete?.name} » sera définitivement supprimé.`}
        pending={remove.isPending}
        error={remove.error as Error | null}
        onConfirm={() =>
          toDelete && remove.mutate(toDelete.code, { onSuccess: () => setToDelete(null) })
        }
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Institutions
// ---------------------------------------------------------------------------

function InstitutionsSection() {
  const { data = [], isLoading, isError } = useInstitutions();
  const { remove } = useInstitutionMutations();
  const [editing, setEditing] = React.useState<InstitutionRef | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<InstitutionRef | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (r: InstitutionRef) => {
    setEditing(r);
    setModalOpen(true);
  };

  return (
    <>
      <SectionShell
        count={data.length}
        isLoading={isLoading}
        isError={isError}
        onCreate={openCreate}
        createLabel="Nouvelle institution"
      >
        <table className="w-full">
          <thead className="border-b border-b1 bg-s2/40">
            <tr>
              <Th>Nom</Th>
              <Th className="w-28">Sigle</Th>
              <Th className="w-24">Usage</Th>
              <Th className="w-24 text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-b border-b1 last:border-0 hover:bg-s2/40">
                <td className="px-4 py-2.5 text-t1 text-sm">{r.name}</td>
                <td className="px-4 py-2.5 text-t3 text-sm font-mono">{r.acronym || '—'}</td>
                <td className="px-4 py-2.5"><CountBadge value={r.documents_count} /></td>
                <td className="px-4 py-2.5">
                  <RowActions
                    onEdit={() => openEdit(r)}
                    onDelete={() => setToDelete(r)}
                    deleteDisabled={r.documents_count > 0}
                    deleteHint={`${r.documents_count} document(s) rattaché(s)`}
                  />
                </td>
              </tr>
            ))}
            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-t4 text-sm">
                  Aucune institution.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SectionShell>

      <InstitutionModal open={modalOpen} onOpenChange={setModalOpen} record={editing} />
      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer cette institution ?"
        description={`« ${toDelete?.name} » sera définitivement supprimée.`}
        pending={remove.isPending}
        error={remove.error as Error | null}
        onConfirm={() =>
          toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })
        }
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

function TagsSection() {
  const { data = [], isLoading, isError } = useTags();
  const { remove } = useTagMutations();
  const [editing, setEditing] = React.useState<TagRef | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<TagRef | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (r: TagRef) => {
    setEditing(r);
    setModalOpen(true);
  };

  return (
    <>
      <SectionShell
        count={data.length}
        isLoading={isLoading}
        isError={isError}
        onCreate={openCreate}
        createLabel="Nouveau tag"
      >
        <table className="w-full">
          <thead className="border-b border-b1 bg-s2/40">
            <tr>
              <Th>Nom</Th>
              <Th>Slug</Th>
              <Th className="w-24">Usage</Th>
              <Th className="w-24 text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-b border-b1 last:border-0 hover:bg-s2/40">
                <td className="px-4 py-2.5 text-t1 text-sm">{r.name}</td>
                <td className="px-4 py-2.5 text-t3 text-[12px] font-mono">{r.slug}</td>
                <td className="px-4 py-2.5"><CountBadge value={r.usage_count} /></td>
                <td className="px-4 py-2.5">
                  <RowActions
                    onEdit={() => openEdit(r)}
                    onDelete={() => setToDelete(r)}
                    deleteDisabled={r.usage_count > 0}
                    deleteHint={`Tag utilisé ${r.usage_count} fois`}
                  />
                </td>
              </tr>
            ))}
            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-t4 text-sm">
                  Aucun tag.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SectionShell>

      <TagModal open={modalOpen} onOpenChange={setModalOpen} record={editing} />
      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer ce tag ?"
        description={`« ${toDelete?.name} » sera définitivement supprimé.`}
        pending={remove.isPending}
        error={remove.error as Error | null}
        onConfirm={() =>
          toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })
        }
      />
    </>
  );
}
