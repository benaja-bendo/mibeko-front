import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminOverview,
  listDocumentTypes,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
  listInstitutions,
  createInstitution,
  updateInstitution,
  deleteInstitution,
  listTags,
  createTag,
  updateTag,
  deleteTag,
  listFlags,
  updateFlag,
  updateFlagSeverity,
  deleteFlag,
  bulkFlags,
  type DocumentTypePayload,
  type InstitutionPayload,
  type TagPayload,
  type FlagFilters,
  type FlagBulkAction,
  type FlagSeverity,
} from '@/features/admin/api/adminApi';

const STALE = 60 * 1000;

// ---------------------------------------------------------------------------
// Vue d'ensemble
// ---------------------------------------------------------------------------

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: getAdminOverview,
    staleTime: STALE,
  });
}

// ---------------------------------------------------------------------------
// Types de documents
// ---------------------------------------------------------------------------

export function useDocumentTypes() {
  return useQuery({
    queryKey: ['admin', 'document-types'],
    queryFn: listDocumentTypes,
    staleTime: STALE,
  });
}

export function useDocumentTypeMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'document-types'] });
    qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
  };

  const create = useMutation({
    mutationFn: (payload: DocumentTypePayload) => createDocumentType(payload),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: Omit<DocumentTypePayload, 'code'> }) =>
      updateDocumentType(code, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (code: string) => deleteDocumentType(code),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

// ---------------------------------------------------------------------------
// Institutions
// ---------------------------------------------------------------------------

export function useInstitutions() {
  return useQuery({
    queryKey: ['admin', 'institutions'],
    queryFn: listInstitutions,
    staleTime: STALE,
  });
}

export function useInstitutionMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'institutions'] });
    qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
  };

  const create = useMutation({
    mutationFn: (payload: InstitutionPayload) => createInstitution(payload),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: InstitutionPayload }) =>
      updateInstitution(id, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteInstitution(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export function useTags() {
  return useQuery({
    queryKey: ['admin', 'tags'],
    queryFn: listTags,
    staleTime: STALE,
  });
}

export function useTagMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'tags'] });
    qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
  };

  const create = useMutation({
    mutationFn: (payload: TagPayload) => createTag(payload),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TagPayload }) => updateTag(id, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteTag(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

// ---------------------------------------------------------------------------
// Signalements
// ---------------------------------------------------------------------------

export function useFlags(filters: FlagFilters) {
  return useQuery({
    queryKey: ['admin', 'flags', filters],
    queryFn: () => listFlags(filters),
    placeholderData: (previous) => previous,
  });
}

export function useFlagMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'flags'] });
    qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
  };

  const resolve = useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) => updateFlag(id, resolved),
    onSuccess: invalidate,
  });
  const setSeverity = useMutation({
    mutationFn: ({ id, resolved, severity }: { id: string; resolved: boolean; severity: FlagSeverity }) =>
      updateFlagSeverity(id, resolved, severity),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteFlag(id),
    onSuccess: invalidate,
  });
  const bulk = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: FlagBulkAction }) => bulkFlags(ids, action),
    onSuccess: invalidate,
  });

  return { resolve, setSeverity, remove, bulk };
}
