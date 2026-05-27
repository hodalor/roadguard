import React from 'react';

import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import { useApiCollection } from '../hooks/useApiData';
import { dashboardStats, overviewActivities } from '../data/systemData';

export default function OverviewPage() {
  const { data: sosRequests = [] } = useApiCollection('/sos', []);
  const { data: providers = [] } = useApiCollection('/providers', []);
  const { data: motorists = [] } = useApiCollection('/motorists', []);
  const { data: services = [] } = useApiCollection('/settings/service-catalog', []);

  const dynamicStats = [
    { ...dashboardStats[0], value: String(sosRequests.length) },
    {
      ...dashboardStats[1],
      value: String(
        providers.filter((provider) => provider.availabilityStatus === 'Available').length
      ),
    },
    { ...dashboardStats[2], value: String(motorists.length) },
    { ...dashboardStats[3], value: String(services.length) },
  ];

  return (
    <section className="page-stack">
      <PageHeader title="Overview" meta="System summary" />

      <section className="stats-grid stats-grid--compact">
        {dynamicStats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </section>

      <section className="content-grid">
        <article className="panel">
          <PageHeader title="Recent SOS Activity" meta={`${sosRequests.length} open items`} />
          <div className="summary-list">
            {sosRequests.slice(0, 3).map((request) => (
              <button key={request.id} type="button" className="summary-list__item">
                <div>
                  <strong>{request.motorist || request.requesterName}</strong>
                  <p>
                    {request.emergencyType} at {request.location}
                  </p>
                </div>
                <span className={`status-badge status-badge--${request.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {request.status}
                </span>
              </button>
            ))}

            {sosRequests.length === 0 ? (
              <div className="empty-state">No SOS requests in the database yet.</div>
            ) : null}
          </div>
        </article>

        <article className="panel">
          <PageHeader title="Provider Readiness" meta={`${providers.length} providers`} />
          <div className="summary-list">
            {providers.slice(0, 4).map((provider) => (
              <button key={provider.id} type="button" className="summary-list__item">
                <div>
                  <strong>{provider.businessName}</strong>
                  <p>{provider.coverage}</p>
                </div>
                <span className={`status-badge status-badge--${provider.availabilityStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                  {provider.availabilityStatus}
                </span>
              </button>
            ))}

            {providers.length === 0 ? (
              <div className="empty-state">No providers have registered yet.</div>
            ) : null}
          </div>
        </article>
      </section>

      <article className="panel">
        <PageHeader title="Operational Notes" meta="Today" />
        <ul className="feature-list">
          {overviewActivities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
