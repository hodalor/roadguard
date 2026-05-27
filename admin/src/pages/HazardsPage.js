import React, { useCallback, useEffect, useState } from 'react';

import DataTablePage from '../components/DataTablePage';
import { fetchJson, patchJson } from '../services/api';

export default function HazardsPage() {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [noticeTone, setNoticeTone] = useState('info');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadHazards = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetchJson('/hazards?adminView=true');
      setData(Array.isArray(response) ? response : []);
      setError(null);
    } catch (requestError) {
      setData([]);
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHazards();
  }, [loadHazards]);

  async function updateStatus(hazardId, status, closeModal) {
    setIsSaving(true);

    try {
      const response = await patchJson(`/hazards/${hazardId}/status`, { status });
      const nextRecord = response.data;
      setData((current) =>
        current.map((record) => (record.id === hazardId ? nextRecord : record))
      );
      setNotice(
        status === 'active'
          ? 'Hazard activated successfully.'
          : status === 'resolved'
            ? 'Hazard marked as resolved.'
            : 'Hazard moved to under review.'
      );
      setNoticeTone('success');
      setError(null);
      closeModal();
    } catch (requestError) {
      setNotice(requestError.message);
      setNoticeTone('error');
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DataTablePage
      title="Hazards"
      records={data}
      columns={[
        { key: 'reportCode', label: 'Code' },
        { key: 'hazardType', label: 'Hazard' },
        { key: 'location', label: 'Location' },
        { key: 'severity', label: 'Severity', variant: 'status' },
        { key: 'status', label: 'Status', variant: 'status' },
      ]}
      filters={['All', 'Active', 'Under Review', 'Resolved']}
      filterAccessor={(record) => record.status}
      notice={notice}
      noticeTone={noticeTone}
      searchFields={['reportCode', 'hazardType', 'location', 'reporter']}
      detailTitle="Hazard Details"
      isLoading={isLoading}
      error={error}
      getDetailSections={(record) => [
        {
          title: 'Hazard Record',
          items: [
            { label: 'Code', value: record.reportCode },
            { label: 'Hazard', value: record.hazardType },
            { label: 'Location', value: record.location },
            { label: 'Severity', value: record.severity },
            { label: 'Status', value: record.status },
            { label: 'Google Maps', value: record.locationMapUrl || 'Not available' },
          ],
        },
        {
          title: 'Moderation',
          items: [
            { label: 'Reporter', value: record.reporter },
            { label: 'Confirmations', value: String(record.confirmations) },
            { label: 'Reported At', value: record.reportedAt || 'Not available' },
            { label: 'Expires At', value: record.expiresAt || 'Not available' },
          ],
        },
        {
          title: 'Notes',
          items: [
            {
              label: 'Hazard Notes',
              value: record.notes || 'No description provided',
            },
          ],
        },
      ]}
      renderDetailFooter={(record, closeModal) => (
        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => updateStatus(record.id, 'under_review', closeModal)}
            disabled={isSaving || record.status === 'Under Review'}
          >
            {isSaving ? 'Saving...' : 'Move To Review'}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => updateStatus(record.id, 'resolved', closeModal)}
            disabled={isSaving || record.status === 'Resolved'}
          >
            {isSaving ? 'Saving...' : 'Resolve Hazard'}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => updateStatus(record.id, 'active', closeModal)}
            disabled={isSaving || record.status === 'Active'}
          >
            {isSaving ? 'Saving...' : 'Activate Hazard'}
          </button>
        </div>
      )}
    />
  );
}
