/**
 * productEventsApi.ts — Client de `POST /api/v1/product-events` (mibeko-dashboard#137).
 */

import { laravelClient } from '@/shared/api';
import type { ProductEventPayload, ProductEventResponse } from '@/features/productEvents/types';

export async function recordProductEvent(payload: ProductEventPayload): Promise<ProductEventResponse> {
  const { data } = await laravelClient.post('product-events', payload);
  return data.data;
}
