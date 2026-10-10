import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { userQueries } from '@/components/business-ui/api/users/queries';
import { useCourseSearchInput } from './useCourseSearchInput';
import { BookOpen, Search, SlidersHorizontal } from 'lucide-react';
import { academy, platform } from '@/api';
import CourseDataSourceNotice, {
  isCourseCatalogUnavailable,
} from '@/components/CourseDataSourceNotice';
import PlatformCourseCard from '@/components/PlatformCourseCard';
import { displayedRequirementType } from '../CourseManagementPage/course-admin-settings-utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  matchesCourseTopic,
  normalizeCourseTopics,
} from '@shared/course-topics';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  CourseRequirementType,
  IAcademyCourse,
  IAcademyCourseDataSourceStatus,
} from '@shared/api.interface';

const ALL = 'all';
type CourseFilterParam = 'search' | 'source' | 'requirement' | 'topic';

export default function CourseCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<IAcademyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] =
    useState<IAcademyCourseDataSourceStatus | null>(null);
  const [requestFailed, setRequestFailed] = useState(false);
  const [personalRequirements, setPersonalRequirements] = useState<
    Record<string, CourseRequirementType>
  >({});
  const [personalRequirementsLoaded, setPersonalRequirementsLoaded] =
    useState(false);
  const search: string = searchParams.get('search') ?? '';
  const sourceParam: string = searchParams.get('source') ?? '';
  const source: string = sourceParam
    ? sourceParam === 'internal'
      ? 'internal'
      : 'external'
    : ALL;
  const requirement: string = searchParams.get('requirement') ?? ALL;
  const topic: string = searchParams.get('topic')?.trim() ?? '';
  const topics: string[] = useMemo(
    () =>
      [
        ...new Set(
          courses.flatMap((course: IAcademyCourse) =>
            normalizeCourseTopics(course.topics),
          ),
        ),
      ].sort((left: string, right: string) =>
        left.localeCompare(right, 'zh-CN'),
      ),
    [courses],
  );
  const [difficulty, setDifficulty] = useState(ALL);
  const refreshKey = useAutoRefresh();
  const instructorBatches = useMemo(() => {
    const ids: string[] = [
      ...new Set(courses.flatMap((course) => course.instructorUserIds)),
    ].sort();
    const batches: string[][] = [];
    for (let start = 0; start < ids.length; start += 100)
      batches.push(ids.slice(start, start + 100));
    return batches;
  }, [courses]);
  const instructorQueries = useQueries({
    queries: instructorBatches.map((ids) => userQueries.byIds(ids)),
  });
  const instructorNames: Record<string, string> = {};
  for (const query of instructorQueries) {
    for (const [id, user] of Object.entries(
      query.data?.data?.userInfoMap ?? {},
    )) {
      instructorNames[id] = Object.values(user.name)
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    }
  }

  useEffect(() => {
    let cancelled = false;
    platform
      .getMyLearningAssignments()
      .then((assignments) => {
        if (cancelled) return;
        setPersonalRequirements(
          Object.fromEntries(
            assignments.map((assignment) => [
              assignment.courseId,
              assignment.requirementType,
            ]),
          ),
        );
        setPersonalRequirementsLoaded(true);
      })
      .catch(() => {
        // Retain the last successful requirements during a background failure.
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setRequestFailed(false);
    academy
      .getCoursesWithStatus()
      .then((result) => {
        if (!cancelled) {
          setCourses(result.courses);
          setDataSource(result.dataSource);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRequestFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const updateFilterParam = (key: CourseFilterParam, value: string): void => {
    setSearchParams(
      (currentParams: URLSearchParams) => {
        const nextParams: URLSearchParams = new URLSearchParams(currentParams);
        const normalizedValue: string = value.trim();
        if (normalizedValue && (key === 'topic' || normalizedValue !== ALL)) {
          nextParams.set(key, normalizedValue);
        } else {
          nextParams.delete(key);
        }
        return nextParams;
      },
      { replace: true },
    );
  };
  const searchInput = useCourseSearchInput(search, (value) =>
    updateFilterParam('search', value),
  );

  const filteredCourses = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesSearch =
        !keyword ||
        course.title.toLowerCase().includes(keyword) ||
        course.summary.toLowerCase().includes(keyword) ||
        course.instructor.toLowerCase().includes(keyword) ||
        course.instructorUserIds.some((id) =>
          instructorNames[id]?.includes(keyword),
        ) ||
        course.courseSource.toLowerCase().includes(keyword) ||
        course.tags.some((tag) => tag.toLowerCase().includes(keyword));
      const matchesSource =
        source === ALL ||
        (source === 'internal' && course.courseSource === '内部') ||
        (source === 'external' && course.courseSource !== '内部');
      const personalRequirement = displayedRequirementType(
        course,
        personalRequirements[course.id],
      );
      const matchesRequirement =
        requirement === ALL || personalRequirement === requirement;
      const matchesDifficulty =
        difficulty === ALL || course.difficulty === difficulty;
      return (
        matchesSearch &&
        matchesCourseTopic(course.topics, topic) &&
        matchesSource &&
        matchesRequirement &&
        matchesDifficulty
      );
    });
  }, [
    courses,
    instructorNames,
    difficulty,
    personalRequirements,
    requirement,
    search,
    source,
    topic,
  ]);
  const catalogUnavailable = isCourseCatalogUnavailable(
    dataSource,
    requestFailed && courses.length === 0,
  );

  return (
    <div className="mx-auto max-w-[1380px] px-4 md:px-6 py-10 md:py-14 pb-24">
      <header className="max-w-3xl">
        <p className="text-xs font-black tracking-[0.12em] text-primary">
          COURSE LIBRARY
        </p>
        <h1 className="mt-3 text-3xl md:text-5xl font-black tracking-[-0.055em] text-slate-950">
          课程中心
        </h1>
        <p className="mt-4 text-base leading-8 text-slate-600">
          从正式课程多维表格实时读取，按内部与外部资料来源浏览，并按你的部门显示个人修读要求。
        </p>
      </header>

      <CourseDataSourceNotice
        dataSource={dataSource}
        requestFailed={requestFailed}
        className="mt-7"
      />

      <section className="mt-8 rounded-[24px] border border-white/90 bg-white/72 backdrop-blur-xl p-4 shadow-[0_18px_50px_rgba(30,64,175,0.08)]">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
          <SlidersHorizontal className="size-4 text-primary" />
          筛选课程
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              {...searchInput}
              placeholder="搜索标题、简介、讲师或标签"
              className="pl-9 rounded-xl bg-white border-slate-200 h-11"
            />
          </div>
          <Select
            value={source}
            onValueChange={(value: string) =>
              updateFilterParam('source', value)
            }
          >
            <SelectTrigger className="rounded-xl bg-white h-11">
              <SelectValue placeholder="全部来源" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部来源</SelectItem>
              <SelectItem value="internal">公司内部资料</SelectItem>
              <SelectItem value="external">外部资料</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={requirement}
            onValueChange={(value: string) =>
              updateFilterParam('requirement', value)
            }
          >
            <SelectTrigger className="rounded-xl bg-white h-11">
              <SelectValue placeholder="全部课程规则" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部课程规则</SelectItem>
              <SelectItem value="required">我的必修课</SelectItem>
              <SelectItem value="elective">我的选修课</SelectItem>
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="rounded-xl bg-white h-11">
              <SelectValue placeholder="全部难度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部难度</SelectItem>
              {['入门', '基础', '进阶', '实战', '专家'].map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(topics.length > 0 || topic) && (
          <div
            role="group"
            aria-label="课程专题"
            className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4"
          >
            <span className="mr-1 text-sm font-bold text-slate-700">专题</span>
            <Button
              size="sm"
              variant={topic ? 'ghost' : 'secondary'}
              aria-pressed={!topic}
              className="rounded-full"
              onClick={() => updateFilterParam('topic', '')}
            >
              全部专题
            </Button>
            {(topic && !topics.includes(topic)
              ? [topic, ...topics]
              : topics
            ).map((name: string) => (
              <Button
                key={name}
                size="sm"
                variant={topic === name ? 'secondary' : 'ghost'}
                aria-pressed={topic === name}
                className="max-w-full whitespace-normal break-words rounded-full"
                onClick={() => updateFilterParam('topic', name)}
              >
                {name}
              </Button>
            ))}
          </div>
        )}
      </section>

      {instructorQueries.some((query) => query.isError) && (
        <p role="status" className="mt-3 text-sm text-amber-700">
          讲师账号姓名加载失败，按中英文姓名搜索可能不完整。
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => {
              instructorQueries
                .filter((query) => query.isError)
                .forEach((query) => {
                  void query.refetch();
                });
            }}
          >
            重试
          </button>
        </p>
      )}

      <div className="mt-7 flex items-center justify-between">
        {catalogUnavailable ? (
          <p className="text-sm font-bold text-rose-700">课程数量暂不可用</p>
        ) : (
          <p className="text-sm text-slate-500">
            共找到{' '}
            <span className="font-black text-slate-900">
              {filteredCourses.length}
            </span>{' '}
            门课程
          </p>
        )}
      </div>

      {loading ? (
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[4/3] rounded-[24px] bg-white/60 animate-pulse"
            />
          ))}
        </div>
      ) : catalogUnavailable ? null : filteredCourses.length > 0 ? (
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course, index) => (
            <PlatformCourseCard
              key={course.id}
              course={course}
              index={index}
              personalRequirementType={
                personalRequirementsLoaded
                  ? personalRequirements[course.id]
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[26px] border border-white bg-white/70 p-14 text-center">
          <BookOpen className="size-9 text-slate-400 mx-auto" />
          <h2 className="mt-4 font-black text-slate-900">没有匹配的课程</h2>
          <p className="mt-2 text-sm text-slate-500">
            调整筛选条件或换一个关键词试试
          </p>
        </div>
      )}
    </div>
  );
}
