import React from 'react';

import DataTablePage from '../components/DataTablePage';
import { useApiCollection } from '../hooks/useApiData';

export default function AdminUsersPage() {
  const { data = [], error, isLoading } = useApiCollection('/admin/users', []);

  return (
    <DataTablePage
      title="Admin Users"
      records={data}
      columns={[
        { key: 'fullName', label: 'Name' },
        { key: 'phoneNumber', label: 'Phone' },
        { key: 'email', label: 'Email' },
        {
          key: 'isVerified',
          label: 'Status',
          variant: 'status',
          render: (value) => (value ? 'Verified' : 'Pending'),
        },
      ]}
      filters={['All']}
      filterAccessor={() => 'All'}
      searchFields={['fullName', 'phoneNumber', 'email', 'address']}
      detailTitle="Admin User Details"
      isLoading={isLoading}
      error={error}
      getDetailSections={(record) => [
        {
          title: 'Account',
          items: [
            { label: 'Full Name', value: record.fullName },
            { label: 'Phone', value: record.phoneNumber },
            { label: 'Email', value: record.email || 'Not provided' },
            { label: 'Role', value: record.role || 'admin' },
          ],
        },
        {
          title: 'Verification',
          items: [
            { label: 'Verified', value: record.isVerified ? 'Yes' : 'No' },
            { label: 'Address', value: record.address || 'Not provided' },
            { label: 'Created At', value: record.createdAt || 'Not available' },
          ],
        },
      ]}
    />
  );
}
