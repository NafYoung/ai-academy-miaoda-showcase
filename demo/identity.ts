/** 演示身份：没有登录，访客在三个虚构账号之间切换视角。 */
export type DemoRole = 'employee' | 'instructor' | 'admin';

export interface DemoUser {
  userId: string;
  name: string;
  departmentId: string;
  role: DemoRole;
  roleLabel: string;
  roleHint: string;
}

export const DEMO_USERS: Record<DemoRole, DemoUser> = {
  employee: {
    userId: '10001',
    name: '林知夏',
    departmentId: 'od-demo-marketing',
    role: 'employee',
    roleLabel: '员工',
    roleHint: '学习课程、做课后题、投稿',
  },
  instructor: {
    userId: '10002',
    name: '周砚',
    departmentId: 'od-demo-tech',
    role: 'instructor',
    roleLabel: '讲师',
    roleHint: '管理自己上传的课程与题库',
  },
  admin: {
    userId: '10003',
    name: '沈清和',
    departmentId: 'od-demo-hr',
    role: 'admin',
    roleLabel: '管理员',
    roleHint: '审核投稿、发布题库、治理课程',
  },
};

const ROLE_KEY = 'athena-demo:role';

export function getDemoRole(): DemoRole {
  const saved = window.localStorage.getItem(ROLE_KEY);
  return saved === 'instructor' || saved === 'admin' ? saved : 'employee';
}

export function getDemoUser(): DemoUser {
  return DEMO_USERS[getDemoRole()];
}

export function switchDemoRole(role: DemoRole): void {
  window.localStorage.setItem(ROLE_KEY, role);
  window.location.reload();
}

/** 用首字生成头像，避免向第三方头像服务发请求。 */
export function avatarFor(name: string): string {
  const palette = ['#3370ff', '#7c5cff', '#16a34a', '#f59e0b', '#ef4444', '#0ea5e9'];
  const color = palette[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % palette.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="${color}"/><text x="40" y="52" font-size="34" text-anchor="middle" fill="#fff" font-family="sans-serif">${[...name].slice(-2).join('')}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
