import React from 'react';

import DataTablePage from '../components/DataTablePage';
import { useApiCollection } from '../hooks/useApiData';
import { emergencyServices as fallbackEmergencyServices } from '../data/systemData';

export default function ServicesPage() {
  const { data, error, isLoading } = useApiCollection('/services', fallbackEmergencyServices);

  return (
    <DataTablePage
      title="Emergency Services"
      records={data}
      columns={[
        { key: 'serviceCode', label: 'Code' },
        { key: 'name', label: 'Service' },
        { key: 'type', label: 'Type' },
        { key: 'coverage', label: 'Coverage' },
        { key: 'status', label: 'Status', variant: 'status' },
      ]}
      filters={['All', 'Connected', 'Standby']}
      filterAccessor={(record) => record.status}
      searchFields={['serviceCode', 'name', 'type', 'coverage', 'contactLine']}
      detailTitle="Service Details"
      isLoading={isLoading}
      error={error}
      getDetailSections={(record) => [
        {
          title: 'Service Record',
          items: [
            { label: 'Code', value: record.serviceCode },
            { label: 'Service', value: record.name },
            { label: 'Type', value: record.type },
            { label: 'Coverage', value: record.coverage },
            { label: 'Hotline', value: record.contactLine },
          ],
        },
        {
          title: 'Dispatch Status',
          items: [
            { label: 'Channel', value: record.dispatchChannel },
            { label: 'Status', value: record.status },
            { label: 'Readiness', value: record.responseReadiness },
            { label: 'Last Updated', value: record.lastUpdated },
          ],
        },
        {
          title: 'Notes',
          items: [{ label: 'Coordination Notes', value: record.notes }],
        },
      ]}
    />
  );
}
