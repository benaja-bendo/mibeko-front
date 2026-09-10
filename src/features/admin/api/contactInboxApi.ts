import { laravelClient } from '@/shared/api/laravelClient';

export interface InboxPage<T> {
  data: T[];
  pagination: { current_page: number; last_page: number; total: number };
}
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  profile: string | null;
  message: string;
  handled: boolean;
  created_at: string;
  account: { id: string; name: string; email: string } | null;
}
export interface NewsletterSubscriber { id: string; email: string; source: string | null; created_at: string }
export type ContactStatus = 'pending' | 'handled' | 'all';

export const getContactMessages = (page: number, status: ContactStatus) => laravelClient.get<InboxPage<ContactMessage>>('admin/messages', {
  params: { page, handled: status === 'all' ? undefined : status === 'handled' ? 1 : 0 },
}).then((r) => r.data);
export const updateContactMessage = (id: string, handled: boolean) => laravelClient.patch(`admin/messages/${id}`, { handled });
export const getNewsletterSubscribers = (page: number) => laravelClient.get<InboxPage<NewsletterSubscriber>>('admin/newsletter-subscriptions', { params: { page } }).then((r) => r.data);
export const exportNewsletter = () => laravelClient.get<Blob>('admin/newsletter-subscriptions/export', { responseType: 'blob' }).then((r) => r.data);
