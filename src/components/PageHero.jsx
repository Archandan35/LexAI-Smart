import Icon from '@/components/Icon.jsx';

export default function PageHero({ icon, title, subtitle, actions, watermark, isMobile, style }) {
  const wm = watermark ?? icon;
  return (
    <div className="bench-types__hero" style={{ ...(isMobile ? { margin: '0 0 20px' } : {}), ...style }}>
      <div className="bench-types__hero-icon"><Icon name={icon} size={34} /></div>
      <div className="bench-types__hero-text">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        <div className="bench-types__hero-accent" />
        {isMobile && actions && <div style={{ marginTop: '12px' }}>{actions}</div>}
      </div>
      {!isMobile && actions && <div style={{ marginLeft: 'auto' }}>{actions}</div>}
      <Icon name={wm} className="bench-types__hero-watermark bench-types__watermark-icon" />
    </div>
  );
}
