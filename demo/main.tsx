import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AppContainer } from '@lark-apaas/client-toolkit/components/AppContainer';
import { ErrorRender } from '@lark-apaas/client-toolkit/components/ErrorRender';

import RoutesComponent from '../client/src/app.tsx';
import '../client/src/index.css';
import { Toaster } from '@client/src/components/ui/sonner';
import { DemoBar } from './DemoBar';
import './demo.css';

// 与原入口一致，只多挂一个演示控制条。
const CLIENT_BASE_PATH = process.env.CLIENT_BASE_PATH || '/';

const queryClient = new QueryClient();

const MainApp = () => (
  <QueryClientProvider client={queryClient}>
  <BrowserRouter basename={CLIENT_BASE_PATH}>
    <AppContainer defaultTheme="light">
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <ErrorRender error={error as Error} resetErrorBoundary={resetErrorBoundary} />
        )}
      >
        <RoutesComponent />
        {createPortal(<Toaster />, document.body)}
        {createPortal(<DemoBar />, document.body)}
      </ErrorBoundary>
    </AppContainer>
  </BrowserRouter>
  </QueryClientProvider>
);

createRoot(document.getElementById('root')!).render(<MainApp />);
