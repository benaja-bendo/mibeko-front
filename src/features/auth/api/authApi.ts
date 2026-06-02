import { laravelClient } from '@/shared/api/laravelClient';
import type { AuthTokenPayload, User } from '@/shared/types/auth';

interface LoginPayload {
  email: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<AuthTokenPayload> {
  const { data } = await laravelClient.post('/login', {
    ...payload,
    device_name: 'mibeko-saas-web',
  });
  return data.data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await laravelClient.get('/me');
  return data.data.user;
}

export async function logout(): Promise<void> {
  await laravelClient.post('/logout');
}
