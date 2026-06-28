
export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="loading-block">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}
