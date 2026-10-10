import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminNavigation from './AdminNavigation';
import { useManagementSession } from './AdminRoute';
import AdminDashboardPage from '../pages/AdminDashboardPage/AdminDashboardPage';
import CourseManagementPage from '../pages/CourseManagementPage/CourseManagementPage';

/** Keep visited tabs mounted only within the current management session. */
export default function AdminLayout() {
  const { pathname } = useLocation();
  const session = useManagementSession();
  const isAdmin = session?.isAdmin === true;
  const activePath = pathname.replace(/\/+$/u, '');
  const overview = activePath === '/admin';
  const courses = activePath === '/admin/course-management';
  const [visited, setVisited] = useState({ overview, courses });

  useEffect(() => {
    setVisited((previous) => ({
      overview: previous.overview || overview,
      courses: previous.courses || courses,
    }));
  }, [overview, courses]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12" data-admin-shell>
      <header>
        <p className="text-xs font-black tracking-[0.12em] text-primary">ADMIN CONSOLE</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
          {isAdmin ? '平台管理后台' : '课程工作区'}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          {isAdmin ? '审核课程投稿，管理课程内容，了解公司学习情况。' : '维护你有管理权限的课程与测试题。'}
        </p>
      </header>
      <div className="mt-7"><AdminNavigation showAdminDashboard={isAdmin} /></div>
      <div className="mt-7">
        {(overview || courses) && isAdmin && (visited.overview || overview) && (
          <div hidden={!overview}><AdminDashboardPage /></div>
        )}
        {overview && !isAdmin && <p role="alert">没有管理权限：后台总览仅对平台管理员开放。</p>}
        {(overview || courses) && (visited.courses || courses) && <div hidden={!courses}><CourseManagementPage /></div>}
        <Outlet />
      </div>
    </div>
  );
}
