import client from './client';
import type { AdminThread, AdminMessage } from '../types';

export async function getThreads(): Promise<AdminThread[]> {
  const { data } = await client.get('/admin/messaging/threads');
  return data;
}

export async function getMessages(userId: string): Promise<AdminMessage[]> {
  const { data } = await client.get(`/admin/users/${userId}/messages`);
  return data;
}

export async function sendMessage(userId: string, content: string): Promise<AdminMessage> {
  const { data } = await client.post(`/admin/users/${userId}/messages`, { content });
  return data;
}

export async function markAsRead(userId: string): Promise<void> {
  await client.patch(`/admin/users/${userId}/messages/read`);
}
