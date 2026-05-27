import React, { useEffect, useMemo, useState } from 'react';

import DetailModal from './DetailModal';
import PageHeader from './PageHeader';

function valueToSearchableText(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).toLowerCase();
}

function renderTableCell(column, record) {
  const value = record[column.key];

  if (column.render) {
    return column.render(value, record);
  }

  if (column.variant === 'status') {
    const statusClass = String(value).toLowerCase().replace(/\s+/g, '-');
    return <span className={`status-badge status-badge--${statusClass}`}>{value}</span>;
  }

  return value;
}

export default function DataTablePage({
  title,
  records,
  columns,
  filters,
  filterAccessor,
  searchFields,
  detailTitle,
  getDetailSections,
  renderDetailFooter,
  notice = null,
  noticeTone = 'info',
  isLoading = false,
  error = null,
}) {
  const [activeFilter, setActiveFilter] = useState(filters[0] ?? 'All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesFilter =
        activeFilter === 'All' || filterAccessor(record) === activeFilter;

      const matchesQuery =
        query.trim() === '' ||
        searchFields.some((field) =>
          valueToSearchableText(record[field]).includes(query.trim().toLowerCase())
        );

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, filterAccessor, query, records, searchFields]);

  useEffect(() => {
    if (!filteredRecords.some((record) => record.id === selectedId)) {
      setSelectedId(filteredRecords[0]?.id ?? null);
    }
  }, [filteredRecords, selectedId]);

  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedId) ?? null;

  function openDetails(recordId) {
    setSelectedId(recordId);
    setIsModalOpen(true);
  }

  return (
    <section className="page-stack">
      <PageHeader title={title} meta={`${filteredRecords.length} records`} />

      {notice ? (
        <div className={`page-notice page-notice--${noticeTone}`}>{notice}</div>
      ) : null}

      <div className="panel panel--table">
        <div className="table-toolbar">
          <div className="filter-group">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`filter-button ${activeFilter === filter ? 'filter-button--active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          <input
            className="table-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search records"
          />
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr
                  key={record.id}
                  className={record.id === selectedId ? 'data-table__row--active' : ''}
                  onClick={() => openDetails(record.id)}
                >
                  {columns.map((column) => (
                    <td key={column.key}>
                      {renderTableCell(column, record)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 ? (
            <div className="empty-state">No records match the current filter.</div>
          ) : null}

          {isLoading ? (
            <div className="empty-state">Loading data...</div>
          ) : null}

          {error ? (
            <div className="empty-state">{error}</div>
          ) : null}
        </div>
      </div>

      {isModalOpen && selectedRecord ? (
        <DetailModal
          title={detailTitle}
          recordId={selectedRecord.id}
          sections={getDetailSections(selectedRecord)}
          footer={renderDetailFooter ? renderDetailFooter(selectedRecord, () => setIsModalOpen(false)) : null}
          onClose={() => setIsModalOpen(false)}
        />
      ) : null}
    </section>
  );
}
