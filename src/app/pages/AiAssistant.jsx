import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import { aiService } from '@/services/aiService.js';

export default function AiAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const send = async () => {
    if (!input.trim() || thinking) return;
    const userMsg = { role: 'user', content: input.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    try {
      const reply = await aiService.ask(userMsg.content);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply || 'No response.', timestamp: new Date().toISOString() }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, an error occurred.', timestamp: new Date().toISOString() }]);
    } finally {
      setThinking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div>
      <PageHeader icon="cpu" title="AI Assistant" subtitle="Your intelligent legal AI assistant." />
      <Card title="Chat" className="ai-chat-card">
        <div className="ai-chat">
          {messages.length === 0 && !thinking && (
            <div className="empty-state">
              <p>No conversation yet. Ask me anything about your cases.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`ai-message ai-message--${m.role}`}>
              <div className="ai-message__role">{m.role === 'user' ? 'You' : 'AI'}</div>
              <div className="ai-message__content">{m.content}</div>
            </div>
          ))}
          {thinking && (
            <div className="ai-message ai-message--assistant">
              <div className="ai-message__role">AI</div>
              <div className="ai-message__content">Thinking...</div>
            </div>
          )}
        </div>
        <div className="ai-input-row">
          <textarea className="input ai-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type your message..." rows={2} />
          <Button onClick={send} disabled={thinking || !input.trim()}>{thinking ? '...' : 'Send'}</Button>
        </div>
      </Card>
    </div>
  );
}
