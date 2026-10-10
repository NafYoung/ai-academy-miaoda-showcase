import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 演示站部署在 GitHub Pages 子路径；本地预览可用 DEMO_BASE=/ 覆盖。
const base = process.env.DEMO_BASE ?? '/ai-academy-miaoda-showcase/';
const r = (p: string): string => path.resolve(__dirname, p);

// 需要连接妙搭/飞书平台的运行时模块全部换成演示替身；样式与纯界面能力仍用原包。
const shimmed: Record<string, string> = {
  '@lark-apaas/client-toolkit/components/AppContainer': 'demo/shims/toolkit/AppContainer.tsx',
  '@lark-apaas/client-toolkit/components/ErrorRender': 'demo/shims/toolkit/ErrorRender.tsx',
  '@lark-apaas/client-toolkit/components/UniversalLink': 'demo/shims/toolkit/UniversalLink.tsx',
  '@lark-apaas/client-toolkit/components/ActiveLink': 'demo/shims/toolkit/ActiveLink.tsx',
  '@lark-apaas/client-toolkit/auth': 'demo/shims/toolkit/auth.ts',
  '@lark-apaas/client-toolkit/utils/getAxiosForBackend': 'demo/shims/toolkit/getAxiosForBackend.ts',
  '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile': 'demo/shims/toolkit/useCurrentUserProfile.ts',
  '@lark-apaas/client-toolkit/dataloom': 'demo/shims/toolkit/dataloom.ts',
  '@lark-apaas/client-toolkit/tools/storage': 'demo/shims/toolkit/storage.ts',
  '@lark-apaas/client-toolkit/tools/services': 'demo/shims/toolkit/services.ts',
  '@lark-apaas/client-toolkit/utils/getEnv': 'demo/shims/toolkit/getEnv.ts',
  '@lark-apaas/client-toolkit/utils/resolveAppUrl': 'demo/shims/toolkit/resolveAppUrl.ts',
  '@lark-apaas/client-toolkit/logger': 'demo/shims/toolkit/logger.ts',
  '@lark-apaas/aily-web-sdk': 'demo/shims/aily.ts',
  // 两个内嵌第三方内容的组件换成跳转卡片，演示站不加载外部脚本。
  '@/components/ContentEmbed': 'demo/overrides/ContentEmbed.tsx',
  '@/components/CourseDocumentReader': 'demo/overrides/CourseDocumentReader.tsx',
};

export default defineConfig({
  base,
  publicDir: 'demo/public',
  plugins: [react()],
  define: {
    'process.env.CLIENT_BASE_PATH': JSON.stringify(base),
  },
  resolve: {
    alias: [
      ...Object.entries(shimmed).map(([find, file]) => ({
        find: new RegExp(`^${find.replace(/[/.]/g, '\\$&')}$`),
        replacement: r(file),
      })),
      // 工具包主题样式用 @/ 指向它自己的 lib 目录。
      { find: /^@\/inspector\.dev\.css$/, replacement: r('node_modules/@lark-apaas/client-toolkit/lib/inspector.dev.css') },
      { find: /^@\//, replacement: `${r('client/src')}/` },
      { find: /^@client\//, replacement: `${r('client')}/` },
      { find: /^@shared\//, replacement: `${r('shared')}/` },
      { find: /^@demo\//, replacement: `${r('demo')}/` },
    ],
  },
});
