import { memo } from 'react';
import Icon from './Icon.jsx';

export default memo(function EmptyState({ icon = 'file', title = 'Nothing here yet.', hint, action }) {
  return (
    <div className="empty">
      <div className="empty__icon"><Icon name={icon} size={26} /></div>
      <div className="empty__title">{title}</div>
      {hint && <div className="empty__hint">{hint}</div>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
});
