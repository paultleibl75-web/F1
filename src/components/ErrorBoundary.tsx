import React from 'react';

interface State { hasError: boolean; message: string; }

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ErrorBoundary] Caught render error:', error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] componentDidCatch:', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0, background: '#04070a',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
          color: 'var(--text-primary, #fff)', fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>⚠ RENDER ERROR</div>
          <div style={{ fontSize: 13, opacity: 0.6, maxWidth: 480, textAlign: 'center' }}>{this.state.message}</div>
          <button
            onClick={this.reset}
            style={{
              marginTop: 8, padding: '10px 24px', borderRadius: 20,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >↩ RETRY</button>
        </div>
      );
    }
    return this.props.children;
  }
}
