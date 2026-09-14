import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listRelations, rejectRelation, validateRelation, type RelationFilters } from '../api/relationsApi';

export function useRelations(filters: RelationFilters) {
  return useQuery({
    queryKey: ['relations', filters],
    queryFn: () => listRelations(filters),
    placeholderData: (previous) => previous,
  });
}

export function useRelationMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['relations'] });

  const validate = useMutation({
    mutationFn: (id: string) => validateRelation(id),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: ({ id, commentaire }: { id: string; commentaire?: string }) => rejectRelation(id, commentaire),
    onSuccess: invalidate,
  });

  return { validate, reject };
}
