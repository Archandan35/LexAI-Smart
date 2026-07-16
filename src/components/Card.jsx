
export default function Card({ title, sub, actions, children, hover = false, noPad = false, className = '', bodyClass = '' }) {
  return (
    <section className={`card ${hover ? 'card--hover' : ''} ${noPad ? 'card--no-pad' : ''} ${className}`}>
      {(title || actions) && (
        <header className="card__head">
          <div>
            {title && <div className="card__title">{title}</div>}
            {sub && <div className="card__sub">{sub}</div>}
          </div>
          {actions && <div className="card__spacer" />}
          {actions}
        </header>
      )}
      <div className={`card__body ${noPad ? 'card__body--no-pad' : ''} ${bodyClass}`}>{children}</div>
    </section>
  );
}
