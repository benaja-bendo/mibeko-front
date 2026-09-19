import type { TreeNode } from '@/shared/types/database';

/** Recherche un nœud par id dans l'arbre (parcours en profondeur). */
export function findNodeById(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}
