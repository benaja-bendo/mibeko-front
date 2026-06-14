import { createContext, useContext } from 'react';
import type { useDocumentMutations } from '@/features/documents/hooks/useDocumentData';

type DocMutations = ReturnType<typeof useDocumentMutations>;

/**
 * Mutations dont l'arbre a besoin (drag & drop). On ne partage que les
 * fonctions `mutate` — référentiellement stables côté react-query — pour que
 * le contexte ne change jamais d'identité et n'invalide pas les milliers de
 * `TreeNode` memoïsés à chaque rendu de `TreeView`.
 */
export interface TreeMutations {
  moveNode: DocMutations['moveNode']['mutate'];
  updateArticle: DocMutations['updateArticle']['mutate'];
}

export const TreeMutationsContext = createContext<TreeMutations | null>(null);

export function useTreeMutations(): TreeMutations {
  const ctx = useContext(TreeMutationsContext);
  if (!ctx) {
    throw new Error('useTreeMutations doit être utilisé dans un TreeMutationsContext.Provider.');
  }
  return ctx;
}
