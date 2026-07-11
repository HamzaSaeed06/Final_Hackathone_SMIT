import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';

const ISSUE_CATEGORIES = ['HVAC', 'Electrical', 'Plumbing', 'Structural', 'Appliance', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function ReportIssue() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // AI states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiError, setAiError] = useState('');

  // Editable lists returned by AI
  const [possibleCauses, setPossibleCauses] = useState([]);
  const [initialChecks, setInitialChecks] = useState([]);
  
  // Custom manual tags lists helpers
  const [newCause, setNewCause] = useState('');
  const [newCheck, setNewCheck] = useState('');

  const [evidenceName, setEvidenceName] = useState('');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      category: '',
      priority: 'Medium',
      title: '',
      description: '',
      reporterName: '',
      reporterContact: ''
    }
  });

  // Watch fields to assist diff check
  const watchedTitle = watch('title');
  const watchedCategory = watch('category');
  const watchedPriority = watch('priority');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEvidenceName(file.name);
    }
  };

  // Triggers Gemini analysis using description raw input
  const analyzeWithAI = async () => {
    const descriptionText = watch('description');
    if (!descriptionText || descriptionText.trim().length < 10) {
      setAiError('Please enter a longer description (at least 10 chars) before running AI analysis.');
      return;
    }

    setAiLoading(true);
    setAiError('');
    setAiSuggestion(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Abort controller for 10 seconds client-side timeout validation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await axios.post(
        `${API_URL}/public/assets/${slug}/ai-triage`,
        { complaint: descriptionText },
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);

      const suggestion = res.data.data;
      setAiSuggestion(suggestion);
      toast.success('AI triage suggestions successfully prefilled!');

      // Pre-fill editable fields
      setValue('title', suggestion.title);
      setValue('category', suggestion.category);
      setValue('priority', suggestion.priority);
      setPossibleCauses(suggestion.possibleCauses || []);
      setInitialChecks(suggestion.initialChecks || []);
    } catch (err) {
      const errMsg = err.message === 'canceled' || err.code === 'ECONNABORTED'
        ? 'AI analysis timed out (10s threshold exceeded). Please fill in the details manually.'
        : err.response?.data?.error?.message || 'AI Triage service is temporarily offline. Please continue manually.';
      setAiError(errMsg);
      toast.error(errMsg);
    } finally {
      setAiLoading(false);
    }
  };

  // Helper arrays modification utilities
  const addCause = () => {
    if (newCause.trim()) {
      setPossibleCauses([...possibleCauses, newCause.trim()]);
      setNewCause('');
    }
  };

  const removeCause = (index) => {
    setPossibleCauses(possibleCauses.filter((_, i) => i !== index));
  };

  const addCheck = () => {
    if (newCheck.trim()) {
      setInitialChecks([...initialChecks, newCheck.trim()]);
      setNewCheck('');
    }
  };

  const removeCheck = (index) => {
    setInitialChecks(initialChecks.filter((_, i) => i !== index));
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError('');
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('reporterName', data.reporterName);
      if (data.reporterContact) formData.append('reporterContact', data.reporterContact);
      formData.append('category', data.category);
      formData.append('priority', data.priority);

      // Diff check to set "wasEdited"
      let finalAiPayload = null;
      if (aiSuggestion) {
        const isEdited = (
          watchedTitle !== aiSuggestion.title ||
          watchedCategory !== aiSuggestion.category ||
          watchedPriority !== aiSuggestion.priority ||
          JSON.stringify(possibleCauses) !== JSON.stringify(aiSuggestion.possibleCauses) ||
          JSON.stringify(initialChecks) !== JSON.stringify(aiSuggestion.initialChecks)
        );

        finalAiPayload = {
          title: aiSuggestion.title,
          category: aiSuggestion.category,
          priority: aiSuggestion.priority,
          possibleCauses,
          initialChecks,
          recurringWarning: aiSuggestion.recurringWarning,
          wasEdited: isEdited
        };

        formData.append('aiSuggestion', JSON.stringify(finalAiPayload));
      }

      // Attach file evidence
      if (data.evidence && data.evidence[0]) {
        formData.append('evidence', data.evidence[0]);
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await axios.post(`${API_URL}/public/assets/${slug}/issues`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Incident issue reported successfully!');
      setSuccess(true);
      setTimeout(() => {
        navigate(`/public/asset/${slug}`);
      }, 2500);
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to submit report. Please try again.';
      setServerError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center max-w-sm w-full shadow-2xl">
          <div className="w-12 h-12 bg-green-950/40 border border-green-800 text-green-300 rounded-full flex items-center justify-center mx-auto text-xl mb-4 animate-bounce">
            âœ“
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Issue Reported Successfully</h2>
          <p className="text-sm text-gray-500 mb-4 font-light">The operation table has queued your incident. A technician will dispatch shortly.</p>
          <span className="text-[11px] text-indigo-400 block font-mono select-none">Redirecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex flex-col items-center p-4 font-sans select-none">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden mb-8">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-gray-900/30">
          <div className="flex justify-between items-center mb-2">
            <span className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">Triage & Report</span>
            <button
              onClick={() => navigate(`/public/asset/${slug}`)}
              className="text-gray-500 hover:text-gray-300 text-xs flex items-center gap-1 font-medium transition-colors"
            >
              â† Back
            </button>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Post Asset Incident</h1>
          <p className="text-xs text-gray-500 mt-1">Submit description to automatically run AI triage prior to logging.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          
          {serverError && (
            <div className="bg-red-950/40 border border-red-808 text-red-303 rounded-lg p-3 text-xs leading-5">
              {serverError}
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 block uppercase tracking-wider font-semibold mb-1">Your Name *</label>
            <input
              {...register('reporterName', { required: 'Please enter your name' })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-gray-500"
              placeholder="e.g. John Doe"
            />
            {errors.reporterName && <p className="text-red-400 text-[11px] mt-1">{errors.reporterName.message}</p>}
          </div>

          <div>
            <label className="text-xs text-gray-505 block uppercase tracking-wider font-semibold mb-1">Contact Email / Phone (Optional)</label>
            <input
              {...register('reporterContact')}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-505 placeholder-gray-500"
              placeholder="e.g. john@example.com"
            />
          </div>

          <div className="border-t border-gray-800/80 pt-4">
            <label className="text-xs text-gray-505 block uppercase tracking-wider font-semibold mb-1">Detailed Description *</label>
            <textarea
              {...register('description', { required: 'Provide details about the fault' })}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-gray-500 resize-none mb-2"
              placeholder="e.g. AC compressor makes grinding noise and smells like burning wire"
            />
            {errors.description && <p className="text-red-400 text-[11px] mt-1">{errors.description.message}</p>}
            
            {/* AI Analyze trigger */}
            <div className="flex items-center justify-between gap-2 mt-1">
              <button
                type="button"
                onClick={analyzeWithAI}
                disabled={aiLoading}
                className="bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800 disabled:opacity-50 text-indigo-300 font-semibold px-3 py-1.5 rounded-lg text-xs tracking-wide transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {aiLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    Analyzing complaint...
                  </>
                ) : (
                  <>✨ Analyze with AI</>
                )}
              </button>
              <span className="text-[10px] text-gray-550 italic select-none">Powered by Gemini AI</span>
            </div>
            {aiError && <p className="text-red-400 text-[11px] mt-2 font-medium">⚠️ {aiError}</p>} {/* eslint-disable-line no-irregular-whitespace */}
          </div>

          {/* AI prefilled warning */}
          {aiSuggestion && aiSuggestion.recurringWarning && (
            <div className="bg-red-950/40 border border-red-900/80 text-red-300 rounded-xl p-3.5 text-xs leading-5">
              <p className="font-bold mb-0.5">⚠️ AI SAFETY NOTICE</p> {/* eslint-disable-line no-irregular-whitespace */}
              <p className="text-[11px] text-gray-400 font-light">{aiSuggestion.recurringWarning}</p>
            </div>
          )}

          {/* Prefilled/Editable Section */}
          <div className="border-t border-gray-800/80 pt-4 space-y-4">
            <h3 className="text-xs text-indigo-400 uppercase tracking-widest font-black mb-1">Issue Details (AI Triage Preview)</h3>
            
            <div>
              <label className="text-xs text-gray-500 block uppercase tracking-wider font-semibold mb-1">Issue Summary / Title *</label>
              <input
                {...register('title', { required: 'Please outline a summary title' })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-505 placeholder-gray-500"
                placeholder="Fill manually or trigger AI triage"
              />
              {errors.title && <p className="text-red-400 text-[11px] mt-1">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block uppercase tracking-wider font-semibold mb-1">Category *</label>
                <select
                  {...register('category', { required: 'Select a category' })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-505"
                >
                  <option value="">Select...</option>
                  {ISSUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className="text-red-400 text-[11px] mt-1">{errors.category.message}</p>}
              </div>

              <div>
                <label className="text-xs text-gray-500 block uppercase tracking-wider font-semibold mb-1">Priority *</label>
                <select
                  {...register('priority', { required: 'Select a priority' })}
                  className="w-full bg-gray-805 border border-gray-770 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-505"
                >
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {errors.priority && <p className="text-red-400 text-[11px] mt-1">{errors.priority.message}</p>}
              </div>
            </div>

            {/* Possible causes list tag manager */}
            <div>
              <label className="text-xs text-gray-500 block uppercase tracking-wider font-semibold mb-2">Possible Causes</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {possibleCauses.map((cause, i) => (
                  <span key={i} className="bg-gray-800 text-gray-300 border border-gray-700 rounded-md px-2 py-0.5 text-xs flex items-center gap-1 leading-normal select-none">
                    {cause}
                    <button type="button" onClick={() => removeCause(i)} className="text-gray-500 hover:text-red-400 font-bold">Ã—</button>
                  </span>
                ))}
                {possibleCauses.length === 0 && <span className="text-xs text-gray-600 italic">No causes suggested.</span>}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCause}
                  onChange={(e) => setNewCause(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  placeholder="Add possible cause..."
                />
                <button type="button" onClick={addCause} className="bg-gray-800 hover:bg-gray-750 text-indigo-400 border border-gray-700 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer">
                  + Add
                </button>
              </div>
            </div>

            {/* Safety initial checks list manager */}
            <div>
              <label className="text-xs text-gray-505 block uppercase tracking-wider font-semibold mb-2 font-bold">Recommended Initial Checks</label>
              <div className="space-y-1.5 mb-2">
                {initialChecks.map((check, i) => (
                  <div key={i} className="bg-gray-800/50 border border-gray-750 rounded-lg p-2 text-xs flex justify-between items-center gap-2 select-none">
                    <span className="text-gray-300 italic font-light">{check}</span>
                    <button type="button" onClick={() => removeCheck(i)} className="text-gray-505 hover:text-red-400 font-semibold px-1">Ã—</button>
                  </div>
                ))}
                {initialChecks.length === 0 && <span className="text-xs text-gray-600 italic">No initial checks suggested.</span>}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCheck}
                  onChange={(e) => setNewCheck(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-650 focus:outline-none focus:border-indigo-500"
                  placeholder="Add safety check step..."
                />
                <button type="button" onClick={addCheck} className="bg-gray-800 hover:bg-gray-750 text-indigo-400 border border-gray-700 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer">
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* Photo evidence upload */}
          <div className="border-t border-gray-800/80 pt-4">
            <label className="text-xs text-gray-505 block uppercase tracking-wider font-semibold mb-1">Fault Photo / Evidence (Optional)</label>
            <div className="relative flex items-center justify-center w-full bg-gray-850 hover:bg-gray-800 border border-gray-750 border-dashed rounded-xl py-4 cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/*"
                {...register('evidence')}
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 w-full cursor-pointer"
              />
              <div className="text-center text-xs text-gray-400 font-medium">
                <span>ðŸ“¸ {evidenceName || 'Tap to capture / select photo'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-800/80">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-center text-sm tracking-wide shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer"
            >
              {loading ? 'Submitting Report...' : 'Submit Incident Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

