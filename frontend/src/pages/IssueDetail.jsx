import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  'Reported': 'Incident Reported',
  'Assigned': 'Work Assigned',
  'Inspection Started': 'Under Inspection',
  'Maintenance In Progress': 'Under Maintenance',
  'Waiting for Parts': 'Waiting for Parts',
  'Resolved': 'Issue Resolved',
  'Closed': 'Incident Closed',
  'Reopened': 'Issue Reopened',
};

const STATUS_COLORS = {
  'Reported': 'bg-yellow-950/65 text-yellow-300 border-yellow-800',
  'Assigned': 'bg-blue-950/65 text-blue-300 border-blue-800',
  'Inspection Started': 'bg-indigo-950/65 text-indigo-300 border-indigo-900',
  'Maintenance In Progress': 'bg-orange-950/65 text-orange-300 border-orange-800',
  'Waiting for Parts': 'bg-purple-950/65 text-purple-300 border-purple-800',
  'Resolved': 'bg-green-950/65 text-green-300 border-green-800',
  'Closed': 'bg-gray-800 text-gray-400 border-gray-700',
  'Reopened': 'bg-pink-950/65 text-pink-300 border-pink-850',
};

const PRIORITY_COLORS = {
  'Low': 'bg-gray-800 text-gray-400 border-gray-700',
  'Medium': 'bg-blue-950/50 text-blue-400 border-blue-900',
  'High': 'bg-orange-950/50 text-orange-400 border-orange-900',
  'Critical': 'bg-red-950 text-red-400 border-red-800 shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse font-extrabold',
};

