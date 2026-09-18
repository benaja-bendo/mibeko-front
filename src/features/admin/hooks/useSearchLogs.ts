import { useQuery } from '@tanstack/react-query';
import { getNoResultSearchQueries, getTopSearchQueries } from '../api/searchLogsApi';

export function useTopSearchQueries(page: number, enabled: boolean) {
  return useQuery({ queryKey: ['admin', 'search-logs', 'top', page], queryFn: () => getTopSearchQueries(page), enabled });
}
export function useNoResultSearchQueries(page: number, enabled: boolean) {
  return useQuery({ queryKey: ['admin', 'search-logs', 'no-results', page], queryFn: () => getNoResultSearchQueries(page), enabled });
}
