import { memo } from 'react';

export default memo(function Spinner({ label = 'Loading…' }) {
  return (
    <div className="loading-block">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
});
