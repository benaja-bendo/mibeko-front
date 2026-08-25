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

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export async function register(payload: RegisterPayload): Promise<AuthTokenPayload> {
  const { data } = await laravelClient.post('/register', {
    ...payload,
    device_name: 'mibeko-saas-web',
  });
  return data.data;
}

/**
 * Demande un code de réinitialisation.
 *
 * Le serveur répond volontairement la même chose que le compte existe ou non
 * (anti-énumération) : on restitue son message tel quel, sans jamais laisser
 * l'interface trahir l'existence d'une adresse.
 */
export async function forgotPassword(email: string): Promise<string> {
  const { data } = await laravelClient.post('/forgot-password', { email });
  return data.message as string;
}

interface ResetPasswordPayload {
  email: string;
  code: string;
  password: string;
  password_confirmation: string;
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  await laravelClient.post('/reset-password', payload);
}

export async function fetchMe(): Promise<User> {
  const { data } = await laravelClient.get('/me');
  return data.data.user;
}

export async function logout(): Promise<void> {
  await laravelClient.post('/logout');
}
