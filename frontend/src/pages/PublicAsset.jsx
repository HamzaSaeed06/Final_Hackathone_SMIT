import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const STATUS_COLORS = {
  'Operational': 'bg-green-950/60 text-green-300 border-green-800',
  'Issue Reported': 'bg-yellow-950/60 text-yellow-300 border-yellow-800',
  'Under Inspection': 'bg-blue-950/60 text-blue-300 border-blue-800',
  'Under Maintenance': 'bg-orange-950/60 text-orange-300 border-orange-800',
  'Out of Service': 'bg-red-950/60 text-red-300 border-red-800',
  'Retired': 'bg-gray-800/60 text-gray-400 border-gray-700',
};

const CONDITION_COLORS = {
  Good: 'text-green-400',
  Fair: 'text-yellow-400',
  Poor: 'text-red-400',
};

export default function PublicAsset() {
  const { slug } = useParams();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAsset = async () => {
      setLoading(true);
      setError('');
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await axios.get(`${API_URL}/public/assets/${slug}`);
        setAsset(res.data.data);
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Asset not found. Please scan again.');
      } finally {
        setLoading(false);
      }
    };
    fetchAsset();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400 p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Retrieving asset data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
          <span className="text-4xl">🔍</span>
          <h2 className="text-lg font-semibold text-white mt-3 mb-2">{error}</h2>
          <p className="text-sm text-gray-500 mb-6 font-light">The asset QR code or link matches an invalid slug.</p>
          <div className="bg-gray-805/50 border border-gray-700 rounded-lg p-2 text-xs font-mono text-gray-405 select-all select-none">
            Slug: {slug}
          </div>
        </div>
      </div>
    );
  }

  if (!asset) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex flex-col items-center p-4 font-sans select-none">
      {/* Mobile container */}
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        
        {/* Banner for retired assets */}
        {asset.status === 'Retired' && (
          <div className="bg-red-900/40 border-b border-red-800 text-red-200 px-4 py-3 text-center text-sm font-bold tracking-wide flex items-center justify-center gap-2">
            <span>⚠</span> RETIRED ASSET (OUT OF SERVICE FOREVER)
          </div>
        )}

        {/* Safe overview */}
        <div className="p-6 border-b border-gray-800 bg-gray-900/30">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono tracking-widest text-indigo-400 uppercase bg-indigo-950/40 border border-indigo-900 px-2 py-0.5 rounded">
              {asset.assetCode}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[asset.status]}`}>
              {asset.status}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">{asset.name}</h1>
          <p className="text-xs text-gray-450 mt-0.5">{asset.category}</p>
        </div>

        {/* General Info */}
        <div className="p-6 space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-500 block uppercase tracking-wider font-semibold">Location</span>
              <span className="text-sm font-medium text-gray-300">{asset.location}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block uppercase tracking-wider font-semibold">Condition</span>
              <span className={`text-sm font-semibold capitalize ${CONDITION_COLORS[asset.condition]}`}>
                {asset.condition}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <span className="text-xs text-gray-505 block uppercase tracking-wider font-semibold">Last Inspected</span>
              <span className="text-sm font-medium text-gray-300">
                {asset.lastServiceDate ? new Date(asset.lastServiceDate).toLocaleDateString() : 'Never'}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-505 block uppercase tracking-wider font-semibold">Next Inspection</span>
              <span className="text-sm font-medium text-gray-300">
                {asset.nextServiceDate ? new Date(asset.nextServiceDate).toLocaleDateString() : 'TBD'}
              </span>
            </div>
          </div>

          {/* Safe Recent Public Activity */}
          <div className="border-t border-gray-800 pt-5 mt-2">
            <h3 className="text-xs text-gray-500 uppercase tracking-widest font-black mb-3">Recent Status Logs</h3>
            {asset.recentActivity.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No recent updates logged on public index.</p>
            ) : (
              <div className="space-y-4">
                {asset.recentActivity.map((log, i) => (
                  <div key={i} className="flex gap-3 text-xs leading-5">
                    <div className="relative flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 z-10" />
                      {i < asset.recentActivity.length - 1 && (
                        <div className="absolute top-1.5 bottom-[-16px] w-[1px] bg-gray-800" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-300">{log.action}</p>
                      <p className="text-[10px] text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit issue CTA */}
        {asset.status !== 'Retired' && (
          <div className="p-6 border-t border-gray-800 bg-gray-900/50">
            <Link
              to={`/report/${slug}`}
              className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl text-center text-sm tracking-wide shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer"
            >
              Report a Fault / Issue
            </Link>
          </div>
        )}
      </div>

      <footer className="text-[10px] text-gray-600 mt-6 select-none uppercase tracking-widest">
        Powered by MaintainIQ
      </footer>
    </div>
  );
}
