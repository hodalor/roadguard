import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import DashboardPage from './pages/DashboardPage';
import HazardsPage from './pages/HazardsPage';
import MotoristsPage from './pages/MotoristsPage';
import OverviewPage from './pages/OverviewPage';
import ProvidersPage from './pages/ProvidersPage';
import ContentLibraryPage from './pages/ContentLibraryPage';
import SettingsPage from './pages/SettingsPage';
import SosRequestsPage from './pages/SosRequestsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />}>
          <Route index element={<OverviewPage />} />
          <Route path="motorists" element={<MotoristsPage />} />
          <Route path="sos" element={<SosRequestsPage />} />
          <Route path="providers" element={<ProvidersPage />} />
          <Route path="hazards" element={<HazardsPage />} />
          <Route path="guides" element={<ContentLibraryPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
