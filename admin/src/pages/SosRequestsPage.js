import React from 'react';

import DataTablePage from '../components/DataTablePage';
import { useApiCollection } from '../hooks/useApiData';

export default function SosRequestsPage() {
  const { data = [], error, isLoading } = useApiCollection('/sos', []);

  return (
    <DataTablePage
      title="SOS Requests"
      records={data}
      columns={[
        { key: 'ticket', label: 'Ticket' },
        { key: 'motorist', label: 'Motorist' },
        { key: 'requester', label: 'Requester Type' },
        { key: 'emergencyType', label: 'Emergency' },
        { key: 'location', label: 'Location' },
        { key: 'status', label: 'Status', variant: 'status' },
      ]}
      filters={['All', 'Awaiting Provider', 'Accepted By Provider', 'Rejected By Provider', 'Resolved', 'Cancelled']}
      filterAccessor={(record) => record.status}
      searchFields={['ticket', 'motorist', 'emergencyType', 'location', 'assignedProvider']}
      detailTitle="SOS Request Details"
      isLoading={isLoading}
      error={error}
      getDetailSections={(record) => [
        {
          title: 'Incident',
          items: [
            { label: 'Ticket', value: record.ticket },
            { label: 'Motorist', value: record.motorist },
            { label: 'Requester Type', value: record.requester },
            { label: 'Emergency', value: record.emergencyType },
            { label: 'Requested Service', value: record.requiredServiceType },
            { label: 'Location', value: record.location },
          ],
        },
        {
          title: 'Response',
          items: [
            { label: 'Status', value: record.status },
            { label: 'Assigned Provider', value: record.assignedProvider },
            { label: 'Requester Phone', value: record.requesterPhoneNumber || 'Not available' },
            { label: 'Service Id', value: record.requiredServiceId || 'Not available' },
          ],
        },
        {
          title: 'Notes',
          items: [
            { label: 'Created At', value: record.createdAt },
            { label: 'Request Notes', value: record.notes || 'No notes' },
          ],
        },
      ]}
    />
  );
}
