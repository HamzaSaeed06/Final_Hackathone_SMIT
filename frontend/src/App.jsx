import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import AssetDetail from './pages/AssetDetail';
import PublicAsset from './pages/PublicAsset';
import ReportIssue from './pages/ReportIssue';
import Issues from './pages/Issues';
import IssueDetail from './pages/IssueDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<Login />} />

        {/* Protected app routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/assets/:id" element={<AssetDetail />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/issues/:id" element={<IssueDetail />} />

        {/* Public (no auth) */}
        <Route path="/public/asset/:slug" element={<PublicAsset />} />
        <Route path="/report/:slug" element={<ReportIssue />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
