
const TONE = {
  Active: 'green', Scheduled: 'navy', Adjourned: 'amber', Disposed: 'grey',
  'Part Heard': 'amber', 'Reserved for Orders': 'navy', verified: 'green',
  not_found: 'red', unverified: 'amber', pending: 'grey',
};

export default function Badge({ children, tone, dot }) {
  const cls = tone || TONE[children] || 'grey';
  return (
    <span className={`badge badge--${cls}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}
