import React, { useEffect } from 'react';

import PageHeader from './PageHeader';

export default function DetailModal({ title, recordId, sections, onClose, footer = null }) {
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card__header">
          <PageHeader title={title} meta={recordId} />
          <button type="button" className="modal-close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="detail-sections">
          {sections.map((section) => (
            <section key={section.title} className="detail-section">
              <h3>{section.title}</h3>
              <div className="detail-grid">
                {section.items.map((item) => (
                  <div key={item.label} className="detail-item">
                    <span>{item.label}</span>
                    {item.content ? item.content : <strong>{item.value}</strong>}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {footer ? <div className="modal-card__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
