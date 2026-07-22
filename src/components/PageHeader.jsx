import { memo } from 'react';
import Icon from './Icon.jsx';

export default memo(function PageHeader({ icon, title, subtitle, actions }) {
  return (
    <div className="page-header">
      {icon && (
        <div className="stat-card__icon page-header__icon">
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
});
