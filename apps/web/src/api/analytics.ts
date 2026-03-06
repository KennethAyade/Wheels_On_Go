import client from './client';
import type { AnalyticsOverview, DriverMetrics } from '../types';

export async function getAnalyticsOverview(days = 30): Promise<AnalyticsOverview> {
  const { data } = await client.get('/admin/analytics/overview', { params: { days } });
  return data;
}

export async function getDriverMetrics(): Promise<DriverMetrics> {
  const { data } = await client.get('/admin/analytics/drivers');
  return data;
}
