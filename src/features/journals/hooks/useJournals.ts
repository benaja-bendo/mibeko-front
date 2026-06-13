import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listJournals,
  getJournal,
  listJournalYears,
  updateJournal,
  deleteJournal,
  createMissingDocument,
  setDocumentJournal,
  type JournalFilters,
} from '@/features/journals/api/journalsApi';

export function useJournalsList(filters: JournalFilters) {
  return useQuery({
    queryKey: ['journals', filters],
    queryFn: () => listJournals(filters),
    placeholderData: (previous) => previous,
  });
}

export function useJournal(id: string, opts: { managerView?: boolean } = {}) {
  return useQuery({
    queryKey: ['journal', id, opts.managerView ? 'manager' : 'public'],
    queryFn: () => getJournal(id, opts),
    enabled: !!id,
  });
}

export function useJournalYears() {
  return useQuery({
    queryKey: ['journal-years'],
    queryFn: listJournalYears,
    staleTime: 5 * 60 * 1000,
  });
}

export function useJournalMutations(journalId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['journals'] });
    queryClient.invalidateQueries({ queryKey: ['journal', journalId] });
    // Les rattachements modifient aussi le catalogue documents.
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  };

  const update = useMutation({
    mutationFn: (payload: Parameters<typeof updateJournal>[1]) => updateJournal(journalId, payload),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: () => deleteJournal(journalId),
    onSuccess: invalidate,
  });

  const createMissingText = useMutation({
    mutationFn: (payload: Omit<Parameters<typeof createMissingDocument>[0], 'official_journal_id'>) =>
      createMissingDocument({ ...payload, official_journal_id: journalId }),
    onSuccess: invalidate,
  });

  const attachDocument = useMutation({
    mutationFn: (documentId: string) => setDocumentJournal(documentId, journalId),
    onSuccess: invalidate,
  });

  const detachDocument = useMutation({
    mutationFn: (documentId: string) => setDocumentJournal(documentId, null),
    onSuccess: invalidate,
  });

  return { update, remove, createMissingText, attachDocument, detachDocument };
}
