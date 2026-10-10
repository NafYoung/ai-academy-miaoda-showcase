// GitHub Pages 不支持单页应用路由：404.html 兜底所有路径；
// 固定页面另外生成入口文件，直接访问时返回 200 而不是 404。
import fs from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve(import.meta.dirname, '..', 'dist');
const html = await fs.readFile(path.join(dist, 'index.html'));
const STATIC_ROUTES = ['courses', 'my-learning', 'submit', 'admin', 'admin/course-management'];

await fs.writeFile(path.join(dist, '404.html'), html);
for (const route of STATIC_ROUTES) {
  await fs.mkdir(path.join(dist, route), { recursive: true });
  await fs.writeFile(path.join(dist, route, 'index.html'), html);
}
console.log(`SPA fallback written: 404.html + ${STATIC_ROUTES.length} route entries`);
