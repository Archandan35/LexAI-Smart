import React from 'react';
import Icon from './Icon.jsx';

export default function PageHeader({ icon, title, subtitle, actions }) {
  return (
    <div className="page-header">
      {icon && (
        <div className="stat-card__icon" style={{ margin: 0, width: 48, height: 48 }}>
          <Icon name={icon} size={22} />
        </div>
      )}
      <div className="page-header__text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
