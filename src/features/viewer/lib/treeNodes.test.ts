import { findNodeById } from './treeNodes';
import type { TreeNode } from '@/shared/types/database';

function node(id: string, children?: TreeNode[]): TreeNode {
  return { id, parent_id: null, type: 'ARTICLE', numero: id, label: null, sort_order: 0, vs: 'ok', children };
}

it('trouve un nœud à la racine', () => {
  const tree = [node('a'), node('b')];
  expect(findNodeById(tree, 'b')?.id).toBe('b');
});

it('trouve un nœud imbriqué', () => {
  const tree = [node('a', [node('a1'), node('a2', [node('a2-1')])])];
  expect(findNodeById(tree, 'a2-1')?.id).toBe('a2-1');
});

it('renvoie null si l\'id est absent', () => {
  const tree = [node('a')];
  expect(findNodeById(tree, 'inconnu')).toBeNull();
});
