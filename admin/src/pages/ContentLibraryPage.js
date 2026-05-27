import React, { useCallback, useEffect, useState } from 'react';

import DataTablePage from '../components/DataTablePage';
import FormModal from '../components/FormModal';
import { fetchJson, patchJson, postJson } from '../services/api';

const initialForm = {
  category: '',
  title: '',
  content: '',
  version: '1.0.0',
  language: 'English',
  notes: '',
  publishStatus: 'draft',
};

export default function ContentLibraryPage() {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [noticeTone, setNoticeTone] = useState('info');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const loadGuides = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetchJson('/content?adminView=true');
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
    loadGuides();
  }, [loadGuides]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await postJson('/content', form);
      setData((current) => [response.data, ...current]);
      setForm(initialForm);
      setNotice('Emergency guide saved successfully.');
      setNoticeTone('success');
      setError(null);
      setIsCreateModalOpen(false);
    } catch (requestError) {
      setNotice(requestError.message);
      setNoticeTone('error');
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function updatePublishStatus(contentId, publishStatus, closeModal) {
    setIsSaving(true);

    try {
      const response = await patchJson(`/content/${contentId}/status`, { publishStatus });
      const nextRecord = response.data;
      setData((current) =>
        current.map((record) => (record.id === contentId ? nextRecord : record))
      );
      setNotice(
        publishStatus === 'published'
          ? 'Emergency guide published successfully.'
          : 'Emergency guide saved as draft.'
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
    <section className="page-stack">
      <div className="panel">
        <div className="settings-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Add Emergency Guide
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={loadGuides}
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
      </div>

      <DataTablePage
        title="Emergency Guides"
        records={data}
        columns={[
          { key: 'contentCode', label: 'Code' },
          { key: 'title', label: 'Title' },
          { key: 'category', label: 'Category' },
          { key: 'version', label: 'Version' },
          { key: 'publishStatus', label: 'Status', variant: 'status' },
        ]}
        filters={['All', 'Published', 'Draft']}
        filterAccessor={(record) => record.publishStatus}
        searchFields={['contentCode', 'title', 'category', 'language']}
        detailTitle="Emergency Guide Details"
        notice={notice}
        noticeTone={noticeTone}
        isLoading={isLoading}
        error={error}
        getDetailSections={(record) => [
          {
            title: 'Content Record',
            items: [
              { label: 'Code', value: record.contentCode },
              { label: 'Title', value: record.title },
              { label: 'Category', value: record.category },
              { label: 'Version', value: record.version },
              { label: 'Language', value: record.language },
            ],
          },
          {
            title: 'Publishing',
            items: [
              { label: 'Status', value: record.publishStatus },
              { label: 'Updated At', value: record.updatedAt || 'Not available' },
              { label: 'Last Sync', value: record.lastSync || 'Not available' },
            ],
          },
          {
            title: 'Guide Content',
            items: [
              { label: 'Content', value: record.content || 'No guide content available' },
              { label: 'Editorial Notes', value: record.notes || 'No notes' },
            ],
          },
        ]}
        renderDetailFooter={(record, closeModal) => (
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => updatePublishStatus(record.id, 'draft', closeModal)}
              disabled={isSaving || record.publishStatus === 'Draft'}
            >
              {isSaving ? 'Saving...' : 'Save As Draft'}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => updatePublishStatus(record.id, 'published', closeModal)}
              disabled={isSaving || record.publishStatus === 'Published'}
            >
              {isSaving ? 'Saving...' : 'Publish Guide'}
            </button>
          </div>
        )}
      />

      {isCreateModalOpen ? (
        <FormModal title="Create Emergency Guide" onClose={() => setIsCreateModalOpen(false)}>
          <form className="settings-form" onSubmit={handleSubmit}>
            <div className="detail-grid">
              <label className="settings-field">
                <span>Category</span>
                <input
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  placeholder="First Aid"
                />
              </label>
              <label className="settings-field">
                <span>Title</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Accident Response Steps"
                />
              </label>
              <label className="settings-field">
                <span>Version</span>
                <input
                  value={form.version}
                  onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))}
                />
              </label>
              <label className="settings-field">
                <span>Language</span>
                <input
                  value={form.language}
                  onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}
                />
              </label>
            </div>
            <label className="settings-field">
              <span>Guide Content</span>
              <textarea
                rows="5"
                value={form.content}
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                placeholder="Step-by-step emergency guide text"
              />
            </label>
            <label className="settings-field">
              <span>Editorial Notes</span>
              <textarea
                rows="3"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Internal notes for admins"
              />
            </label>
            <div className="settings-actions">
              <button type="submit" className="primary-button" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Create Emergency Guide'}
              </button>
            </div>
          </form>
        </FormModal>
      ) : null}
    </section>
  );
}
