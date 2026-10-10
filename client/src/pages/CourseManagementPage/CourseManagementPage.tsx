import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CircleAlert,
  RefreshCw,
  Search,
} from 'lucide-react';
import { courseManagement, platform } from '@/api';
import { useManagementSession } from '@/components/AdminRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ICourseQuizAdminStatus,
  IManagedCourse,
} from '@shared/api.interface';
import ManagedCourseCard from './ManagedCourseCard';
import { managementErrorMessage } from './course-management-utils';

export default function CourseManagementPage() {
  const [courses, setCourses] = useState<IManagedCourse[]>([]);
  const [quizzes, setQuizzes] = useState<ICourseQuizAdminStatus[]>([]);
  const isAdmin = useManagementSession()?.isAdmin === true;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizError, setQuizError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const requestRef = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    const request = ++requestRef.current;
    setLoading(true);
    setError('');
    setQuizError('');
    const [inventory, quizResult] = await Promise.allSettled([
      courseManagement.getCourses(),
      platform.getAdminCourseQuizzes(),
    ]);
    if (request !== requestRef.current) return;
    if (inventory.status === 'fulfilled') {
      setCourses(inventory.value.courses);
    } else {
      setCourses([]);
      setError(managementErrorMessage(inventory.reason));
    }
    if (quizResult.status === 'fulfilled') setQuizzes(quizResult.value);
    else {
      setQuizzes([]);
      setQuizError(
        '测试题状态暂时无法读取，课程信息仍可正常管理。可刷新重试，或进入课程后单独加载测试题。',
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    return () => {
      requestRef.current += 1;
    };
  }, [load]);

  const quizMap = useMemo(
    () => new Map(quizzes.map((quiz) => [quiz.courseId, quiz])),
    [quizzes],
  );
  const statuses = useMemo(
    () =>
      [...new Set(courses.map(({ course }) => course.status))].filter(Boolean),
    [courses],
  );
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return courses.filter(
      ({ course }) =>
        (status === 'all' || course.status === status) &&
        (!keyword ||
          [course.title, course.summary, course.instructor]
            .join(' ')
            .toLowerCase()
            .includes(keyword)),
    );
  }, [courses, search, status]);

  return (
    <div>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            课程管理
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
            {isAdmin
              ? '在一个地方管理全部课程：更新课程信息、维护测试题，以及控制课程上架与归档。'
              : '这里仅显示你有管理权限的课程。上传者可维护课程信息和测试题，讲师保留所授课程的测试题权限。'}
          </p>
        </div>
        <Button
          variant="outline"
          className="shrink-0 rounded-full bg-white/80"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} />
          {loading ? '加载中…' : '刷新清单'}
        </Button>
      </header>

      <section className="mt-7" aria-label="可管理课程">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-slate-600">
            {isAdmin ? '全部课程' : '我的可管理课程'}
            <span className="ml-2 font-normal text-slate-400">
              {loading ? '读取中' : courses.length + ' 门'}
            </span>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索课程、简介或讲师"
                aria-label="搜索可管理课程"
                className="h-10 rounded-full bg-white/85 pl-10"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger
                aria-label="按课程状态筛选"
                className="h-10 min-w-32 rounded-full bg-white/85"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {statuses.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div role="status" className="grid min-h-72 place-items-center">
            <RefreshCw className="size-8 animate-spin text-primary" />
            <span className="sr-only">正在加载可管理课程</span>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="mt-5 rounded-[24px] border border-rose-100 bg-white/85 p-10 text-center"
          >
            <CircleAlert className="mx-auto size-8 text-rose-500" />
            <h2 className="mt-4 font-black text-slate-950">课程清单加载失败</h2>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
            <Button
              variant="outline"
              className="mt-5 rounded-full"
              onClick={() => void load()}
            >
              重新加载
            </Button>
          </div>
        ) : (
          <>
            {quizError && (
              <p
                role="status"
                className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-800"
              >
                {quizError}
              </p>
            )}
            {filtered.length ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item) => (
                  <ManagedCourseCard
                    key={item.course.id}
                    item={item}
                    quiz={quizMap.get(item.course.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-white bg-white/75 p-12 text-center">
                <BookOpen className="mx-auto size-9 text-slate-300" />
                <h2 className="mt-4 font-black text-slate-700">
                  {courses.length ? '没有匹配的课程' : '暂无可管理的正式课程'}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {courses.length
                    ? '试试其他关键词，或切换课程状态。'
                    : '课程投稿尚未同步为正式课程时，请继续在投稿入口维护。'}
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
