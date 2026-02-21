import client from './client';
import type { DriverProfile, PaginatedResponse } from '../types';

export async function listDrivers(params: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<DriverProfile>> {
  const { data } = await client.get('/admin/drivers', { params });
  return data;
}

export async function getDriverDetail(driverId: string): Promise<DriverProfile> {
  const { data } = await client.get(`/admin/drivers/${driverId}`);
  return data;
}

export async function approveDriver(driverId: string): Promise<DriverProfile> {
  const { data } = await client.post(`/admin/drivers/${driverId}/approve`);
  return data;
}

export async function rejectDriver(driverId: string, reason: string): Promise<DriverProfile> {
  const { data } = await client.post(`/admin/drivers/${driverId}/reject`, { reason });
  return data;
}
