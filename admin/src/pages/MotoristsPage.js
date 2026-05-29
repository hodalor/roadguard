import DataTablePage from '../components/DataTablePage';
import { useApiCollection } from '../hooks/useApiData';

export default function MotoristsPage() {
  const { data = [], error, isLoading } = useApiCollection('/motorists', []);

  function renderEmergencyContacts(contacts) {
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return <strong>No emergency contacts saved</strong>;
    }

    return (
      <div className="detail-stack">
        {contacts.map((contact, index) => (
          <div key={`${contact.phoneNumber}-${index + 1}`} className="detail-item">
            <span>{`Contact ${index + 1}`}</span>
            <strong>
              {contact.name} | {contact.phoneNumber} | {contact.relationship}
              {contact.email ? ` | ${contact.email}` : ''}
            </strong>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DataTablePage
      title="Motorists"
      records={data}
      columns={[
        { key: 'fullName', label: 'Name' },
        { key: 'phoneNumber', label: 'Phone' },
        { key: 'address', label: 'Address' },
        { key: 'idType', label: 'ID Type' },
      ]}
      filters={['All']}
      filterAccessor={() => 'All'}
      searchFields={['fullName', 'phoneNumber', 'address', 'idType', 'idNumber', 'email']}
      detailTitle="Motorist Details"
      isLoading={isLoading}
      error={error}
      getDetailSections={(record) => [
        {
          title: 'Profile',
          items: [
            { label: 'Full Name', value: record.fullName },
            { label: 'Phone', value: record.phoneNumber },
            { label: 'Address', value: record.address },
            { label: 'Email', value: record.email || 'Not provided' },
          ],
        },
        {
          title: 'Identity',
          items: [
            { label: 'ID Type', value: record.idType },
            { label: 'ID Number', value: record.idNumber },
            {
              label: 'Profile Image',
              value: record.profileImageData ? 'Uploaded' : 'Missing',
            },
          ],
        },
        {
          title: 'Emergency Contacts',
          items: [
            {
              label: 'Saved Contacts',
              content: renderEmergencyContacts(record.emergencyContacts),
            },
          ],
        },
      ]}
    />
  );
}
