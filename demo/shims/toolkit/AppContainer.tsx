import type { ReactNode } from 'react';

/** 原组件负责连接妙搭运行时；演示版只保留子树。 */
export function AppContainer({ children }: { children?: ReactNode; defaultTheme?: string }) {
  return <>{children}</>;
}
