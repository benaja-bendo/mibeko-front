/**
 * entitlementsApi.ts — Client de `GET /me/entitlements` (mibeko-dashboard#63).
 */

import { laravelClient } from '@/shared/api';
import type { Entitlements } from '@/features/entitlements/types';

export async function getEntitlements(): Promise<Entitlements> {
  const { data } = await laravelClient.get('me/entitlements');
  return data.data;
}
