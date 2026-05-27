import React, { useMemo, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import AdminLoginPage from './pages/AdminLoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import HazardsPage from './pages/HazardsPage';
import MotoristsPage from './pages/MotoristsPage';
import OverviewPage from './pages/OverviewPage';
import ProvidersPage from './pages/ProvidersPage';
import ContentLibraryPage from './pages/ContentLibraryPage';
import SettingsPage from './pages/SettingsPage';
import SosRequestsPage from './pages/SosRequestsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import { clearAdminSession, loadAdminSession, saveAdminSession } from './services/adminAuth';

export default function App() {
  const [adminSession, setAdminSession] = useState(() => loadAdminSession());

  const adminUser = useMemo(() => adminSession?.admin ?? null, [adminSession]);

  function handleLogin(session) {
    saveAdminSession(session);
    setAdminSession(session);
  }

  function handleLogout() {
    clearAdminSession();
    setAdminSession(null);
  }

  return (
    <BrowserRouter>
      {adminSession ? (
        <Routes>
          <Route
            path="/"
            element={<DashboardPage adminUser={adminUser} onLogout={handleLogout} />}
          >
            <Route index element={<OverviewPage />} />
            <Route path="admin-users" element={<AdminUsersPage />} />
            <Route path="motorists" element={<MotoristsPage />} />
            <Route path="sos" element={<SosRequestsPage />} />
            <Route path="providers" element={<ProvidersPage />} />
            <Route path="hazards" element={<HazardsPage />} />
            <Route path="guides" element={<ContentLibraryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
          </Route>
        </Routes>
      ) : (
        <Routes>
          <Route path="*" element={<AdminLoginPage onLogin={handleLogin} />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
