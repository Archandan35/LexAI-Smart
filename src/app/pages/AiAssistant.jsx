import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';

const EXAMPLE_CHAT = [
  { q: 'Summarise Section 138 of the Negotiable Instruments Act, 1881.', p: 'Section 138 NI Act deals with the dishonour of cheques for insufficiency of funds. If a cheque is returned unpaid due to insufficient funds or exceeds the arranged limit, the drawer is deemed to have committed an offence, punishable with imprisonment up to two years, a fine up to twice the cheque amount, or both.' },
  { q: 'Draft a recovery suit for unpaid dues.', p: 'A recovery suit under Order XXXVII CPC is suitable for liquidated demands. The plaint must mention the precise amount, the cause of action, limitation period, and a statement that the defendant has no probable defence. Attach the invoice, demand notice, and proof of acknowledgement.' },
];

export default function AiAssistant() {
  return (
    <div className="fade-in">
      <PageHeader icon="bolt" title="AI Assistant" subtitle="Your intelligent legal AI assistant." />

      <Card>
        <div className="ai-assistant__chat-area">
          {EXAMPLE_CHAT.map((item, i) => (
            <div key={i} className="qa-card">
              <div className="qa-card__q">{item.q}</div>
              <div className="qa-card__p">{item.p}</div>
            </div>
          ))}
        </div>
        <div className="input-row">
          <input className="input" placeholder="Ask the AI assistant…" />
          <button className="btn btn--primary"><Icon name="bolt" size={16} /> Send</button>
        </div>
      </Card>
    </div>
  );
}
