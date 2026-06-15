import type { ReactNode } from 'react';
import {
  Users, FileText, Building2, Tag as TagIcon, Newspaper, BookText, FolderOpen,
  Settings2, FileStack, Activity,
} from 'lucide-react';

/** Classes de badge par type d'événement d'audit. */
export const EVENT_BADGE: Record<string, string> = {
  created: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  updated: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  deleted: 'bg-red-500/10 text-red-400 border-red-500/20',
  restored: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  impersonation_started: 'bg-gold/10 text-gold border-gold/20',
  roles_updated: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

export const EVENT_LABEL_FALLBACK = 'bg-s2 text-t3 border-b1';

/** Icône lucide par type d'objet audité (clé = nom court de la classe). */
export function typeIcon(type: string): ReactNode {
  const cls = 'w-3.5 h-3.5';
  switch (type) {
    case 'User':
      return <Users className={cls} />;
    case 'UserSetting':
      return <Settings2 className={cls} />;
    case 'LegalDocument':
      return <FileText className={cls} />;
    case 'ArticleVersion':
      return <FileStack className={cls} />;
    case 'Institution':
      return <Building2 className={cls} />;
    case 'Tag':
      return <TagIcon className={cls} />;
    case 'OfficialJournal':
      return <Newspaper className={cls} />;
    case 'DocumentType':
      return <BookText className={cls} />;
    case 'Dossier':
      return <FolderOpen className={cls} />;
    default:
      return <Activity className={cls} />;
  }
}
