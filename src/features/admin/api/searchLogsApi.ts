import { laravelClient } from '@/shared/api/laravelClient';
import type { InboxPage } from '@/features/admin/api/contactInboxApi';

export interface SearchLogAggregate {
  query: string;
  volume: number;
  last_searched_at: string;
}

export const getTopSearchQueries = (page: number) =>
  laravelClient.get<InboxPage<SearchLogAggregate>>('admin/search-logs/top', { params: { page } }).then((r) => r.data);

export const getNoResultSearchQueries = (page: number) =>
  laravelClient.get<InboxPage<SearchLogAggregate>>('admin/search-logs/no-results', { params: { page } }).then((r) => r.data);
