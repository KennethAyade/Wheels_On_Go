import client from './client';
import type { ReportSummary } from '../types';

export async function getReportSummary(params: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<ReportSummary> {
  const { data } = await client.get('/admin/reports/summary', { params });
  return data;
}
