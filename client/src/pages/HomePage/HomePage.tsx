import { useEffect, useMemo, useState } from 'react';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  FileText,
  PlayCircle,
  Send,
  Sparkles,
} from 'lucide-react';
import { academy, platform } from '@/api';
import CourseDataSourceNotice, {
  isCourseCatalogUnavailable,
} from '@/components/CourseDataSourceNotice';
import { shouldShowCourseDataSourceNotice } from '@/components/course-data-source-notice-state';
import PlatformCourseCard from '@/components/PlatformCourseCard';
import { Button } from '@/components/ui/button';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { selectHomeFeaturedCourses } from './home-course-utils';
import type {
  IAcademyCourse,
  IAcademyCourseDataSourceStatus,
  ILearningProgress,
} from '@shared/api.interface';

export default function HomePage() {
  const navigate = useNavigate();
  const user = useCurrentUserProfile();
  const [courses, setCourses] = useState<IAcademyCourse[]>([]);
  const [learning, setLearning] = useState<ILearningProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseDataSource, setCourseDataSource] =
    useState<IAcademyCourseDataSourceStatus | null>(null);
  const [courseRequestFailed, setCourseRequestFailed] = useState(false);
  const refreshKey = useAutoRefresh();

  useEffect(() => {
    let cancelled = false;
    setCourseRequestFailed(false);
    const requests: Array<Promise<void>> = [
      academy
        .getCoursesWithStatus()
        .then((result) => {
          if (!cancelled) {
            setCourses(result.courses);
            setCourseDataSource(result.dataSource);
          }
        })
        .catch(() => {
          if (!cancelled) setCourseRequestFailed(true);
        }),
      platform.getMyLearning().then((progressList: ILearningProgress[]) => {
        if (!cancelled) setLearning(progressList);
      }),
    ];

    void Promise.allSettled(requests).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const featuredCourses = useMemo(
    () => selectHomeFeaturedCourses(courses),
    [courses],
  );
  const sourceThemes = useMemo(
    () => [
      {
        key: 'internal',
        title: '公司内部资料',
        description: '公司同事沉淀的培训、经验与实战资料',
        count: courses.filter((course) => course.courseSource === '内部')
          .length,
        icon: Building2,
        iconClassName: 'bg-emerald-500',
      },
      {
        key: 'external',
        title: '外部资料',
        description: '飞书官方课程与其他外部优质学习资料',
        count: courses.filter((course) => course.courseSource !== '内部')
          .length,
        icon: BookOpen,
        iconClassName: 'bg-blue-500',
      },
    ],
    [courses],
  );
  const completedCount = learning.filter(
    (item) => item.status === 'completed',
  ).length;
  const resourceCount = courses.reduce(
    (count, course) =>
      count + Number(Boolean(course.docUrl)) + Number(Boolean(course.videoUrl)),
    0,
  );
  const catalogUnavailable = isCourseCatalogUnavailable(
    courseDataSource,
    courseRequestFailed && courses.length === 0,
  );
  const hasCourseDataSourceNotice = shouldShowCourseDataSourceNotice(
    courseDataSource,
    courseRequestFailed,
  );

  return (
    <div className="pb-20">
      <section className="mx-auto max-w-[1380px] px-4 md:px-6 pt-8 md:pt-12">
        <div className="relative overflow-hidden rounded-[32px] border border-white/90 bg-white/68 backdrop-blur-2xl shadow-[0_28px_80px_rgba(51,112,255,0.12)] px-6 py-10 md:px-12 md:py-14">
          <div className="absolute -right-24 -top-28 size-80 rounded-full bg-blue-400/15 blur-3xl" />
          <div className="absolute right-20 -bottom-36 size-72 rounded-full bg-emerald-300/18 blur-3xl" />
          <div className="relative grid lg:grid-cols-[1fr_420px] gap-10 items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold tracking-[0.08em] text-blue-700">
                <Sparkles className="size-3.5" />
                ATHENA
              </p>
              <h1 className="mt-6 text-4xl md:text-6xl font-black tracking-[-0.065em] leading-[1.05] text-slate-950">
                {user.name ? `${user.name}，` : ''}今天想学点什么？
              </h1>
              <p className="mt-5 max-w-2xl text-base md:text-lg leading-8 text-slate-600">
                用一套统一课程库连接全公司的经验：文档便于查阅，飞书妙记便于回看，学习记录帮助我们持续优化内容。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate('/courses')}
                  className="rounded-full h-12 px-6 shadow-lg shadow-blue-500/20"
                >
                  浏览全部课程
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/submit')}
                  className="rounded-full h-12 px-6 bg-white/75"
                >
                  <Send className="size-4" />
                  投稿一门课程
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                [
                  catalogUnavailable ? '—' : courses.length,
                  '已上线课程',
                  BookOpen,
                ],
                [
                  catalogUnavailable ? '—' : resourceCount,
                  '文档与视频',
                  FileText,
                ],
                [completedCount, '我已完成', CheckCircle2],
              ].map(([value, label, Icon]) => {
                const MetricIcon = Icon as typeof BookOpen;
                return (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-white bg-white/74 p-4 shadow-sm"
                  >
                    <MetricIcon className="size-4 text-primary" />
                    <p className="mt-4 text-2xl font-black text-slate-950">
                      {String(value)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {String(label)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {hasCourseDataSourceNotice && (
        <section className="mx-auto max-w-[1380px] px-4 md:px-6 pt-6">
          <CourseDataSourceNotice
            dataSource={courseDataSource}
            requestFailed={courseRequestFailed}
          />
        </section>
      )}

      <section className="mx-auto max-w-[1380px] px-4 md:px-6 pt-12">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-primary">
              LEARNING PATHS
            </p>
            <h2 className="mt-2 text-2xl md:text-3xl font-black tracking-[-0.045em] text-slate-950">
              按资料来源进入学习
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/courses')}
            className="text-sm font-bold text-primary inline-flex items-center gap-1"
          >
            查看全部 <ArrowRight className="size-4" />
          </button>
        </div>

        {catalogUnavailable ? null : courses.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {sourceThemes.map((theme) => {
              const ThemeIcon = theme.icon;
              return (
                <button
                  key={theme.key}
                  type="button"
                  onClick={() => navigate(`/courses?source=${theme.key}`)}
                  className="rounded-[24px] border border-white/90 bg-white/70 backdrop-blur-xl p-5 text-left shadow-[0_18px_48px_rgba(30,64,175,0.07)] hover:-translate-y-1 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`size-11 rounded-2xl grid place-items-center text-white ${theme.iconClassName}`}
                    >
                      <ThemeIcon className="size-5" />
                    </div>
                    <ArrowRight className="size-4 text-slate-400" />
                  </div>
                  <h3 className="mt-5 text-base font-black text-slate-950">
                    {theme.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 line-clamp-2 min-h-12">
                    {theme.description} · {theme.count} 门课程
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl bg-white/70 border border-white p-10 text-center text-slate-500">
            学习资料正在整理中
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1380px] px-4 md:px-6 pt-14">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-primary">
              NEW & RECOMMENDED
            </p>
            <h2 className="mt-2 text-2xl md:text-3xl font-black tracking-[-0.045em] text-slate-950">
              最近值得学
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              最近更新的 6 门已上线课程；全部课程仍可在课程中心查看。
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[4/3] rounded-[24px] bg-white/60 animate-pulse"
              />
            ))}
          </div>
        ) : catalogUnavailable ? null : featuredCourses.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredCourses.map((course, index) => (
              <PlatformCourseCard
                key={course.id}
                course={course}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-white/70 border border-white p-12 text-center">
            <BookOpen className="size-8 text-slate-400 mx-auto" />
            <p className="mt-3 text-sm text-slate-500">
              正式课程库暂时没有可展示内容
            </p>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1380px] px-4 md:px-6 pt-14">
        <div className="rounded-[30px] bg-slate-950 text-white px-6 py-8 md:px-10 md:py-10 grid md:grid-cols-[1fr_auto] gap-8 items-center overflow-hidden relative">
          <div className="absolute right-0 top-0 size-52 rounded-full bg-blue-500/25 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-bold tracking-[0.12em] text-blue-300">
              BUILD TOGETHER
            </p>
            <h2 className="mt-3 text-2xl md:text-3xl font-black tracking-[-0.04em]">
              你所在部门也有值得分享的经验？
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              通过投稿页面提交课程资料。你不需要接触正式多维表格，平台管理员审核后再统一进入课程库。
            </p>
          </div>
          <Button
            onClick={() => navigate('/submit')}
            className="relative rounded-full bg-white text-slate-950 hover:bg-blue-50 h-11 px-6"
          >
            <Send className="size-4" />
            发起课程投稿
          </Button>
        </div>
      </section>
    </div>
  );
}
