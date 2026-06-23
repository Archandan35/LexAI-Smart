import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 40, maxWidth: 800, margin: '40px auto',
          fontFamily: 'monospace', background: '#fef2f2', borderRadius: 12,
          border: '1px solid #fecaca'
        }}>
          <h2 style={{ color: '#dc2626', margin: '0 0 12px' }}>Error</h2>
          <pre style={{
            background: '#fff', padding: 16, borderRadius: 8,
            border: '1px solid #e5e7eb', overflow: 'auto',
            fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            color: '#374151'
          }}>{this.state.error.message}</pre>
          {this.state.info && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#6b7280' }}>Stack trace</summary>
              <pre style={{
                background: '#fff', padding: 16, borderRadius: 8,
                border: '1px solid #e5e7eb', overflow: 'auto',
                fontSize: 12, lineHeight: 1.5, marginTop: 8, color: '#6b7280'
              }}>{this.state.error.stack}</pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
