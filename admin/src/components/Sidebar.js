import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar({ items }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-name">RoadGuide Ghana</span>
      </div>

      <div className="sidebar__scroll">
        <nav className="sidebar__nav" aria-label="Admin sections">
          {items.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
