import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${API_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data.data);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Failed to fetch dashboard metrics.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim().toUpperCase();
    if (query.startsWith('AST-')) {
      // Looks like an asset code, let's navigate to assets catalog with filter
      navigate(`/assets?search=${encodeURIComponent(query)}`);
    } else if (query.startsWith('ISS-')) {
      // Looks like an issue code, let's navigate to issues with filter
      navigate(`/issues?search=${encodeURIComponent(query)}`);
    } else {
      // General text search, filter assets by default
      navigate(`/assets?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-200 flex flex-col justify-center items-center font-sans select-none">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-light text-gray-400">Loading MaintainIQ Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-200 flex flex-col justify-center items-center font-sans p-6 select-none">
        <div className="bg-red-950/40 border border-red-900 text-red-300 p-6 rounded-2xl max-w-md text-center space-y-4">
          <p className="text-sm font-medium">{error}</p>
          <button
            onClick={fetchStats}
            className="w-full bg-red-900/60 hover:bg-red-950 text-xs py-2 rounded-xl border border-red-800 transition-colors cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-6 select-none font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-900 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
              ðŸ›¡ï¸ MaintainIQ Operational Control
            </h1>
            <p className="text-xs text-gray-500 font-light mt-1">
              Real-time asset telemetry, technician dispatch queues, and maintenance history pipelines.
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => navigate('/assets')}
              className="bg-indigo-650 hover:bg-indigo-650 text-xs px-4 py-2.5 rounded-xl text-white font-semibold transition-all cursor-pointer shadow-md"
            >
              Assets Catalog
            </button>
            <button
              onClick={() => navigate('/issues')}
              className="bg-gray-900 border border-gray-800 hover:bg-gray-850 text-xs px-4 py-2.5 rounded-xl text-gray-300 font-medium transition-colors cursor-pointer"
            >
              Issues Board
            </button>
          </div>
        </div>

        {/* Global Search Tool */}
        <form onSubmit={handleGlobalSearch} className="bg-gray-900/40 border border-gray-900 p-4 rounded-xl flex gap-3 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search assets or issues (e.g. AST-0001, ISS-0002, or general term)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-10 py-2 text-xs text-white placeholder-gray-505 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-sm text-gray-500 hover:text-gray-300 font-bold"
              >
                Ã—
              </button>
            )}
          </div>
          <button
            type="submit"
            className="bg-gray-905 hover:bg-gray-850 text-gray-400 font-semibold px-4 py-2 rounded-lg border border-gray-802 text-xs transition-all cursor-pointer"
          >
            Find Registry
          </button>
        </form>

        {/* Metric Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          
          {/* Card 1: Total Assets */}
          <div
            onClick={() => navigate('/assets')}
            className="bg-gray-900 border border-gray-808 hover:border-indigo-900/60 p-5 rounded-2xl cursor-pointer transition-all shadow-md group"
          >
            <p className="text-[10px] text-gray-550 uppercase tracking-widest font-black group-hover:text-indigo-400 transition-colors">
              Total Assets
            </p>
            <p className="text-3xl font-extrabold text-white mt-2 font-mono">
              {stats?.totalAssets || 0}
            </p>
            <p className="text-[10px] text-gray-600 mt-1 font-light italic">
              Click to view catalog â†’
            </p>
          </div>

          {/* Card 2: Open Issues */}
          <div
            onClick={() => navigate('/issues?status=Reported,Assigned,Inspection Started,Maintenance In Progress,Waiting for Parts,Reopened')}
            className="bg-gray-900 border border-gray-808 hover:border-indigo-900/60 p-5 rounded-2xl cursor-pointer transition-all shadow-md group"
          >
            <p className="text-[10px] text-gray-550 uppercase tracking-widest font-black group-hover:text-indigo-400 transition-colors">
              Open Incidents
            </p>
            <p className="text-3xl font-extrabold text-white mt-2 font-mono">
              {stats?.openIssues || 0}
            </p>
            <p className="text-[10px] text-gray-600 mt-1 font-light italic">
              Awaiting technician actions â†’
            </p>
          </div>

          {/* Card 3: Critical Priority Incidents */}
          <div
            onClick={() => navigate('/issues?priority=Critical')}
            className={`bg-gray-900 border p-5 rounded-2xl cursor-pointer transition-all shadow-md group ${
              (stats?.criticalIssues || 0) > 0 
                ? 'border-red-900/80 bg-red-950/5 hover:border-red-800' 
                : 'border-gray-808 hover:border-indigo-900/60'
            }`}
          >
            <p className={`text-[10px] uppercase tracking-widest font-black transition-colors ${
              (stats?.criticalIssues || 0) > 0 ? 'text-red-400 animate-pulse' : 'text-gray-550'
            }`}>
              Critical Actions
            </p>
            <p className={`text-3xl font-extrabold mt-2 font-mono ${
              (stats?.criticalIssues || 0) > 0 ? 'text-red-500' : 'text-white'
            }`}>
              {stats?.criticalIssues || 0}
            </p>
            <p className="text-[10px] text-gray-660 mt-1 font-light italic">
              Flagged risk overrides â†’
            </p>
          </div>

          {/* Card 4: Resolved This Week */}
          <div className="bg-gray-900 border border-gray-808 p-5 rounded-2xl shadow-md">
            <p className="text-[10px] text-gray-550 uppercase tracking-widest font-black">
              Resolved (7d)
            </p>
            <p className="text-3xl font-extrabold text-white mt-2 font-mono">
              {stats?.resolvedThisWeek || 0}
            </p>
            <p className="text-[10px] text-gray-500 mt-1 font-light">
              Closed or resolved tasks
            </p>
          </div>

          {/* Card 5: Average Resolution Time */}
          <div className="bg-gray-900 border border-gray-808 p-5 rounded-2xl shadow-md">
            <p className="text-[10px] text-gray-550 uppercase tracking-widest font-black">
              Resolution Speed
            </p>
            <p className="text-3xl font-extrabold text-white mt-2 font-mono">
              {stats?.avgResolutionTime !== undefined ? `${stats.avgResolutionTime}h` : '0h'}
            </p>
            <p className="text-[10px] text-gray-500 mt-1 font-light">
              Mean triage-to-close speed
            </p>
          </div>

        </div>

        {/* Quick Access Actions Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => navigate('/assets')}
            className="p-6 bg-gradient-to-br from-indigo-950/20 to-gray-900/60 border border-gray-900 hover:border-indigo-900/40 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5"
          >
            <h3 className="text-base font-bold text-white mb-2">ðŸ“‹ Asset Registry Index</h3>
            <p className="text-xs text-gray-500 font-light leading-relaxed">
              Verify real-time conditions of all managed equipment. Perform full CRUD management operations or acquire slugs/QRs here.
            </p>
          </div>
          <div
            onClick={() => navigate('/issues')}
            className="p-6 bg-gradient-to-br from-purple-950/15 to-gray-900/60 border border-gray-900 hover:border-purple-900/40 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5"
          >
            <h3 className="text-base font-bold text-white mb-2">âš¡ Incident Dispatch Desk</h3>
            <p className="text-xs text-gray-500 font-light leading-relaxed">
              Update issue reports, configure ownership dispatch filters, and launch diagnostic state transitions on pending tickets.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

