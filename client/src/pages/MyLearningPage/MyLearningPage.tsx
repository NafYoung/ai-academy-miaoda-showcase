import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  CircleDot,
  Clock3,
  LibraryBig,
} from 'lucide-react';
import { academy, platform } from '@/api';
import CourseDataSourceNotice, {
  isCourseCatalogUnavailable,
} from '@/components/CourseDataSourceNotice';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type {
  IAcademyCourseDataSourceStatus,
  ILearningAssignment,
} from '@shared/api.interface';
import {
  getLearningDeadlineView,
  isLearningAssignmentCompleted,
  sortRequiredLearningAssignments,
  type LearningDeadlineFields,
} from '@/utils/learning-deadline';

type LearningCourseItem = ILearningAssignment & LearningDeadlineFields;

interface LearningCourseRowProps {
  item: LearningCourseItem;
  onOpen: (courseId: string) => void;
}

function LearningCourseRow({ item, onOpen }: LearningCourseRowProps) {
  const completed = isLearningAssignmentCompleted(item);
  const notStarted = item.status === 'not_started';
  const deadline = getLearningDeadlineView(item);
  const deadlineMissing = item.requirementType === 'required' && !deadline;

  return (
    <button
      type="button"
      onClick={() => onOpen(item.courseId)}
      className="w-full rounded-[22px] border border-white bg-white/74 p-5 text-left shadow-[0_14px_42px_rgba(30,64,175,0.06)] backdrop-blur-xl transition-all hover:-translate-y-0.5"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div
          className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
            completed
              ? 'bg-emerald-50 text-emerald-600'
              : notStarted
                ? 'bg-slate-100 text-slate-500'
                : 'bg-blue-50 text-primary'
          }`}
        >
          {completed ? (
            <CheckCircle2 className="size-5" />
          ) : notStarted ? (
            <CircleDot className="size-5" />
          ) : (
            <BookOpen className="size-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate font-black text-slate-950">
                {item.courseTitle}
              </h3>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${
                  item.requirementType === 'required'
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-sky-50 text-sky-700'
                }`}
              >
                {item.requirementType === 'required' ? '必修' : '选修'}
              </span>
            </div>
            <span className="shrink-0 text-xs font-bold text-slate-500">
              {item.progressPercent}%
            </span>
          </div>
          <Progress value={item.progressPercent} className="mt-3 h-1.5" />
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Clock3 className="size-3.5" />
            {notStarted
              ? '尚未开始，打开课程即可记录进度'
              : completed
                ? '已完成课程学习'
                : `最近学习：${
                    item.lastActivityAt
                      ? new Date(item.lastActivityAt).toLocaleString('zh-CN')
                      : '刚刚'
                  }`}
          </p>
          {(deadline || deadlineMissing) && (
            <div
              className={`mt-3 rounded-xl px-3 py-2 text-xs ${
                deadline?.tone === 'danger'
                  ? 'bg-rose-50 text-rose-700'
                  : deadline?.tone === 'warning'
                    ? 'bg-amber-50 text-amber-700'
                    : deadline?.tone === 'positive'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-50 text-slate-500'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">
                  学习期限：{deadline?.statusLabel ?? '截止信息待同步'}
                </span>
                {deadline?.deadlineLabel && (
                  <span>截止 {deadline.deadlineLabel}</span>
                )}
              </div>
              {deadline?.startedLabel && (
                <p className="mt-1 text-[11px] opacity-80">
                  起算时间：{deadline.startedLabel}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default function MyLearningPage() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<ILearningAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [courseDataSource, setCourseDataSource] =
    useState<IAcademyCourseDataSourceStatus | null>(null);
  const [courseRequestFailed, setCourseRequestFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    setCourseRequestFailed(false);

    Promise.allSettled([
      academy.getCoursesWithStatus(),
      platform.getMyLearningAssignments(),
    ])
      .then(([courseResult, assignmentResult]) => {
        if (cancelled) return;
        if (courseResult.status === 'fulfilled') {
          setCourseDataSource(courseResult.value.dataSource);
        } else {
          setCourseDataSource(null);
          setCourseRequestFailed(true);
        }
        if (assignmentResult.status === 'fulfilled') {
          setAssignments(assignmentResult.value);
        } else {
          setAssignments([]);
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const catalogUnavailable = isCourseCatalogUnavailable(
    courseDataSource,
    courseRequestFailed,
  );

  const { requiredCourses, electiveCourses } = useMemo(() => {
    if (catalogUnavailable || loadFailed) {
      return { requiredCourses: [], electiveCourses: [] };
    }
    const required = sortRequiredLearningAssignments(
      assignments.filter((item) => item.requirementType === 'required'),
    );
    const electives = assignments
      .filter((item) => item.requirementType === 'elective')
      .sort(
        (left, right) =>
          Date.parse(right.lastActivityAt || '1970-01-01') -
          Date.parse(left.lastActivityAt || '1970-01-01'),
      );

    return { requiredCourses: required, electiveCourses: electives };
  }, [assignments, catalogUnavailable, loadFailed]);

  const requiredCompleted = requiredCourses.filter((item) =>
    isLearningAssignmentCompleted(item),
  ).length;
  const requiredPending = requiredCourses.length - requiredCompleted;
  const totalCompleted = assignments.filter((item) =>
    isLearningAssignmentCompleted(item),
  ).length;

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-10 pb-24 md:px-6 md:py-14">
      <header>
        <p className="text-xs font-black tracking-[0.12em] text-primary">
          MY LEARNING
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.055em] text-slate-950 md:text-5xl">
          我的学习
        </h1>
        <p className="mt-4 text-base leading-8 text-slate-600">
          已有必修课在首次登录后有 30 天完成；新增必修课各有 30
          天学习时间。选修课可按需报名。
        </p>
      </header>

      <CourseDataSourceNotice
        dataSource={courseDataSource}
        requestFailed={courseRequestFailed}
        className="mt-8"
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [
            catalogUnavailable || loadFailed
              ? '—'
              : `${requiredCompleted}/${requiredCourses.length}`,
            '必修已完成',
            CheckCircle2,
          ],
          [
            catalogUnavailable || loadFailed ? '—' : requiredPending,
            '必修待完成',
            CircleDot,
          ],
          [
            catalogUnavailable || loadFailed ? '—' : electiveCourses.length,
            '已报名选修',
            LibraryBig,
          ],
          [
            catalogUnavailable || loadFailed ? '—' : totalCompleted,
            '全部已完成',
            BookOpen,
          ],
        ].map(([value, label, Icon]) => {
          const MetricIcon = Icon as typeof BookOpen;
          return (
            <div
              key={String(label)}
              className="rounded-[22px] border border-white bg-white/72 p-5 shadow-[0_16px_45px_rgba(30,64,175,0.07)] backdrop-blur-xl"
            >
              <MetricIcon className="size-5 text-primary" />
              <p className="mt-4 text-3xl font-black text-slate-950">
                {String(value)}
              </p>
              <p className="mt-1 text-sm text-slate-500">{String(label)}</p>
            </div>
          );
        })}
      </section>

      {loadFailed && (
        <div className="mt-8 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          学习清单暂时加载失败，请刷新页面后重试。
        </div>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">我的必修</h2>
            <p className="mt-1 text-sm text-slate-500">
              适用于你的必修课程会自动加入，请优先完成即将到期的课程。
            </p>
          </div>
          {!loading && (
            <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
              {catalogUnavailable || loadFailed
                ? '数量暂不可用'
                : `${requiredPending} 门待完成`}
            </span>
          )}
        </div>
        {loading ? (
          <div className="mt-4 h-36 animate-pulse rounded-3xl bg-white/60" />
        ) : requiredCourses.length > 0 ? (
          <div className="mt-4 space-y-3">
            {requiredCourses.map((item) => (
              <LearningCourseRow
                key={item.courseId}
                item={item}
                onOpen={(courseId) => navigate(`/courses/${courseId}`)}
              />
            ))}
          </div>
        ) : !loadFailed && !catalogUnavailable ? (
          <div className="mt-4 rounded-[26px] border border-white bg-white/70 p-10 text-center">
            <CheckCircle2 className="mx-auto size-8 text-slate-300" />
            <h3 className="mt-3 font-black text-slate-900">暂无必修课程</h3>
            <p className="mt-2 text-sm text-slate-500">
              课程目录新增官方课程或你所在部门的内部课程后，会自动显示在这里。
            </p>
          </div>
        ) : null}
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">我的选修</h2>
            <p className="mt-1 text-sm text-slate-500">
              你主动报名的选修课程会保留在这里，报名后平台才开始记录学习情况。
            </p>
          </div>
          {!loading && (
            <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
              {catalogUnavailable || loadFailed
                ? '数量暂不可用'
                : `${electiveCourses.length} 门`}
            </span>
          )}
        </div>
        {loading ? (
          <div className="mt-4 h-36 animate-pulse rounded-3xl bg-white/60" />
        ) : electiveCourses.length > 0 ? (
          <div className="mt-4 space-y-3">
            {electiveCourses.map((item) => (
              <LearningCourseRow
                key={item.courseId}
                item={item}
                onOpen={(courseId) => navigate(`/courses/${courseId}`)}
              />
            ))}
          </div>
        ) : !loadFailed && !catalogUnavailable ? (
          <div className="mt-4 rounded-[26px] border border-white bg-white/70 p-12 text-center">
            <LibraryBig className="mx-auto size-9 text-slate-300" />
            <h3 className="mt-4 font-black text-slate-900">
              还没有报名选修课程
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              从课程中心进入课程详情并点击“报名课程”，即可加入这里。
            </p>
            <Button
              onClick={() => navigate('/courses?requirement=elective')}
              className="mt-5 rounded-full"
            >
              浏览选修课
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
