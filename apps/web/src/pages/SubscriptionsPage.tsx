import { useState, useEffect, useCallback } from 'react';
import { Crown, Plus, X } from 'lucide-react';
import {
  listSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  toggleSubscriptionPlanActive,
} from '../api/subscriptions';
import type { SubscriptionPlan } from '../types';

interface PlanFormData {
  name: string;
  description: string;
  monthlyFee: string;
  discountPercentage: string;
  maxRidesPerMonth: string;
  priorityDispatch: boolean;
}

const emptyForm: PlanFormData = {
  name: '',
  description: '',
  monthlyFee: '',
  discountPercentage: '',
  maxRidesPerMonth: '',
  priorityDispatch: false,
};

function planToForm(plan: SubscriptionPlan): PlanFormData {
  return {
    name: plan.name,
    description: plan.description ?? '',
    monthlyFee: String(plan.monthlyFee),
    discountPercentage: String(plan.discountPercentage),
    maxRidesPerMonth: plan.maxRidesPerMonth ? String(plan.maxRidesPerMonth) : '',
    priorityDispatch: plan.priorityDispatch,
  };
}

interface PlanModalProps {
  plan: SubscriptionPlan | null;
  onSave: (data: PlanFormData) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}

function PlanModal({ plan, onSave, onCancel, saving, error }: PlanModalProps) {
  const [form, setForm] = useState<PlanFormData>(plan ? planToForm(plan) : emptyForm);
  const isEdit = !!plan;

  const isValid =
    form.name.trim().length > 0 &&
    Number(form.monthlyFee) > 0 &&
    Number(form.discountPercentage) >= 0 &&
    Number(form.discountPercentage) <= 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Plan' : 'Create Plan'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={saving}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Plan Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Premium"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Plan description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Monthly Fee (₱) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyFee}
                onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
                placeholder="99"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Discount (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.discountPercentage}
                onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })}
                placeholder="5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Max Rides/Month
              </label>
              <input
                type="number"
                min="1"
                value={form.maxRidesPerMonth}
                onChange={(e) => setForm({ ...form, maxRidesPerMonth: e.target.value })}
                placeholder="Unlimited"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                disabled={saving}
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.priorityDispatch}
                  onChange={(e) => setForm({ ...form, priorityDispatch: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  disabled={saving}
                />
                <span className="text-sm text-gray-700">Priority Dispatch</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!isValid || saving}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Plan' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listSubscriptionPlans();
      setPlans(data);
    } catch {
      setError('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleSave = async (form: PlanFormData) => {
    setSaving(true);
    setModalError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        monthlyFee: Number(form.monthlyFee),
        discountPercentage: Number(form.discountPercentage),
        maxRidesPerMonth: form.maxRidesPerMonth ? Number(form.maxRidesPerMonth) : undefined,
        priorityDispatch: form.priorityDispatch,
      };

      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan.id, payload);
      } else {
        await createSubscriptionPlan(payload);
      }

      setShowModal(false);
      setEditingPlan(null);
      fetchPlans();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setModalError(msg || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (plan: SubscriptionPlan) => {
    setTogglingId(plan.id);
    try {
      await toggleSubscriptionPlanActive(plan.id);
      fetchPlans();
    } catch {
      // silent — will be visible on next fetch
    } finally {
      setTogglingId(null);
    }
  };

  const openCreate = () => {
    setEditingPlan(null);
    setModalError(null);
    setShowModal(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setModalError(null);
    setShowModal(true);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-2.5 rounded-lg">
            <Crown className="text-amber-600" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Subscriptions</h1>
            <p className="text-sm text-gray-500">Manage subscription plans</p>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} />
          Create Plan
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-600 mb-3">{error}</p>
          <button
            onClick={fetchPlans}
            className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
          >
            Retry
          </button>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Crown size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium text-gray-600">No subscription plans yet</p>
          <p className="text-sm mt-1">Create your first plan to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Monthly Fee
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Discount
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Max Rides
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Subscribers
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr
                  key={plan.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{plan.name}</p>
                      {plan.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                          {plan.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    ₱{Number(plan.monthlyFee).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{plan.discountPercentage}%</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {plan.maxRidesPerMonth ?? 'Unlimited'}
                  </td>
                  <td className="px-4 py-3">
                    {plan.priorityDispatch ? (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                        Yes
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {plan._count?.riders ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {plan.isActive ? (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(plan)}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(plan)}
                        disabled={togglingId === plan.id}
                        className={`text-xs font-medium ${
                          plan.isActive
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-blue-600 hover:text-blue-800'
                        } disabled:opacity-50`}
                      >
                        {togglingId === plan.id
                          ? '...'
                          : plan.isActive
                            ? 'Deactivate'
                            : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PlanModal
          plan={editingPlan}
          onSave={handleSave}
          onCancel={() => {
            setShowModal(false);
            setEditingPlan(null);
          }}
          saving={saving}
          error={modalError}
        />
      )}
    </div>
  );
}
