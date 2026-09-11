import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  claimDocument,
  createCorrectionRequest,
  listReviewQueue,
  releaseDocument,
  type CorrectionRequestPayload,
  type ReviewQueueFilters,
} from '../api/reviewQueueApi';

export function useReviewQueue(filters: ReviewQueueFilters) {
  return useQuery({
    queryKey: ['review-queue', filters],
    queryFn: () => listReviewQueue(filters),
    placeholderData: (previous) => previous,
  });
}

export function useReviewQueueMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['review-queue'] });
    // Compteur « à valider » affiché dans le catalogue de documents.
    qc.invalidateQueries({ queryKey: ['documents', 'review-count'] });
  };

  const claim = useMutation({
    mutationFn: (id: string) => claimDocument(id),
    onSuccess: invalidate,
  });

  const release = useMutation({
    mutationFn: (id: string) => releaseDocument(id),
    onSuccess: invalidate,
  });

  const requestCorrection = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CorrectionRequestPayload }) =>
      createCorrectionRequest(id, payload),
    onSuccess: invalidate,
  });

  return { claim, release, requestCorrection };
}
