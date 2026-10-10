import { ArrowUpRight, BookOpen, FileQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { AcademyCoverImage } from '@/components/AcademyCoverImage';
import type {
  ICourseQuizAdminStatus,
  IManagedCourse,
} from '@shared/api.interface';
import {
  courseStatusClasses,
  quizStatusLabel,
} from './course-management-utils';

interface ManagedCourseCardProps {
  item: IManagedCourse;
  quiz?: ICourseQuizAdminStatus;
}

export default function ManagedCourseCard({
  item,
  quiz,
}: ManagedCourseCardProps) {
  const { course, permissions } = item;
  return (
    <Link
      to={`/admin/course-management/${encodeURIComponent(course.id)}`}
      className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-white bg-white/85 shadow-[0_14px_45px_rgba(30,64,175,0.06)] transition hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(30,64,175,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`管理课程：${course.title || '未命名课程'}`}
    >
      <div className="relative aspect-[16/8] overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-100">
        {course.coverUrl ? (
          <AcademyCoverImage
            src={course.coverUrl}
            alt=""
            className="size-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <BookOpen className="size-12 text-primary/30" />
          </div>
        )}
        <div className="absolute left-4 top-4">
          <Badge
            variant="outline"
            className={`shadow-sm ${courseStatusClasses(course.status)}`}
          >
            {course.status || '状态未知'}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <h2 className="min-w-0 flex-1 text-lg font-black leading-7 text-slate-950 line-clamp-2">
            {course.title || '未命名课程'}
          </h2>
          <ArrowUpRight className="mt-1 size-5 shrink-0 text-slate-400 transition group-hover:text-primary" />
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
          {course.summary || '暂未填写课程简介'}
        </p>
        <p className="mt-3 text-xs text-slate-400">
          {[course.courseSource, course.difficulty]
            .filter(Boolean)
            .join(' · ') || '课程信息待补充'}
        </p>
        <div className="mt-auto pt-5">
          <div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
            <FileQuestion className="size-4 shrink-0 text-primary" />
            {quizStatusLabel(quiz)}
          </div>
          <p className="mt-2 text-xs font-medium text-primary">
            {permissions.canManageLifecycle
              ? '完整课程管理'
              : permissions.canEditContent
                ? '可编辑课程信息与测试题'
                : '讲师权限 · 仅可编辑测试题'}
          </p>
        </div>
      </div>
    </Link>
  );
}
