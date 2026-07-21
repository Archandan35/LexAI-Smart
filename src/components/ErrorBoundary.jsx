import React from 'react';
import { logger } from '@/utils/logger.js';

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
    logger.error('[ErrorBoundary] componentDidCatch:', error.message);
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, info);
    }
  }

  handleRetry = () => {
    this.setState({ error: null, info: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary" role="alert" aria-live="assertive">
          <h2 className="error-boundary__title">Something went wrong</h2>
          <p className="error-boundary__message">{this.state.error.message}</p>
          <div className="error-boundary__actions">
            <button className="button button--primary" onClick={this.handleRetry}>
              Try again
            </button>
            <button className="button button--ghost" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
          {this.state.info && (
            <details className="error-boundary__details">
              <summary className="error-boundary__summary">Technical details</summary>
              <pre className="error-boundary__stack">{this.state.error.stack}</pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
