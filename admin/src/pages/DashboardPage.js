import React, { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import { navigationItems } from '../data/systemData';

export default function DashboardPage() {
  const location = useLocation();

  const activeLabel = useMemo(() => {
    return (
      navigationItems.find((item) =>
        item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path)
      )?.label ?? navigationItems[0].label
    );
  }, [location.pathname]);

  const routePath = useMemo(() => {
    return location.pathname === '/' ? '/overview' : location.pathname;
  }, [location.pathname]);

  const metaLabel = useMemo(
    () => routePath.replace('/', '').replace(/-/g, ' ') || 'overview',
    [routePath]
  );

  return (
    <main className="dashboard-shell">
      <Sidebar items={navigationItems} />

      <section className="dashboard-content">
        <div className="content-shell">
          <div className="content-shell__topbar">
            <span className="content-shell__label">RoadGuide Ghana</span>
            <span className="content-shell__section">
              {activeLabel} · {metaLabel}
            </span>
          </div>
          <Outlet />
        </div>
      </section>
    </main>
  );
}
