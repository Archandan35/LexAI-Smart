import Icon from './Icon.jsx';

export default function Button({
  children, variant = 'primary', size, icon, loading, className = '', disabled, ...rest
}) {
  return (
    <button
      className={`btn btn--${variant} ${size === 'sm' ? 'btn--sm' : ''} ${className}`}
      disabled={loading || disabled}
      {...rest}
    >
      {loading ? <span className="spinner" style={{ width: 15, height: 15 }} /> : icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
    </button>
  );
}
