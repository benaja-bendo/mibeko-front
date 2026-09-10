import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getContactMessages, getNewsletterSubscribers, updateContactMessage, type ContactStatus } from '../api/contactInboxApi';

export function useContactMessages(page: number, status: ContactStatus, enabled: boolean) {
  return useQuery({ queryKey: ['admin', 'messages', page, status], queryFn: () => getContactMessages(page, status), enabled });
}
export function useNewsletterSubscribers(page: number, enabled: boolean) {
  return useQuery({ queryKey: ['admin', 'newsletter', page], queryFn: () => getNewsletterSubscribers(page), enabled });
}
export function useHandleContact() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, handled }: { id: string; handled: boolean }) => updateContactMessage(id, handled),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['admin', 'messages'] }),
        client.invalidateQueries({ queryKey: ['admin', 'overview'] }),
      ]);
    },
  });
}
