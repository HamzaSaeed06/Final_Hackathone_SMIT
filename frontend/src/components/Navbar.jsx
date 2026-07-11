import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Signed out successfully.');
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
      isActive
        ? 'bg-indigo-600 text-white shadow'
        : 'text-gray-400 hover:text-white hover:bg-gray-800'
    }`;

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 md:px-6 py-3 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <NavLink to="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="text-lg">ðŸ›¡ï¸</span>
          <span className="text-sm font-black text-white tracking-tight hidden sm:block">MaintainIQ</span>
        </NavLink>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {isAdmin && <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>}
          {isAdmin && <NavLink to="/assets" className={navLinkClass}>Assets</NavLink>}
          <NavLink to="/issues" className={navLinkClass}>Issues</NavLink>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
              isAdmin ? 'bg-indigo-950 text-indigo-400 border border-indigo-900' : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}>
              {user.role || 'guest'}
            </span>
            <span className="text-xs text-gray-400 truncate max-w-[120px]">{user.name || 'User'}</span>
          </div>
          <button
            onClick={handleLogout}
            className="hidden md:block text-xs text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-700 transition-colors cursor-pointer font-semibold"
          >
            Sign Out
          </button>

          {/* Mobile burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden mt-3 border-t border-gray-800 pt-3 space-y-1 pb-1 flex flex-col gap-1">
          {isAdmin && (
            <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Dashboard
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/assets" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Assets
            </NavLink>
          )}
          <NavLink to="/issues" className={navLinkClass} onClick={() => setMobileOpen(false)}>
            Issues
          </NavLink>
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-800">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                isAdmin ? 'bg-indigo-950 text-indigo-400' : 'bg-gray-800 text-gray-400'
              }`}>
                {user.role || 'guest'}
              </span>
              <span className="text-xs text-gray-400">{user.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

