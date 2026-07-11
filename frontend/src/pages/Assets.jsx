import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { assetService } from '../services/assetService';
import AssetForm from '../components/AssetForm';

const STATUS_OPTIONS = ['Operational', 'Issue Reported', 'Under Inspection', 'Under Maintenance', 'Out of Service', 'Retired'];
const CONDITION_COLORS = { Good: 'text-green-400', Fair: 'text-yellow-400', Poor: 'text-red-400' };
const STATUS_COLORS = {
  'Operational': 'bg-green-900/40 text-green-300',
  'Issue Reported': 'bg-yellow-900/40 text-yellow-300',
  'Under Inspection': 'bg-blue-900/40 text-blue-300',
  'Under Maintenance': 'bg-orange-900/40 text-orange-300',
  'Out of Service': 'bg-red-900/40 text-red-300',
  'Retired': 'bg-gray-700/40 text-gray-400',
};

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchAssets = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await assetService.getAll(params);
      setAssets(res.data.data.assets);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchAssets(1), 300);
    return () => clearTimeout(timer);
  }, [fetchAssets]);

  const handleCreated = () => {
    setShowForm(false);
    fetchAssets(1);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Assets</h1>
          <p className="text-sm text-gray-400 mt-1">{pagination.total} total assets registered</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Create Asset
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Error */}
      {error && <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-3 text-sm mb-4">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="text-center text-gray-500 py-20">Loading assets...</div>
      ) : assets.length === 0 ? (
        <div className="text-center text-gray-500 py-20">No assets found. Create your first asset.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Condition</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {assets.map((asset) => (
                <tr key={asset._id} className="bg-gray-900/50 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-indigo-400">{asset.assetCode}</td>
                  <td className="px-4 py-3 text-white font-medium">{asset.name}</td>
                  <td className="px-4 py-3 text-gray-300">{asset.category}</td>
                  <td className="px-4 py-3 text-gray-300">{asset.location}</td>
                  <td className={`px-4 py-3 font-medium ${CONDITION_COLORS[asset.condition]}`}>{asset.condition}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[asset.status]}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/assets/${asset._id}`} className="text-indigo-400 hover:text-indigo-300 text-xs font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => fetchAssets(p)}
              className={`w-8 h-8 rounded text-xs font-medium ${p === pagination.page ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <AssetForm onClose={() => setShowForm(false)} onSuccess={handleCreated} />
      )}
    </div>
  );
}
