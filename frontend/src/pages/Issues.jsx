import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const STATUS_COLORS = {
  'Reported': 'bg-yellow-950/60 text-yellow-300 border-yellow-800',
  'Assigned': 'bg-blue-950/60 text-blue-300 border-blue-800',
  'Inspection Started': 'bg-indigo-950/50 text-indigo-300 border-indigo-900',
  'Maintenance In Progress': 'bg-orange-950/60 text-orange-300 border-orange-800',
  'Waiting for Parts': 'bg-purple-950/60 text-purple-300 border-purple-800',
  'Resolved': 'bg-green-950/60 text-green-300 border-green-800',
  'Closed': 'bg-gray-800 text-gray-400 border-gray-700',
  'Reopened': 'bg-pink-950/60 text-pink-300 border-pink-850',
};

const PRIORITY_COLORS = {
  'Low': 'bg-gray-800/40 text-gray-400 border-gray-700',
  'Medium': 'bg-blue-950/40 text-blue-400 border-blue-900',
  'High': 'bg-orange-950/50 text-orange-400 border-orange-900',
  'Critical': 'bg-red-950 text-red-400 border-red-800 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse font-extrabold', // visual check alert
};

export default function Issues() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qSearch = searchParams.get('search') || '';
  const qStatus = searchParams.get('status') || '';
  const qPriority = searchParams.get('priority') || '';

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [status, setStatus] = useState(qStatus);
  const [priority, setPriority] = useState(qPriority);
  const [search, setSearch] = useState(qSearch);
  
  // Technician lists for admin assignment filter
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setStatus(qStatus);
    setPriority(qPriority);
    setSearch(qSearch);
  }, [qStatus, qPriority, qSearch]);

  useEffect(() => {
    // Check role
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setIsAdmin(user.role === 'admin');

    if (user.role === 'admin') {
      fetchTechnicians();
    }
  }, []);

  const fetchTechnicians = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${API_URL}/auth/technicians`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTechnicians(res.data.data || []);
    } catch (e) {
      console.error('Failed to load technicians list:', e);
    }
  };

  const fetchIssues = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (selectedTech) params.technician = selectedTech;
      if (search) params.search = search;

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${API_URL}/issues`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setIssues(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load issues catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [status, priority, selectedTech]);

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      fetchIssues();
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-6 select-none font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-900 pb-5">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              🛠️ Issues Dispatch Board
            </h1>
            <p className="text-sm text-gray-500 font-light mt-0.5">
              Review and manage logged incident reports and technician logs.
            </p>
          </div>
          <button
            onClick={() => navigate('/assets')}
            className="bg-gray-900 border border-gray-800 hover:bg-gray-850 text-xs px-4 py-2 rounded-xl text-gray-400 font-medium transition-colors cursor-pointer"
          >
            ← Assets Catalog
          </button>
        </div>

        {/* Filter controls */}
        <div className={`grid grid-cols-1 gap-4 bg-gray-900/40 border border-gray-900 p-4 rounded-xl ${isAdmin ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
          <div>
            <label className="text-[10px] text-gray-550 block uppercase tracking-wider font-semibold mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="ID or title, hit Enter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-505 focus:outline-none focus:border-indigo-500"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setTimeout(fetchIssues, 0); }}
                  className="absolute right-2.5 top-1.5 text-xs text-gray-500 hover:text-gray-300 font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-550 block uppercase tracking-wider font-semibold mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-550"
            >
              <option value="">All Statuses</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-550 block uppercase tracking-wider font-semibold mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-gray-850 border border-gray-770 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-550"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          {/* Technician filter — admin only, uses real API data */}
          {isAdmin && (
            <div>
              <label className="text-[10px] text-gray-550 block uppercase tracking-wider font-semibold mb-1">Technician</label>
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Technicians</option>
                {technicians.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={fetchIssues}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-1.5 rounded-lg text-xs tracking-wide transition-all shadow-md cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="py-12 text-center text-gray-500">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Fetching incidents index...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-950/40 border border-red-900 text-red-300 rounded-xl text-center text-xs">
            {error}
          </div>
        ) : issues.length === 0 ? (
          <div className="py-12 border border-gray-900 border-dashed rounded-2xl text-center text-gray-550">
            <p className="text-sm font-light">No reported issues matches the filter search criteria.</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-808 rounded-2xl overflow-hidden shadow-xl">
            {/* Desktop view table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-950/80 border-b border-gray-800 text-[10px] text-gray-500 uppercase tracking-widest font-black">
                    <th className="p-4">Issue Code</th>
                    <th className="p-4">Asset Details</th>
                    <th className="p-4">Issue Summary</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Assigned To</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-xs">
                  {issues.map(issue => {
                    const isCritical = issue.priority === 'Critical';
                    return (
                      <tr
                        key={issue._id}
                        className={`hover:bg-gray-850/45 transition-colors cursor-pointer ${isCritical ? 'border-l-4 border-l-red-600' : ''}`}
                        onClick={() => navigate(`/issues/${issue._id}`)}
                      >
                        <td className="p-4 font-mono font-bold text-gray-300 uppercase select-all">
                          {issue.issueNumber}
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-white">{issue.asset?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">{issue.asset?.assetCode || 'TBD'}</p>
                        </td>
                        <td className="p-4 max-w-xs truncate">
                          <p className="font-medium text-gray-300">{issue.title}</p>
                          <p className="text-[10px] text-gray-550 mt-0.5 italic">By: {issue.reporterName}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${PRIORITY_COLORS[issue.priority]}`}>
                            {issue.priority}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[issue.status]}`}>
                            {issue.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400 font-light">
                          {issue.assignedTechnician?.name || <span className="text-gray-600 italic">Unassigned</span>}
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/issues/${issue._id}`)}
                            className="bg-indigo-650/10 border border-indigo-900/50 hover:bg-indigo-600 hover:text-white px-2.5 py-1 rounded text-[10px] font-semibold text-indigo-400 transition-all cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile layout list cards */}
            <div className="md:hidden divide-y divide-gray-800">
              {issues.map(issue => {
                const isCritical = issue.priority === 'Critical';
                return (
                  <div
                    key={issue._id}
                    className={`p-4 space-y-3 active:bg-gray-850/60 transition-all ${isCritical ? 'border-l-4 border-l-red-600 Bg-red-950/5' : ''}`}
                    onClick={() => navigate(`/issues/${issue._id}`)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-gray-300 uppercase text-xs">{issue.issueNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${STATUS_COLORS[issue.status]}`}>
                        {issue.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-white text-sm">{issue.title}</h4>
                      <p className="text-xs text-gray-450 mt-0.5 flex gap-1 items-center">
                        Device: <span className="font-mono text-[10px] text-indigo-400 uppercase">{issue.asset?.assetCode}</span> ({issue.asset?.name})
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] pt-1">
                      <span className={`px-1.5 py-0.5 rounded font-semibold border ${PRIORITY_COLORS[issue.priority]}`}>
                        {issue.priority}
                      </span>
                      <span className="text-gray-500">
                        Assignee: <span className="text-gray-400 font-medium">{issue.assignedTechnician?.name || 'None'}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
