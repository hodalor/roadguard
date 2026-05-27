import React from 'react';

export default function PageHeader({ title, meta }) {
  return (
    <header className="page-header">
      <div>
        <h2 className="page-header__title">{title}</h2>
      </div>
      {meta ? <span className="page-header__meta">{meta}</span> : null}
    </header>
  );
}
