import { useNavigate } from 'react-router-dom';
import { BookOpen, FileText, PlayCircle, UserRound } from 'lucide-react';
import { UserDisplay } from '@/components/business-ui/user-display';
import { AcademyCoverImage } from '@/components/AcademyCoverImage';
import type {
  CourseRequirementType,
  IAcademyCourse,
} from '@shared/api.interface';
import {
  displayedRequirementLabel,
  displayedRequirementType,
} from '@/pages/CourseManagementPage/course-admin-settings-utils';

interface PlatformCourseCardProps {
  course: IAcademyCourse;
  index?: number;
  personalRequirementType?: CourseRequirementType;
}

function hasUrl(value: string): boolean {
  return Boolean(value?.trim());
}

export default function PlatformCourseCard({
  course,
  index = 0,
  personalRequirementType,
}: PlatformCourseCardProps) {
  const navigate = useNavigate();
  const hasVideo = hasUrl(course.videoUrl);
  const hasDoc = hasUrl(course.docUrl);
  const displayRequirementType = displayedRequirementType(
    course,
    personalRequirementType,
  );
  const requirementLabel = displayedRequirementLabel(
    course,
    personalRequirementType,
  );

  return (
    <button
      type="button"
      onClick={() => navigate(`/courses/${course.id}`)}
      className="group w-full text-left rounded-[24px] border border-white/90 bg-white/72 backdrop-blur-xl overflow-hidden shadow-[0_18px_48px_rgba(30,64,175,0.08)] hover:-translate-y-1 hover:shadow-[0_26px_65px_rgba(30,64,175,0.14)] transition-all duration-300"
      aria-label={`打开课程：${course.title}`}
    >
      <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-blue-100 via-violet-100 to-emerald-100">
        {course.coverUrl ? (
          <AcademyCoverImage
            src={course.coverUrl}
            alt={course.title}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="size-full grid place-items-center">
            <div
              className={`size-14 rounded-2xl grid place-items-center text-white shadow-xl ${
                index % 3 === 0
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  : index % 3 === 1
                    ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
                    : 'bg-gradient-to-br from-emerald-500 to-cyan-500'
              }`}
            >
              <BookOpen className="size-6" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {hasVideo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/92 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-blue-700">
              <PlayCircle className="size-3" />
              妙记视频
            </span>
          )}
          {hasDoc && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/92 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-violet-700">
              <FileText className="size-3" />
              课程文档
            </span>
          )}
        </div>
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-black shadow-sm backdrop-blur ${
            displayRequirementType === 'required'
              ? 'bg-rose-50/95 text-rose-700'
              : 'bg-sky-50/95 text-sky-700'
          }`}
        >
          {requirementLabel}
        </span>
        {course.courseSource && (
          <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/65 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-white">
            {course.courseSource === '内部' ? '内部资料' : '外部资料'}
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 text-[11px] font-bold text-primary">
          {course.courseType || '课程资料'}
          {course.difficulty && (
            <>
              <span className="size-1 rounded-full bg-slate-300" />
              <span className="text-slate-500">{course.difficulty}</span>
            </>
          )}
        </div>
        <h3 className="mt-2 text-base font-black tracking-[-0.025em] text-slate-950 line-clamp-2 min-h-11 leading-[1.4]">
          {course.title || '未命名课程'}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500 line-clamp-2 min-h-12">
          {course.summary || '课程介绍正在补充中'}
        </p>
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div
            className="min-w-0 text-xs text-slate-500"
            onClick={(event) => event.stopPropagation()}
          >
            {course.instructorUserIds.length > 0 ? (
              <UserDisplay value={course.instructorUserIds} size="small" />
            ) : (
              <span className="inline-flex items-center gap-1.5 truncate">
                <UserRound className="size-3.5 shrink-0" />
                {course.instructor || '内部讲师'}
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-primary shrink-0">
            开始学习
          </span>
        </div>
      </div>
    </button>
  );
}
