import { useQuery } from '@tanstack/react-query';
import { getAdminSante } from '@/features/admin/api/santeApi';

const STALE = 60 * 1000;

export function useAdminSante() {
  return useQuery({
    queryKey: ['admin', 'sante'],
    queryFn: getAdminSante,
    staleTime: STALE,
  });
}
