import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';

const ISSUE_CATEGORIES = ['HVAC', 'Electrical', 'Plumbing', 'Structural', 'Appliance', 'Other'];

export default function ReportIssue() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [evidenceName, setEvidenceName] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEvidenceName(file.name);
    }
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

      // Append upload if selected
      if (data.evidence && data.evidence[0]) {
        formData.append('evidence', data.evidence[0]);
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await axios.post(`${API_URL}/public/assets/${slug}/issues`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess(true);
      setTimeout(() => {
        navigate(`/public/asset/${slug}`);
      }, 3000);
    } catch (err) {
      setServerError(err.response?.data?.error?.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center max-w-sm w-full shadow-2xl">
          <div className="w-12 h-12 bg-green-950/40 border border-green-800 text-green-300 rounded-full flex items-center justify-center mx-auto text-xl mb-4 animate-bounce">
            ✓
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Issue Reported Successfully</h2>
          <p className="text-sm text-gray-500 mb-4">Our operations desk has logged this incident. Technicians are being notified.</p>
          <span className="text-[11px] text-gray-600 block">Redirecting you back to the asset details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex flex-col items-center p-4 font-sans select-none">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-gray-900/30">
          <div className="flex justify-between items-center mb-2">
            <span className="text-indigo-400 text-xs font-semibold uppercase tracking-wider">Public Issue Reporting</span>
            <button
              onClick={() => navigate(`/public/asset/${slug}`)}
              className="text-gray-500 hover:text-gray-300 text-xs flex items-center gap-1 font-medium transition-colors"
            >
              ← Back
            </button>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Report a Asset Incident</h1>
          <p className="text-xs text-gray-500 mt-1">Please provide accurate fault Details to speed up repair triage.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          
          {serverError && (
            <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-lg p-3 text-xs leading-5">
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
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-gray-500"
              placeholder="e.g. john@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-gray-800/60 pt-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block uppercase tracking-wider font-semibold mb-1">Incident Category *</label>
              <select
                {...register('category', { required: 'Select a category' })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select Category...</option>
                {ISSUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-red-400 text-[11px] mt-1">{errors.category.message}</p>}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block uppercase tracking-wider font-semibold mb-1">Issue Summary / Title *</label>
            <input
              {...register('title', { required: 'Please summarize the issue' })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-gray-500"
              placeholder="Brief description of the problem"
            />
            {errors.title && <p className="text-red-400 text-[11px] mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="text-xs text-gray-505 block uppercase tracking-wider font-semibold mb-1">Detailed Description *</label>
            <textarea
              {...register('description', { required: 'Provide details about the fault' })}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-gray-505 resize-none"
              placeholder="Explain how to replicate the issue, and any specific details"
            />
            {errors.description && <p className="text-red-400 text-[11px] mt-1">{errors.description.message}</p>}
          </div>

          {/* Photo evidence upload */}
          <div className="border-t border-gray-800/60 pt-4">
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
                <span>📸 {evidenceName || 'Tap to capture / select photo'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
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
