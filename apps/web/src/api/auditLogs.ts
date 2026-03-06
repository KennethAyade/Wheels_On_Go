import client from './client';
import type { AuditLog, PaginatedResponse } from '../types';

export async function listAuditLogs(params: {
  action?: string;
  targetType?: string;
  actorUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<AuditLog>> {
  const { data } = await client.get('/admin/audit-logs', { params });
  return data;
}
