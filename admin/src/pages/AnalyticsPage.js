import React from 'react';

import PageHeader from '../components/PageHeader';
import { useApiCollection, useApiResource } from '../hooks/useApiData';
import {
  analytics as fallbackAnalytics,
  hazards as fallbackHazards,
  providers as fallbackProviders,
  sosRequests as fallbackSosRequests,
} from '../data/systemData';

export default function AnalyticsPage() {
  const { data: sosRequests } = useApiCollection('/sos', fallbackSosRequests);
  const { data: providers } = useApiCollection('/providers', fallbackProviders);
  const { data: hazards } = useApiCollection('/hazards', fallbackHazards);
  const { data: analyticsData } = useApiResource('/analytics', fallbackAnalytics);

  return (
    <section className="page-stack">
      <PageHeader title="Analytics" meta="Performance trends" />

      <section className="analytics-grid analytics-grid--wide">
        {analyticsData.metrics.map((item) => (
          <article key={item.label} className="analytics-card">
            <p>{item.label}</p>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel">
          <PageHeader title="Operational Snapshot" meta="Current totals" />
          <div className="detail-grid">
            <div className="detail-item">
              <span>SOS records</span>
              <strong>{sosRequests.length}</strong>
            </div>
            <div className="detail-item">
              <span>Providers tracked</span>
              <strong>{providers.length}</strong>
            </div>
            <div className="detail-item">
              <span>Hazards tracked</span>
              <strong>{hazards.length}</strong>
            </div>
          </div>
        </article>

        <article className="panel">
          <PageHeader title="Insights" meta="Live review" />
          <div className="summary-list">
            {analyticsData.insights.map((item) => (
              <div key={item.label} className="summary-list__item summary-list__item--static">
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.note}</p>
                </div>
                <span className="page-header__meta">{item.value}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}
