import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listAudits,
  getAuditStats,
  getAuditFilters,
  getAudit,
  purgeAudits,
  type AuditFilters,
} from '@/features/admin/api/auditApi';

const STALE = 30 * 1000;

export function useAudits(filters: AuditFilters) {
  return useQuery({
    queryKey: ['admin', 'audits', filters],
    queryFn: () => listAudits(filters),
    placeholderData: (previous) => previous,
    staleTime: STALE,
  });
}

export function useAuditStats() {
  return useQuery({
    queryKey: ['admin', 'audits', 'stats'],
    queryFn: getAuditStats,
    staleTime: STALE,
  });
}

export function useAuditFilters() {
  return useQuery({
    queryKey: ['admin', 'audits', 'filters'],
    queryFn: getAuditFilters,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAudit(id: number | null) {
  return useQuery({
    queryKey: ['admin', 'audit', id],
    queryFn: () => getAudit(id as number),
    enabled: id !== null,
  });
}

export function useAuditMutations() {
  const qc = useQueryClient();

  const purge = useMutation({
    mutationFn: (olderThanDays: number) => purgeAudits(olderThanDays),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'audits'] });
    },
  });

  return { purge };
}
