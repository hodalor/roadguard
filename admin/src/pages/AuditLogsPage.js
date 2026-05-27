import React from 'react';

import DataTablePage from '../components/DataTablePage';
import { useApiCollection } from '../hooks/useApiData';

function stringifyMetadata(value) {
  if (!value) {
    return 'Not available';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch (_error) {
    return String(value);
  }
}

export default function AuditLogsPage() {
  const { data = [], error, isLoading } = useApiCollection('/audit-logs', []);

  return (
    <DataTablePage
      title="Audit Logs"
      records={data}
      columns={[
        { key: 'createdAt', label: 'Time' },
        { key: 'level', label: 'Level', variant: 'status' },
        { key: 'category', label: 'Category', variant: 'status' },
        { key: 'action', label: 'Action' },
        { key: 'message', label: 'Message' },
      ]}
      filters={['All', 'error', 'warning', 'info']}
      filterAccessor={(record) => record.level}
      searchFields={['action', 'message', 'category', 'phoneNumber', 'endpoint']}
      detailTitle="Audit Log Details"
      isLoading={isLoading}
      error={error}
      getDetailSections={(record) => [
        {
          title: 'Log Summary',
          items: [
            { label: 'Time', value: record.createdAt || 'Not available' },
            { label: 'Level', value: record.level || 'Not available' },
            { label: 'Category', value: record.category || 'Not available' },
            { label: 'Action', value: record.action || 'Not available' },
            { label: 'Message', value: record.message || 'Not available' },
          ],
        },
        {
          title: 'Actor',
          items: [
            { label: 'Actor Type', value: record.actorType || 'Not available' },
            { label: 'Actor ID', value: record.actorId || 'Not available' },
            { label: 'Phone', value: record.phoneNumber || 'Not available' },
            { label: 'Endpoint', value: record.endpoint || 'Not available' },
          ],
        },
        {
          title: 'Technical Detail',
          items: [
            { label: 'Detail', value: record.detail || 'No technical detail recorded' },
            { label: 'Metadata', value: stringifyMetadata(record.metadata) },
          ],
        },
      ]}
    />
  );
}
