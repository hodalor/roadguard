import React, { useEffect, useMemo, useState } from 'react';

import FormModal from '../components/FormModal';
import PageHeader from '../components/PageHeader';
import { fetchJson, patchJson, postJson } from '../services/api';

const tabs = [
  { id: 'content', label: 'Content' },
  { id: 'system', label: 'System' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('content');
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
  });

  async function loadServices() {
    setIsLoading(true);
    try {
      const response = await fetchJson('/settings/service-catalog');
      setServices(Array.isArray(response) ? response : []);
      setError(null);
    } catch (requestError) {
      setServices([]);
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await postJson('/settings/service-catalog', form);
      setForm({ name: '', description: '' });
      setServices((current) => [response.data, ...current]);
      setError(null);
      setIsCreateModalOpen(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleService(service) {
    try {
      const response = await patchJson(`/settings/service-catalog/${service.id}`, {
        isActive: !service.isActive,
      });
      setServices((current) =>
        current.map((item) => (item.id === service.id ? response.data : item))
      );
      setError(null);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const activeServices = useMemo(
    () => services.filter((service) => service.isActive).length,
    [services]
  );

  return (
    <section className="page-stack">
      <PageHeader title="Settings" meta={`${services.length} provider services`} />

      <div className="panel settings-panel">
        <div className="settings-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`settings-tab ${activeTab === tab.id ? 'settings-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'content' ? (
          <div className="settings-stack">
            <div className="settings-summary">
              <div className="detail-item">
                <span>Total Services</span>
                <strong>{services.length}</strong>
              </div>
              <div className="detail-item">
                <span>Active Services</span>
                <strong>{activeServices}</strong>
              </div>
            </div>

            <div className="settings-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => setIsCreateModalOpen(true)}
              >
                Add Service
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={loadServices}
                disabled={isLoading}
              >
                Refresh
              </button>
            </div>

            {error ? <div className="empty-state">{error}</div> : null}

            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td>{service.name}</td>
                      <td>{service.slug}</td>
                      <td>
                        <span
                          className={`status-badge status-badge--${service.status.toLowerCase()}`}
                        >
                          {service.status}
                        </span>
                      </td>
                      <td>{service.description || 'No description'}</td>
                      <td>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => toggleService(service)}
                        >
                          {service.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!isLoading && services.length === 0 ? (
                <div className="empty-state">
                  No provider services exist yet. Create them here and the mobile app will
                  load them dynamically.
                </div>
              ) : null}

              {isLoading ? <div className="empty-state">Loading services...</div> : null}
            </div>
          </div>
        ) : (
          <div className="settings-stack">
            <div className="detail-grid">
              <div className="detail-item">
                <span>Database</span>
                <strong>MongoDB Atlas is used for admin, providers, motorists, and SOS data.</strong>
              </div>
              <div className="detail-item">
                <span>Provider Catalog</span>
                <strong>Services created under Content control provider onboarding options.</strong>
              </div>
              <div className="detail-item">
                <span>Mobile Sync</span>
                <strong>Motorist and provider forms now depend on these live service records.</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {isCreateModalOpen ? (
        <FormModal title="Create Service" onClose={() => setIsCreateModalOpen(false)}>
          <form className="settings-form" onSubmit={handleSubmit}>
            <label className="settings-field">
              <span>Service Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Mechanic, towing, car electrician"
                required
              />
            </label>

            <label className="settings-field">
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows="4"
                placeholder="Optional notes for this service"
              />
            </label>

            <div className="settings-actions">
              <button type="submit" className="primary-button" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Create Service'}
              </button>
            </div>
          </form>
        </FormModal>
      ) : null}
    </section>
  );
}
