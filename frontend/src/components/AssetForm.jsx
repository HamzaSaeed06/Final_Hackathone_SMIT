import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { assetService } from '../services/assetService';
import toast from 'react-hot-toast';

const CONDITION_OPTIONS = ['Good', 'Fair', 'Poor'];
const STATUS_OPTIONS = ['Operational', 'Issue Reported', 'Under Inspection', 'Under Maintenance', 'Out of Service', 'Retired'];

export default function AssetForm({ asset, onClose, onSuccess }) {
  const isEdit = !!asset;
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: isEdit ? {
      name: asset.name,
      category: asset.category,
      location: asset.location,
      condition: asset.condition,
      status: asset.status,
    } : {}
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError('');
    try {
      if (isEdit) {
        await assetService.update(asset._id, data);
        toast.success('Asset updated successfully.');
      } else {
        await assetService.create(data);
        toast.success('Asset created successfully.');
      }
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Something went wrong';
      toast.error(msg);
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">{isEdit ? 'Edit Asset' : 'Create Asset'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {serverError && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-3 text-sm">{serverError}</div>
          )}

          <div>
            <label className="text-sm text-gray-400 block mb-1">Asset Name *</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="e.g. HVAC Unit A"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Category *</label>
            <input
              {...register('category', { required: 'Category is required' })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="e.g. HVAC, Electrical, Plumbing"
            />
            {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Location *</label>
            <input
              {...register('location', { required: 'Location is required' })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Floor 3, Server Room"
            />
            {errors.location && <p className="text-red-400 text-xs mt-1">{errors.location.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Condition *</label>
              <select
                {...register('condition', { required: 'Condition is required' })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select...</option>
                {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.condition && <p className="text-red-400 text-xs mt-1">{errors.condition.message}</p>}
            </div>

            {isEdit && (
              <div>
                <label className="text-sm text-gray-400 block mb-1">Status</label>
                <select
                  {...register('status')}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          {!isEdit && (
            <p className="text-gray-500 text-xs">Asset code and QR code will be auto-generated on creation.</p>
          )}
          {isEdit && (
            <p className="text-gray-500 text-xs">⚠ The public slug and QR code will not change when editing.</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
