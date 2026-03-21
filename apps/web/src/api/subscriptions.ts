import client from './client';
import type { SubscriptionPlan } from '../types';

export async function listSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await client.get('/admin/subscriptions');
  return data;
}

export async function createSubscriptionPlan(payload: {
  name: string;
  description?: string;
  monthlyFee: number;
  discountPercentage: number;
  maxRidesPerMonth?: number;
  priorityDispatch?: boolean;
}): Promise<SubscriptionPlan> {
  const { data } = await client.post('/admin/subscriptions', payload);
  return data;
}

export async function updateSubscriptionPlan(
  id: string,
  payload: {
    name?: string;
    description?: string;
    monthlyFee?: number;
    discountPercentage?: number;
    maxRidesPerMonth?: number;
    priorityDispatch?: boolean;
  },
): Promise<SubscriptionPlan> {
  const { data } = await client.patch(`/admin/subscriptions/${id}`, payload);
  return data;
}

export async function toggleSubscriptionPlanActive(
  id: string,
): Promise<SubscriptionPlan> {
  const { data } = await client.patch(`/admin/subscriptions/${id}/toggle`);
  return data;
}
