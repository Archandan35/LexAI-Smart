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
        <div className="error-boundary">
          <h2 className="error-boundary__title">Error</h2>
          <pre className="error-boundary__message">{this.state.error.message}</pre>
          {this.state.info && (
            <details className="error-boundary__details">
              <summary className="error-boundary__summary">Stack trace</summary>
              <pre className="error-boundary__stack">{this.state.error.stack}</pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
