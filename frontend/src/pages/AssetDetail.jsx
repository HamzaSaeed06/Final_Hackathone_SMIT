import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assetService } from '../services/assetService';
import AssetForm from '../components/AssetForm';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  'Operational': 'bg-green-900/40 text-green-300 border-green-800',
  'Issue Reported': 'bg-yellow-900/40 text-yellow-300 border-yellow-800',
  'Under Inspection': 'bg-blue-900/40 text-blue-300 border-blue-800',
  'Under Maintenance': 'bg-orange-900/40 text-orange-300 border-orange-880',
  'Out of Service': 'bg-red-900/40 text-red-300 border-red-800',
  'Retired': 'bg-gray-700/40 text-gray-400 border-gray-700',
};

export default function AssetDetail() {
  const { id } = useParams();
  const [asset, setAsset] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [assetRes, qrRes, histRes] = await Promise.all([
        assetService.getById(id),
        assetService.getQR(id),
        assetService.getHistory(id),
      ]);
      setAsset(assetRes.data.data);
      setQrData(qrRes.data.data);
      setHistory(histRes.data.data);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to load asset';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const handleCopyLink = async () => {
    if (!qrData?.publicUrl) return;
    try {
      await navigator.clipboard.writeText(qrData.publicUrl);
      toast.success('Public page URL link copied!');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy public link to clipboard');
    }
  };

  const handleDownloadQR = () => {
    if (!qrData?.qrCodeUrl) return;
    try {
      const a = document.createElement('a');
      a.href = qrData.qrCodeUrl;
      a.download = `${asset?.assetCode}-qr.png`;
      a.target = '_blank';
      a.click();
      toast.success('Asset QR Code download started!');
    } catch (err) {
      toast.error('Could not download QR image');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-gray-500 gap-3">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Loading asset telemetry details...</p>
      </div>
    );
  }
  if (error) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400">{error}</div>;
  if (!asset) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-6">
        <Link to="/assets" className="hover:text-indigo-400">Assets</Link>
        <span className="mx-2">â€º</span>
        <span className="text-gray-300">{asset.assetCode}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Asset Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">{asset.name}</h1>
                <p className="text-indigo-400 font-mono text-sm mt-1">{asset.assetCode}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[asset.status]}`}>
                  {asset.status}
                </span>
                <button
                  onClick={() => setShowEdit(true)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Category', asset.category],
                ['Location', asset.location],
                ['Condition', asset.condition],
                ['Assigned To', asset.assignedTechnician?.name || 'â€”'],
                ['Last Service', asset.lastServiceDate ? new Date(asset.lastServiceDate).toLocaleDateString() : 'â€”'],
                ['Next Service', asset.nextServiceDate ? new Date(asset.nextServiceDate).toLocaleDateString() : 'â€”'],
                ['Created By', asset.createdBy?.name || 'â€”'],
                ['Created', new Date(asset.createdAt).toLocaleDateString()],
              ].map(([label, val]) => (
                <div key={label}>
                  <span className="text-gray-500 block">{label}</span>
                  <span className="text-gray-200 font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* History Timeline */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-md">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              ðŸ“œ Asset Activity Timeline
            </h2>
            {history.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-gray-800 rounded-xl">
                <p className="text-gray-550 text-xs">No activity logs recorded for this asset yet.</p>
              </div>
            ) : (
              <div className="relative border-l border-gray-800 pl-4 ml-2 space-y-5">
                {history.map((h, i) => (
                  <div key={i} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-gray-950 font-bold" />
                    
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-200">{h.action}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-gray-550 font-light">
                        <span className="font-medium text-gray-400">By: {h.actorName || h.actor}</span>
                        <span>â€¢</span>
                        <span>{new Date(h.timestamp).toLocaleString()}</span>
                        {h.relatedIssue && (
                          <>
                            <span>â€¢</span>
                            <Link
                              to={`/issues/${typeof h.relatedIssue === 'object' ? h.relatedIssue._id : h.relatedIssue}`}
                              className="text-indigo-400 hover:text-indigo-350 hover:underline font-mono font-medium"
                            >
                              Ticket details â†—
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: QR Panel */}
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">QR Code</h2>

            {asset.status === 'Retired' && (
              <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-2 text-xs mb-3 text-center font-bold tracking-wide">
                ⚠ RETIRED ASSET {/* eslint-disable-line no-irregular-whitespace */}
              </div>
            )}

            {qrData?.qrCodeUrl ? (
              <img
                src={qrData.qrCodeUrl}
                alt="Asset QR Code"
                className="w-full rounded-lg border border-gray-700"
              />
            ) : (
              <div className="w-full aspect-square bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                QR not available
              </div>
            )}

            <div className="mt-4 space-y-2">
              <button
                onClick={handleDownloadQR}
                disabled={!qrData?.qrCodeUrl}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                â¬‡ Download QR
              </button>
              <button
                onClick={handleCopyLink}
                disabled={!qrData?.publicUrl}
                className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {copied ? 'âœ“ Copied!' : 'ðŸ”— Copy Public Link'}
              </button>
              {qrData?.publicUrl && (
                <a
                  href={qrData.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm font-medium text-center transition-colors"
                >
                  â†— Open Public Page
                </a>
              )}
            </div>

            {qrData?.publicUrl && (
              <p className="text-gray-500 text-xs mt-3 break-all">{qrData.publicUrl}</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <AssetForm
          asset={asset}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); fetchAll(); }}
        />
      )}
    </div>
  );
}

