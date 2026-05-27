import React from 'react';

import DataTablePage from '../components/DataTablePage';
import { useApiCollection } from '../hooks/useApiData';
import { emergencyContacts as fallbackEmergencyContacts } from '../data/systemData';

export default function ContactsPage() {
  const { data, error, isLoading } = useApiCollection('/contacts', fallbackEmergencyContacts);

  return (
    <DataTablePage
      title="Emergency Contacts"
      records={data}
      columns={[
        { key: 'userName', label: 'User' },
        { key: 'contactName', label: 'Contact' },
        { key: 'relationship', label: 'Relationship' },
        { key: 'method', label: 'Notify Via' },
        { key: 'status', label: 'Status', variant: 'status' },
      ]}
      filters={['All', 'Active', 'Muted']}
      filterAccessor={(record) => record.status}
      searchFields={['userName', 'contactName', 'relationship', 'phone']}
      detailTitle="Contact Details"
      isLoading={isLoading}
      error={error}
      getDetailSections={(record) => [
        {
          title: 'Contact Record',
          items: [
            { label: 'User', value: record.userName },
            { label: 'Contact', value: record.contactName },
            { label: 'Relationship', value: record.relationship },
            { label: 'Phone', value: record.phone },
            { label: 'Method', value: record.method },
          ],
        },
        {
          title: 'Notification Status',
          items: [
            { label: 'Current Status', value: record.status },
            { label: 'Last Alert At', value: record.lastAlertAt },
          ],
        },
        {
          title: 'Notes',
          items: [{ label: 'Delivery Notes', value: record.notes }],
        },
      ]}
    />
  );
}