export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Auth roles
  const [_currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAssignedTech, setIsAssignedTech] = useState(false);

  // Admin technicians dropdown
  const [technicians, setTechnicians] = useState([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Status transitions
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Maintenance Log Modal State
  const [showLogModal, setShowLogModal] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState('');
  
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [cost, setCost] = useState(0);
  const [finalCondition, setFinalCondition] = useState('Good');
  const [startedAt, setStartedAt] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [partsInput, setPartsInput] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [nextServiceDate, setNextServiceDate] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    setIsAdmin(user.role === 'admin');
    fetchIssueDetails();
    if (user.role === 'admin') {
      fetchTechnicianUsers();
    }
  }, [id]);

  const fetchIssueDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${API_URL}/issues/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data.data;
      setIssue(data.issue);
      setLogs(data.logs || []);
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setIsAssignedTech(data.issue.assignedTechnician?._id === user.id);
      
      if (data.issue.assignedTechnician) {
        setAssigneeId(data.issue.assignedTechnician._id);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch issue details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicianUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${API_URL}/auth/technicians`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTechnicians(res.data.data || []);
    } catch (e) {
      console.error('Failed to load technician users:', e);
    }
  };

  const handleAssign = async (e) => {
    const freshId = e.target.value;
    setAssigneeId(freshId);
    if (!freshId) return;

    setAssignLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await axios.patch(
        `${API_URL}/issues/${id}/assign`,
        { technicianId: freshId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Technician assigned successfully.');
      fetchIssueDetails();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to assign technician.';
      toast.error(msg);
      setError(msg);
    } finally {
      setAssignLoading(false);
    }
  };

  const executeStatusTransition = async (newStatus) => {
    setStatusLoading(true);
    setStatusError('');
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const payload = { status: newStatus };
      if (newStatus === 'Resolved' && nextServiceDate) {
        payload.nextServiceDate = nextServiceDate;
      }

      await axios.patch(
        `${API_URL}/issues/${id}/status`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Status updated to "${newStatus}".`);
      fetchIssueDetails();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to transition issue status.';
      toast.error(msg);
      setStatusError(msg);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAddMaintenanceLog = async (e) => {
    e.preventDefault();
    setLogError('');
    setLogLoading(true);

    if (!inspectionNotes.trim() || !workPerformed.trim() || !startedAt || !completedAt) {
      setLogError('All primary description texts and date times are required.');
      setLogLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const formData = new FormData();
      formData.append('inspectionNotes', inspectionNotes);
      formData.append('workPerformed', workPerformed);
      formData.append('cost', cost);
      formData.append('finalCondition', finalCondition);
      formData.append('startedAt', startedAt);
      formData.append('completedAt', completedAt);

      if (partsInput.trim()) {
        const parts = partsInput.split(',').map(p => p.trim()).filter(Boolean);
        formData.append('partsUsed', JSON.stringify(parts));
      }

      for (let i = 0; i < evidenceFiles.length; i++) {
        formData.append('evidence', evidenceFiles[i]);
      }

      await axios.post(
        `${API_URL}/issues/${id}/maintenance-log`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Reset
      setShowLogModal(false);
      setInspectionNotes('');
      setWorkPerformed('');
      setCost(0);
      setPartsInput('');
      setEvidenceFiles([]);
      setStartedAt('');
      setCompletedAt('');

      toast.success('Maintenance log saved. Issue marked as Resolved.');
      fetchIssueDetails();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to save maintenance records.';
      toast.error(msg);
      setLogError(msg);
    } finally {
      setLogLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Gathering incident status details...</p>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-808 rounded-xl p-6 text-center max-w-sm w-full select-none">
          <p className="text-xs text-red-400 mb-4">{error || 'Incident file not found'}</p>
          <button onClick={() => navigate('/issues')} className="bg-gray-800 hover:bg-gray-700 text-xs px-4 py-2 rounded-xl text-gray-300">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isCritical = issue.priority === 'Critical';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-205 p-6 font-sans select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Back navigation */}
        <div className="flex justify-between items-center">
          <button onClick={() => navigate('/issues')} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← Back to Dispatches
          </button>
          
          {/* Status Indicator */}
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[issue.status]}`}>
            Status: {STATUS_LABELS[issue.status] || issue.status}
          </span>
        </div>

        {/* Issue Card Details */}
        <div className={`bg-gray-900 border rounded-2xl p-6 shadow-xl space-y-6 ${isCritical ? 'border-red-900 border-2 shadow-[0_0_20px_rgba(239,68,68,0.08)]' : 'border-gray-808'}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-mono font-black text-gray-400 text-xs uppercase select-text">{issue.issueNumber}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${PRIORITY_COLORS[issue.priority]}`}>
                  {issue.priority} Priority
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight select-text">{issue.title}</h2>
            </div>
            
            {/* Admin Assignee Action Box */}
            {isAdmin && (
              <div className="w-full md:w-auto">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold mb-1">Assign Technician</label>
                <select
                  value={assigneeId}
                  onChange={handleAssign}
                  disabled={assignLoading}
                  className="bg-gray-850 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 w-full md:w-56"
                >
                  <option value="">Unassigned</option>
                  {technicians.map(t => <option key={t._id} value={t._id}>{t.name} ({t.email})</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-800/80">
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Linked Asset</h3>
              <div className="bg-gray-950/60 p-4 border border-gray-900 rounded-xl space-y-2 select-text">
                <p className="text-xs font-semibold text-white">{issue.asset?.name || 'Asset Deleted'}</p>
                <p className="text-[11px] text-gray-400 flex gap-2">
                  <span>Code: <strong className="font-mono text-indigo-400">{issue.asset?.assetCode}</strong></span>
                  <span>|</span>
                  <span>Category: <strong>{issue.asset?.category}</strong></span>
                </p>
                <p className="text-[11px] text-gray-500">Location: {issue.asset?.location || 'Unknown'}</p>
              </div>
            </div>

            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Reporter Information</h3>
              <div className="bg-gray-950/60 p-4 border border-gray-900 rounded-xl space-y-2 select-text">
                <p className="text-xs text-gray-300">Name: <strong className="text-white">{issue.reporterName}</strong></p>
                <p className="text-xs text-gray-500">Contact: {issue.reporterContact || <span className="italic">None provided</span>}</p>
                <p className="text-[10px] text-gray-650">Logged date: {new Date(issue.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 select-text">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold">Complaint Details</h3>
            <p className="bg-gray-950/40 p-4 border border-gray-900 rounded-xl text-xs text-gray-300 font-light leading-6 italic">
              &ldquo;{issue.description}&rdquo;
            </p>
          </div>

          {/* Evidence array images */}
          {issue.evidenceUrls && issue.evidenceUrls.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs text-gray-550 uppercase tracking-wider font-bold">Submitted Evidence Photo</h3>
              <div className="grid grid-cols-2 gap-4">
                {issue.evidenceUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block border border-gray-900 hover:border-gray-800 rounded-xl overflow-hidden cursor-zoom-in">
                    <img src={url} alt={`Evidence #${i+1}`} className="w-full h-32 object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* AI Helper suggestions notes if available */}
          {issue.aiSuggestion && (
            <div className="bg-gray-950/65 border border-indigo-950/70 rounded-xl p-4.5 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-indigo-400 tracking-wider uppercase">💡 Gemini Triage Assist Logs</h4>
                {issue.aiSuggestion.wasEdited ? (
                  <span className="text-[9px] bg-yellow-950/30 text-yellow-400 border border-yellow-800/40 rounded px-1.5 py-0.5">User Edited</span>
                ) : (
                  <span className="text-[9px] bg-indigo-950/30 text-indigo-400 border border-indigo-805/40 rounded px-1.5 py-0.5">Matched Suggestion</span>
                )}
              </div>
              <div className="text-xs space-y-1.5 text-gray-300 font-light select-text">
                <p><span className="text-gray-500">Triage Summary:</span> {issue.aiSuggestion.title}</p>
                <div>
                  <span className="text-gray-500">Possible Causes:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {issue.aiSuggestion.possibleCauses.map((c, i) => <span key={i} className="bg-gray-900 text-[10px] text-gray-400 border border-gray-800 rounded px-1.5 py-0.5">{c}</span>)}
                  </div>
                </div>
                {issue.aiSuggestion.initialChecks && issue.aiSuggestion.initialChecks.length > 0 && (
                  <div className="pt-1.5">
                    <span className="text-gray-505 block font-medium mb-1">Recommended Checks:</span>
                    <ul className="list-disc pl-4 space-y-1 text-gray-450 italic text-[11px]">
                      {issue.aiSuggestion.initialChecks.map((ch, idx) => <li key={idx}>{ch}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Error Display */}
        {statusError && (
          <div className="bg-red-950/40 border border-red-900 text-red-300 p-3.5 rounded-xl text-xs">
            ⚠️ {statusError}
          </div>
        )}

        {/* Technician Workflow Panel */}
        {(isAssignedTech || isAdmin) && (
          <div className="bg-gray-900 border border-gray-808 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs text-gray-550 uppercase tracking-widest font-black">⚙️ Technician Workflow Controls</h3>
            
            {/* Status next transitions buttons container */}
            <div className="flex flex-wrap gap-3">
              {issue.status === 'Reported' && (
                <p className="text-xs text-gray-500 italic">Please allocate this issue first. Assigned technicians can update states.</p>
              )}

              {/* Assignment and diagnostics transitions checks */}
              {issue.status === 'Assigned' && (
                <button
                  onClick={() => executeStatusTransition('Inspection Started')}
                  disabled={statusLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  🔍 Start On-Site Inspection
                </button>
              )}

              {issue.status === 'Inspection Started' && (
                <button
                  onClick={() => executeStatusTransition('Maintenance In Progress')}
                  disabled={statusLoading}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  🔧 Begin Repairs
                </button>
              )}

              {issue.status === 'Maintenance In Progress' && (
                <>
                  <button
                    onClick={() => executeStatusTransition('Waiting for Parts')}
                    disabled={statusLoading}
                    className="bg-purple-650 hover:bg-purple-600 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    📦 Wait for Spare Parts
                  </button>
                  <button
                    onClick={() => setShowLogModal(true)}
                    className="bg-green-600 hover:bg-green-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    ✓ Log Maintenance & Resolve
                  </button>
                </>
              )}

              {issue.status === 'Waiting for Parts' && (
                <>
                  <button
                    onClick={() => executeStatusTransition('Maintenance In Progress')}
                    disabled={statusLoading}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    🔧 Resume Repairs
                  </button>
                  <button
                    onClick={() => setShowLogModal(true)}
                    className="bg-green-600 hover:bg-green-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    ✓ Log Maintenance & Resolve
                  </button>
                </>
              )}

              {/* Resolved / Reopening controls */}
              {issue.status === 'Resolved' && (
                <>
                  <button
                    onClick={() => executeStatusTransition('Closed')}
                    disabled={statusLoading}
                    className="bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    🔒 Close Incident File
                  </button>
                  <button
                    onClick={() => executeStatusTransition('Reopened')}
                    disabled={statusLoading}
                    className="bg-pink-650 hover:bg-pink-600 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    ♻️ Reopen Issue
                  </button>
                </>
              )}

              {issue.status === 'Closed' && (
                <button
                  onClick={() => executeStatusTransition('Reopened')}
                  disabled={statusLoading}
                  className="bg-pink-650 hover:bg-pink-600 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  ♻️ Reopen Incident File
                </button>
              )}

              {issue.status === 'Reopened' && (
                <>
                  <button
                    onClick={() => executeStatusTransition('Assigned')}
                    disabled={statusLoading}
                    className="bg-blue-650 hover:bg-blue-600 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    Re-Assign Tech
                  </button>
                  <button
                    onClick={() => executeStatusTransition('Inspection Started')}
                    disabled={statusLoading}
                    className="bg-indigo-650 hover:bg-indigo-600 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    🔍 Run Re-Inspection
                  </button>
                  <button
                    onClick={() => executeStatusTransition('Maintenance In Progress')}
                    disabled={statusLoading}
                    className="bg-orange-650 hover:bg-orange-600 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    🔧 Resume Maintenance
                  </button>
                </>
              )}
            </div>

            {/* Quick Helper text reminding of log requirement */}
            {(issue.status === 'Maintenance In Progress' || issue.status === 'Waiting for Parts') && (
              <p className="text-[10px] text-gray-500 font-light mt-1 select-none">
                * Note: The issue cannot transition to &ldquo;Resolved&rdquo; status until at least one Maintenance Log has been documented.
              </p>
            )}
          </div>
        )}

        {/* Maintenance Logs Timeline */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white tracking-widest uppercase">📋 Maintenance Activity log history</h3>
          
          {logs.length === 0 ? (
            <div className="bg-gray-900 border border-gray-908 p-6 text-center rounded-2xl text-xs text-gray-500 font-light select-none">
              No technical maintenance actions recorded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log._id} className="bg-gray-900 border border-gray-808 rounded-xl p-5 space-y-3 select-text">
                  <div className="flex justify-between items-start flex-wrap gap-2 text-xs">
                    <div>
                      <p className="text-gray-400 font-semibold text-white">Technician: {log.technician?.name || 'System'}</p>
                      <p className="text-[10px] text-gray-550 mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-indigo-400 font-bold font-mono">Cost: ${log.cost}</p>
                      <p className="text-[10px] text-gray-400">Final Condition: <strong className="text-gray-200">{log.finalCondition}</strong></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t border-gray-800/40">
                    <div>
                      <span className="text-gray-550 uppercase tracking-wider block font-bold text-[9px] mb-1">Inspection Findings</span>
                      <p className="text-gray-300 font-light italic leading-5">&ldquo;{log.inspectionNotes}&rdquo;</p>
                    </div>
                    <div>
                      <span className="text-gray-550 uppercase tracking-wider block font-bold text-[9px] mb-1">Work Performed</span>
                      <p className="text-gray-300 font-light leading-5">{log.workPerformed}</p>
                    </div>
                  </div>

                  {log.partsUsed && log.partsUsed.length > 0 && (
                    <div className="pt-2 text-xs">
                      <span className="text-gray-550 text-[10px] mr-2">Components Replaced:</span>
                      <div className="inline-flex flex-wrap gap-1">
                        {log.partsUsed.map((p, idx) => (
                          <span key={idx} className="bg-gray-950 px-2 py-0.5 border border-gray-800 rounded font-mono text-[10px] text-gray-400">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {log.evidenceUrls && log.evidenceUrls.length > 0 && (
                    <div className="pt-2 space-y-1">
                      <span className="text-gray-550 text-[10px] block mb-1">Evidence Photos:</span>
                      <div className="flex gap-2">
                        {log.evidenceUrls.map((eUrl, eIdx) => (
                          <a key={eIdx} href={eUrl} target="_blank" rel="noreferrer" className="block border border-gray-850 hover:border-gray-800 rounded overflow-hidden cursor-zoom-in">
                            <img src={eUrl} alt="Log evidence" className="w-12 h-12 object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Maintenance Log Submission Modal */}
        {showLogModal && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
              
              <div className="p-5 border-b border-gray-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Log Service Performance</h3>
                <button onClick={() => setShowLogModal(false)} className="text-gray-500 hover:text-gray-300 font-bold">×</button>
              </div>

              <form onSubmit={handleAddMaintenanceLog} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                {logError && (
                  <div className="bg-red-950/40 border border-red-900 text-red-300 p-3 rounded-lg text-xs">
                    {logError}
                  </div>
                )}

                <div>
                  <label className="text-xs text-gray-500 block uppercase font-bold mb-1">Inspection Findings *</label>
                  <textarea
                    required
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-gray-850 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                    placeholder="Describe issue diagnostics results..."
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 block uppercase font-bold mb-1">Work Details Performed *</label>
                  <textarea
                    required
                    value={workPerformed}
                    onChange={(e) => setWorkPerformed(e.target.value)}
                    rows={2}
                    className="w-full bg-gray-850 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                    placeholder="Details about components replaced, tests run, tuning, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 block uppercase font-bold mb-1">Work Cost ($) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={cost}
                      onChange={(e) => setCost(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-gray-850 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block uppercase font-bold mb-1">Final Asset Condition *</label>
                    <select
                      value={finalCondition}
                      onChange={(e) => setFinalCondition(e.target.value)}
                      className="w-full bg-gray-850 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-505 block uppercase font-bold mb-1">Time Started *</label>
                    <input
                      type="datetime-local"
                      required
                      value={startedAt}
                      onChange={(e) => setStartedAt(e.target.value)}
                      className="w-full bg-gray-850 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-505 block uppercase font-bold mb-1">Time Completed *</label>
                    <input
                      type="datetime-local"
                      required
                      value={completedAt}
                      onChange={(e) => setCompletedAt(e.target.value)}
                      className="w-full bg-gray-850 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block uppercase font-bold mb-1">Parts Replaced (Comma Separated)</label>
                  <input
                    type="text"
                    value={partsInput}
                    onChange={(e) => setPartsInput(e.target.value)}
                    className="w-full bg-gray-850 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Capacitor, fan blade, 12AWG wire"
                  />
                </div>

                {/* Evidence attachments (multiple) */}
                <div>
                  <label className="text-xs text-gray-505 block uppercase font-bold mb-1">Repair Proof Photos (Max 5)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []))}
                    className="w-full text-xs text-gray-400 file:bg-gray-800 file:border-0 file:text-indigo-400 file:py-1.5 file:px-3 file:rounded-lg file:mr-3 hover:file:bg-gray-750 cursor-pointer"
                  />
                </div>

                {/* Next service date validation input */}
                <div className="border-t border-gray-800/80 pt-4">
                  <label className="text-xs text-indigo-400 block uppercase font-bold mb-1">Set Next Service Schedule (Required to Resolve)</label>
                  <input
                    type="date"
                    required
                    value={nextServiceDate}
                    onChange={(e) => setNextServiceDate(e.target.value)}
                    className="w-full bg-gray-850 border border-indigo-950 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-gray-550 select-none italic mt-1 block">
                    * By resolving, the status of this ticket will immediately change to &ldquo;Resolved&rdquo;. The linked asset&apos;s status will reset to &ldquo;Operational&rdquo; and scheduled next service dates will be validated and updated.
                  </span>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={logLoading}
                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-center text-xs tracking-wide cursor-pointer"
                  >
                    {logLoading ? 'Saving...' : 'Submit Log & Resolve Issue'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 px-4 rounded-xl text-center text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
