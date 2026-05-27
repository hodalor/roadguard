import React, { useCallback, useEffect, useState } from 'react';

import DataTablePage from '../components/DataTablePage';
import { fetchJson, patchJson } from '../services/api';

export default function ProvidersPage() {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [noticeTone, setNoticeTone] = useState('info');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingApproval, setIsUpdatingApproval] = useState(false);

  const loadProviders = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetchJson('/providers');
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
    loadProviders();
  }, [loadProviders]);

  async function updateApproval(providerId, approvalStatus, closeModal) {
    setIsUpdatingApproval(true);

    try {
      const response = await patchJson(`/providers/${providerId}/approval`, {
        approvalStatus,
      });
      const nextRecord = response.data;
      setData((current) =>
        current.map((record) => (record.id === providerId ? nextRecord : record))
      );
      setError(null);
      setNotice(
        approvalStatus === 'approved'
          ? 'Provider approved successfully.'
          : approvalStatus === 'rejected'
            ? 'Provider rejected successfully.'
            : 'Provider status updated successfully.'
      );
      setNoticeTone('success');
      closeModal();
    } catch (requestError) {
      setError(requestError.message);
      setNotice(requestError.message);
      setNoticeTone('error');
    } finally {
      setIsUpdatingApproval(false);
    }
  }

  function renderImagePreview(images, altPrefix) {
    if (!Array.isArray(images) || images.length === 0) {
      return <strong>No image uploaded</strong>;
    }

    return (
      <div className="detail-image-preview">
        {images.map((image, index) => (
          <img key={`${altPrefix}-${index + 1}`} src={image} alt={`${altPrefix} ${index + 1}`} />
        ))}
      </div>
    );
  }

  return (
    <DataTablePage
      title="Providers"
      records={data}
      columns={[
        { key: 'providerCode', label: 'Code' },
        { key: 'fullName', label: 'Owner' },
        { key: 'businessName', label: 'Business' },
        { key: 'serviceType', label: 'Service Type' },
        { key: 'coverage', label: 'Service Area' },
        { key: 'availabilityStatus', label: 'Availability', variant: 'status' },
      ]}
      filters={['All', 'Pending Only', 'Approved', 'Rejected', 'Available', 'Busy', 'Offline']}
      filterAccessor={(record) => {
        if (record.verificationStatus === 'Pending') {
          return 'Pending Only';
        }

        if (record.verificationStatus === 'Rejected') {
          return 'Rejected';
        }

        if (record.verificationStatus === 'Approved') {
          return 'Approved';
        }

        return record.availabilityStatus || 'All';
      }}
      notice={notice}
      noticeTone={noticeTone}
      searchFields={['providerCode', 'fullName', 'businessName', 'serviceType', 'coverage', 'phone']}
      detailTitle="Provider Details"
      isLoading={isLoading}
      error={error}
      getDetailSections={(record) => [
        {
          title: 'Personal Profile',
          items: [
            { label: 'Code', value: record.providerCode },
            { label: 'Full Name', value: record.fullName },
            { label: 'Phone', value: record.phone },
            { label: 'Email', value: record.email || 'Not provided' },
            { label: 'ID Type', value: record.idType },
            { label: 'ID Number', value: record.idNumber },
            { label: 'Profile Image', value: record.profileImageReady },
            {
              label: 'Profile Preview',
              content: renderImagePreview(
                record.profileImageData ? [record.profileImageData] : [],
                'Profile image'
              ),
            },
          ],
        },
        {
          title: 'Business',
          items: [
            { label: 'Business', value: record.businessName },
            { label: 'Service Type', value: record.serviceType },
            { label: 'Address', value: record.address },
            { label: 'Service Area', value: record.coverage },
            { label: 'Shop Images', value: `${record.shopImagesCount}` },
            {
              label: 'Shop Image Preview',
              content: renderImagePreview(record.shopImages, 'Shop image'),
            },
          ],
        },
        {
          title: 'Status',
          items: [
            { label: 'Availability', value: record.availabilityStatus },
            { label: 'Verification', value: record.verificationStatus },
            { label: 'Rating', value: record.rating },
            { label: 'Current Location', value: record.currentLocationLabel || 'Not fetched' },
            { label: 'Google Maps', value: record.currentLocationMapUrl || 'Not available' },
          ],
        },
      ]}
      renderDetailFooter={(record, closeModal) => (
        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => updateApproval(record.id, 'rejected', closeModal)}
            disabled={isUpdatingApproval || record.verificationStatus === 'Rejected'}
          >
            {isUpdatingApproval ? 'Saving...' : 'Reject Provider'}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => updateApproval(record.id, 'approved', closeModal)}
            disabled={isUpdatingApproval || record.verificationStatus === 'Approved'}
          >
            {isUpdatingApproval ? 'Saving...' : 'Approve Provider'}
          </button>
        </div>
      )}
    />
  );
}
