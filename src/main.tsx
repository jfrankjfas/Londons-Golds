import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Guard against cross-origin third-party script errors (e.g. from embedded widgets, TradingView, or CDN analytics)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = String(event.message || '');
    const filename = String(event.filename || '');
    if (
      msg === 'Script error.' ||
      !filename ||
      msg.includes('querySelector') ||
      msg.includes('reading \'querySelector\'') ||
      filename.includes('tradingview') ||
      filename.includes('s3.tradingview.com')
    ) {
      // Benign third-party external widget script error
      event.preventDefault();
      return true;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reasonMsg = String(event.reason?.message || event.reason || '');
    if (reasonMsg.includes('querySelector') || reasonMsg.includes('tradingview')) {
      event.preventDefault();
    }
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

