import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { LegalDocument, TreeNode } from '../types/database';
import { mockTreeData, mockPdfPages } from '../lib/mockData';
import { apiFetch, BASE } from '../services/laravelApi';

interface DocumentData {
  document: LegalDocument;
  tree: TreeNode[];
  pdfUrl?: string;
  pdfPages?: string[]; // fallback
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTree(flatNodes: any[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // First pass: create all node objects and put them map
  // Normalize IDs to lowercase to avoid matching issues
  flatNodes.forEach((n) => {
    const id = n.id.toLowerCase();
    const parentId = n.parent_id ? n.parent_id.toLowerCase() : null;

    nodeMap.set(id, {
      id: id,
      parent_id: parentId,
      type: n.type || 'NODE',
      numero: n.number || n.numero || null,
      label: n.title || n.titre || null,
      sort_order: n.order || 0,
      vs: n.validation_status === 'validated' ? 'ok' : n.validation_status === 'error' ? 'err' : 'pend',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children: n.articles ? n.articles.map((a: any) => ({
        id: a.id.toLowerCase(),
        parent_id: id,
        type: 'ARTICLE',
        numero: a.number || a.numero_article || null,
        label: a.title || null,
        sort_order: a.order || 0,
        vs: a.validation_status === 'validated' ? 'ok' : a.validation_status === 'error' ? 'err' : 'pend',
        content: a.content || '',
        source_locator: a.source_locator || null,
        validity: a.validity || '—',
        versions: a.versions || [],
        relations: a.relations || []
      })) : []
    });
  });

  // Second pass: build hierarchy
  flatNodes.forEach((n) => {
    const id = n.id.toLowerCase();
    const parentId = n.parent_id ? n.parent_id.toLowerCase() : null;
    const node = nodeMap.get(id)!;

    if (parentId && nodeMap.has(parentId)) {
      const parent = nodeMap.get(parentId)!;
      if (!parent.children) parent.children = [];
      // Prevent duplicates
      if (!parent.children.some(c => c.id === id)) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  // Sort function to sort children by sort_order
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    nodes.forEach((n) => {
      if (n.children && n.children.length > 0) {
        sortChildren(n.children);
      }
    });
  };

  sortChildren(roots);
  return roots;
}

export function useDocumentData(id: string) {
  return useQuery<DocumentData>({
    queryKey: ['document', id],
    queryFn: async () => {
      try {
        const [docData, treeData] = await Promise.all([
          apiFetch<{ data?: LegalDocument }>(`/legal-documents/${id}`),
          apiFetch<{ data?: TreeNode[] }>(`/legal-documents/${id}/tree`)
        ]);

        const pdfUrl = `${BASE}/legal-documents/${id}/pdf`;

        return {
          document: (docData?.data || docData) as LegalDocument,
          tree: buildTree((treeData?.data || treeData || []) as TreeNode[]),
          pdfUrl,
        };
      } catch (err) {
        console.warn('Failed to fetch from API, falling back to mock data', err);
      }

      return {
        document: {
          id,
          type_code: 'LOI',
          titre_officiel: 'Loi n° 2024-537 du 13 juin 2024',
          reference_nor: null,
          date_signature: '2024-06-13',
          date_publication: '2024-06-14',
          statut: 'vigueur',
          curation_status: 'published'
        },
        tree: mockTreeData,
        pdfUrl: `/api/v1/legal-documents/${id}/pdf`,
        pdfPages: mockPdfPages,
      };
    },
    enabled: !!id,
  });
}

export function useDocumentMutations(documentId: string) {
  const queryClient = useQueryClient();

  const createNode = useMutation({
    mutationFn: async (data: { type_unite: string, numero?: string, titre?: string, parent_id?: string, sort_order?: number }) => {
      return apiFetch<unknown>('/structure-nodes', {
        method: 'POST',
        body: JSON.stringify({ ...data, document_id: documentId }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
  });

  const updateNode = useMutation({
    mutationFn: async ({ id, ...data }: { id: string, type_unite?: string, numero?: string, titre?: string, validation_status?: string }) => {
      return apiFetch<unknown>(`/structure-nodes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
  });

  const deleteNode = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch<unknown>(`/structure-nodes/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
  });

  const createArticle = useMutation({
    mutationFn: async (data: { parent_node_id: string, numero_article: string, content: string, ordre_affichage?: number }) => {
      return apiFetch<unknown>('/articles', {
        method: 'POST',
        body: JSON.stringify({ ...data, document_id: documentId }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
  });

  const updateArticle = useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string,
      numero_article?: string,
      content?: string,
      validation_status?: string,
      parent_node_id?: string,
      ordre_affichage?: number,
      source_locator?: {
        page: number;
        x: number;
        y: number;
        width: number;
        height: number;
      } | null
    }) => {
      return apiFetch<unknown>(`/articles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
  });

  const addArticleVersion = useMutation({
    mutationFn: async ({ id, content, start_date }: { id: string, content: string, start_date: string }) => {
      return apiFetch<unknown>(`/articles/${id}/versions`, {
        method: 'POST',
        body: JSON.stringify({ content, start_date }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
  });

  const moveNode = useMutation({
    mutationFn: async ({ id, parent_id, sort_order }: { id: string, parent_id: string | null, sort_order: number }) => {
      return apiFetch<unknown>(`/structure-nodes/${id}/move`, {
        method: 'POST',
        body: JSON.stringify({ parent_id, sort_order }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
  });

  const createRelation = useMutation({
    mutationFn: async (data: {
      source_doc_id?: string,
      target_doc_id?: string,
      source_article_id?: string,
      target_article_id?: string,
      relation_type: string,
      commentaire?: string,
      effective_date?: string
    }) => {
      return apiFetch<unknown>(`/articles/${data.source_article_id}/relations`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
  });

  const deleteRelation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch<unknown>(`/relations/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
  });

  return {
    createNode,
    updateNode,
    deleteNode,
    createArticle,
    updateArticle,
    addArticleVersion,
    moveNode,
    createRelation,
    deleteRelation,
  };
}
