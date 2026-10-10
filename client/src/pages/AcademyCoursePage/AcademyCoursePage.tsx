import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  PlayCircle,
  RefreshCw,
  User,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { academy, platform } from '@/api';
import type {
  IAcademyCourse,
  ICourseEnrollmentStatus,
  ILearningProgress,
} from '@shared/api.interface';
import { UserDisplay } from '@/components/business-ui/user-display';
import ContentEmbed from '@/components/ContentEmbed';
import CourseDocumentReader from '@/components/CourseDocumentReader';
import { Button } from '@/components/ui/button';
import { AcademyCoverImage } from '@/components/AcademyCoverImage';
import { Progress } from '@/components/ui/progress';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useCourseActiveTime } from '@/hooks/useCourseActiveTime';
import {
  displayedRequirementLabel,
  displayedRequirementType,
} from '../CourseManagementPage/course-admin-settings-utils';
import CourseQuizPanel from './CourseQuizPanel';
import { getCourseActionVisibility } from './course-action-visibility';
import { useCourseQuiz } from './useCourseQuiz';

const ACADEMY_CARD =
  'bg-[#ffffffbd] border border-[#ffffffeb] rounded-[26px] backdrop-blur-[18px] backdrop-saturate-[1.2] shadow-[0_20px_48px_#14364017]';

const difficultyChipClass: Record<string, string> = {
  入门: 'academy-chip academy-chip--lime',
  基础: 'academy-chip academy-chip--blue',
  进阶: 'academy-chip',
  实战: 'academy-chip',
};

type TabKey = 'video' | 'doc';

function hasUrl(url?: string): boolean {
  return Boolean(url && url.trim());
}

const AcademyCoursePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<IAcademyCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('video');
  const [progress, setProgress] = useState<ILearningProgress | null>(null);
  const [enrollment, setEnrollment] = useState<ICourseEnrollmentStatus | null>(
    null,
  );
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [enrollmentFailed, setEnrollmentFailed] = useState(false);
  const [enrollmentRetryKey, setEnrollmentRetryKey] = useState(0);
  const [enrolling, setEnrolling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const refreshKey = useAutoRefresh();
  const loadedCourseIdRef = useRef<string | null>(null);
  const recordedViewCourseIdRef = useRef<string | null>(null);
  const { quiz, confirmedNoQuiz, updateQuiz } = useCourseQuiz(
    id ?? '',
    Boolean(
      course?.id === id &&
      !loading &&
      !enrollmentLoading &&
      enrollment?.enrolled,
    ),
    refreshKey,
  );

  useCourseActiveTime({
    courseId: course?.id ?? '',
    enabled: Boolean(
      course && !loading && course.id === id && enrollment?.enrolled,
    ),
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const isCourseChange = loadedCourseIdRef.current !== id;
    if (isCourseChange) {
      setLoading(true);
      setCourse(null);
      setProgress(null);
      setEnrollment(null);
      setEnrollmentLoading(true);
      setEnrollmentFailed(false);
      recordedViewCourseIdRef.current = null;
    }

    academy
      .getCourseById(id)
      .then((courseData) => {
        if (cancelled) return;
        setCourse(courseData);
        loadedCourseIdRef.current = id;
        if (courseData) {
          const video = hasUrl(courseData.videoUrl);
          const doc = hasUrl(courseData.docUrl);
          setActiveTab((currentTab: TabKey): TabKey => {
            const currentResourceStillExists =
              currentTab === 'video' ? video : doc;
            if (currentResourceStillExists) return currentTab;
            return video ? 'video' : 'doc';
          });
        }
      })
      .catch(() => {
        if (!cancelled && isCourseChange) setCourse(null);
      })
      .finally(() => {
        if (!cancelled && isCourseChange) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setEnrollmentLoading(true);
    setEnrollmentFailed(false);
    platform
      .getCourseEnrollment(id)
      .then((result) => {
        if (!cancelled) setEnrollment(result);
      })
      .catch(() => {
        if (!cancelled) {
          setEnrollment(null);
          setEnrollmentFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setEnrollmentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enrollmentRetryKey, id]);

  useEffect(() => {
    if (
      !course ||
      !enrollment?.enrolled ||
      recordedViewCourseIdRef.current === course.id
    ) {
      return;
    }
    recordedViewCourseIdRef.current = course.id;
    void platform
      .recordLearningEvent(course.id, {
        eventType: 'view_course',
        courseTitle: course.title,
      })
      .then(setProgress)
      .catch(() => toast.error('学习进度同步失败，请稍后重试'));
  }, [course, enrollment?.enrolled]);

  if (loading) {
    return (
      <div className="w-full pt-28 px-6 md:px-8 lg:px-10 max-w-7xl mx-auto pb-16 space-y-6">
        <div className="animate-pulse h-8 w-20 bg-black/5 rounded-lg" />
        <div className={`animate-pulse h-64 ${ACADEMY_CARD}`} />
        <div className={`animate-pulse h-48 ${ACADEMY_CARD}`} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="w-full pt-28 px-6 md:px-8 lg:px-10 max-w-7xl mx-auto pb-16">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#ffffffbd] border border-[#ffffffeb] flex items-center justify-center mb-4 shadow-[0_20px_48px_#14364017]">
            <BookOpen className="w-8 h-8 text-[#14141480]" />
          </div>
          <h2 className="text-lg font-semibold text-[#08090d] mb-2">
            课程未找到
          </h2>
          <p className="text-sm text-[#14141480] mb-6">
            该课程可能已下架或不存在
          </p>
          <button
            onClick={() => navigate(-1)}
            className="academy-gradient-button"
          >
            <ArrowLeft className="w-4 h-4" />
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  const hasDoc = hasUrl(course.docUrl);
  const hasVideo = hasUrl(course.videoUrl);
  const hasAnyMedia = hasDoc || hasVideo;
  const hasQuiz = Boolean(quiz);
  const enrolled = Boolean(enrollment?.enrolled);
  const actionVisibility = getCourseActionVisibility({
    enrolled,
    hasDoc,
    hasVideo,
    hasQuiz,
  });
  const effectiveRequirementType = displayedRequirementType(
    course,
    enrollment?.requirementType,
  );
  const requirementLabel = displayedRequirementLabel(
    course,
    enrollment?.requirementType,
  );
  const progressPercent: number | null = progress?.progressPercent ?? null;

  const recordResourceOpen = (tab: TabKey): void => {
    if (!enrolled) {
      toast.info('请先报名这门选修课');
      return;
    }
    setActiveTab(tab);
    void platform
      .recordLearningEvent(course.id, {
        eventType: tab === 'video' ? 'open_video' : 'open_doc',
        courseTitle: course.title,
      })
      .then(setProgress)
      .catch(() => toast.error('学习进度同步失败，请稍后重试'));
  };

  const markComplete = async (): Promise<void> => {
    if (completing || !confirmedNoQuiz || !enrolled) return;
    setCompleting(true);
    try {
      const updated = await platform.markCourseComplete(course.id);
      setProgress(updated);
      toast.success('课程已标记为已完成');
    } catch {
      toast.error('暂时无法完成，请刷新确认课程是否已新增测试题，或稍后重试');
    } finally {
      setCompleting(false);
    }
  };

  const enrollCurrentCourse = async (): Promise<void> => {
    if (enrolling) return;
    setEnrolling(true);
    try {
      const result = await platform.enrollCourse(course.id);
      setEnrollment(result);
      setEnrollmentFailed(false);
      toast.success('报名成功，课程已加入“我的学习”');
    } catch {
      toast.error('报名失败，请稍后重试');
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full pt-28 px-6 md:px-8 lg:px-10 max-w-7xl mx-auto pb-16 space-y-6"
    >
      <div className="w-full">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-[#14141480] hover:text-[#08090d] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
      </div>

      <div className={`${ACADEMY_CARD} overflow-hidden`}>
        <div className="md:flex">
          <div className="md:w-80 aspect-video md:aspect-auto md:h-auto shrink-0">
            {course.coverUrl ? (
              <AcademyCoverImage
                src={course.coverUrl}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full min-h-[180px] bg-gradient-to-br from-[#22cdf1]/20 to-[#4df3c5]/20 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-[#22cdf1]/40" />
              </div>
            )}
          </div>

          <div className="flex-1 p-6 space-y-4">
            <h1 className="text-xl font-bold text-[#08090d]">{course.title}</h1>

            <div className="flex flex-wrap gap-2">
              {hasVideo && (
                <span className="inline-flex items-center gap-1 academy-chip academy-chip--blue">
                  <PlayCircle className="w-3 h-3" />
                  视频
                </span>
              )}
              {hasDoc && (
                <span className="inline-flex items-center gap-1 academy-chip academy-chip--lime">
                  <FileText className="w-3 h-3" />
                  文档
                </span>
              )}
              {course.difficulty && (
                <span
                  className={
                    difficultyChipClass[course.difficulty] || 'academy-chip'
                  }
                >
                  {course.difficulty}
                </span>
              )}
              {course.status && (
                <span
                  className={`academy-chip ${
                    course.status === '更新中' ? 'academy-chip--lime' : ''
                  }`}
                >
                  {course.status}
                </span>
              )}
              {course.courseType && (
                <span className="academy-chip">{course.courseType}</span>
              )}
              {hasQuiz && (
                <span className="academy-chip academy-chip--blue">
                  含课后测验
                </span>
              )}
              {course.courseSource && (
                <span className="academy-chip">{course.courseSource}</span>
              )}
              <span
                className={`academy-chip ${
                  effectiveRequirementType === 'required'
                    ? 'academy-chip--pink'
                    : 'academy-chip--blue'
                }`}
              >
                {requirementLabel}
              </span>
              {course.tags?.map((tag: string) => (
                <span key={tag} className="academy-chip">
                  {tag}
                </span>
              ))}
            </div>

            {course.summary && (
              <p className="text-sm text-[#14141480] leading-relaxed">
                {course.summary}
              </p>
            )}

            {(course.instructorUserIds.length > 0 || course.instructor) && (
              <div className="flex items-center gap-1.5 text-sm text-[#14141480]">
                <User className="w-4 h-4 text-[#22cdf1]" />
                <span>讲师：</span>
                {course.instructorUserIds.length > 0 ? (
                  <UserDisplay value={course.instructorUserIds} size="small" />
                ) : (
                  <span>{course.instructor}</span>
                )}
              </div>
            )}

            <div className="rounded-2xl bg-white/70 border border-black/5 p-4">
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="font-bold text-[#08090d]">我的学习进度</span>
                <span className="font-bold text-primary">
                  {enrollmentLoading
                    ? '正在确认'
                    : enrollmentFailed
                      ? '暂不可用'
                      : !enrolled
                        ? effectiveRequirementType === 'elective'
                          ? '报名后记录'
                          : '任务未就绪'
                        : progressPercent === null
                          ? '同步中'
                          : `${progressPercent}%`}
                </span>
              </div>
              <Progress value={progressPercent ?? 0} className="mt-3 h-1.5" />
              <p className="mt-2 text-[11px] text-[#14141480]">
                {enrollmentLoading
                  ? '正在确认课程任务与报名状态，确认完成后才会开始记录有效学习时长。'
                  : enrollmentFailed
                    ? '课程任务状态加载失败，本页暂不开始计时；请重试后继续学习。'
                    : enrolled
                      ? hasQuiz
                        ? '打开课程资源最多记录到 60%；课后题全部答对后，平台自动记为 100% 完成。'
                        : confirmedNoQuiz
                          ? '学习结束后，点击“标记为已完成”确认完成课程。'
                          : '尚未确认课程测试要求，暂不能手动标记完成；若持续未显示，请刷新重试。'
                      : '只预览课程简介不会记录学习情况；报名后才会开始计时并进入管理员学习监控。'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              {effectiveRequirementType === 'elective' && !enrolled && (
                <button
                  type="button"
                  disabled={enrollmentLoading || enrolling}
                  onClick={() => void enrollCurrentCourse()}
                  className="academy-gradient-button disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UserPlus className="w-4 h-4" />
                  {enrollmentLoading
                    ? '正在确认报名状态'
                    : enrolling
                      ? '正在报名'
                      : '报名课程'}
                </button>
              )}
              {effectiveRequirementType === 'elective' && enrolled && (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  已报名
                </span>
              )}
              {actionVisibility.showVideo && (
                <button
                  type="button"
                  onClick={() => {
                    recordResourceOpen('video');
                    window.scrollTo({ top: 480, behavior: 'smooth' });
                  }}
                  className="academy-gradient-button"
                >
                  <PlayCircle className="w-4 h-4" />
                  观看视频
                </button>
              )}
              {actionVisibility.showDocument && (
                <button
                  type="button"
                  onClick={() => {
                    recordResourceOpen('doc');
                    window.scrollTo({ top: 480, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-black/5 text-[#08090d] text-sm font-medium hover:bg-black/5 transition-all"
                >
                  <FileText className="w-4 h-4" />
                  查看文档
                </button>
              )}
              {enrolled && confirmedNoQuiz && (
                <Button
                  disabled={completing || progress?.status === 'completed'}
                  onClick={() => void markComplete()}
                  className="rounded-full"
                >
                  <CheckCircle2 className="size-4" />
                  {progress?.status === 'completed'
                    ? '已完成'
                    : completing
                      ? '正在保存…'
                      : '标记为已完成'}
                </Button>
              )}
              {actionVisibility.showQuiz && (
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById('course-quiz')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-violet-50 text-violet-700 text-sm font-bold hover:bg-violet-100 transition-all"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  {quiz?.completed
                    ? '查看已完成测验'
                    : progress?.status === 'completed'
                      ? '练习新版测验（不影响完成）'
                      : quiz?.correctCount
                        ? `继续错题（${quiz.correctCount}/${quiz.totalQuestions}）`
                        : '开始课后测验'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {enrollmentLoading ? (
        <div className={`${ACADEMY_CARD} p-8 md:p-10 text-center`}>
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
          <h2 className="mt-4 text-lg font-black text-slate-950">
            正在确认课程任务
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">
            确认完成后才会加载课程内容并开始记录有效学习时长。
          </p>
        </div>
      ) : enrollmentFailed ||
        (!enrolled && effectiveRequirementType === 'required') ? (
        <div className={`${ACADEMY_CARD} p-8 md:p-10 text-center`}>
          <RefreshCw className="mx-auto h-9 w-9 text-primary" />
          <h2 className="mt-4 text-lg font-black text-slate-950">
            课程任务暂未就绪
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">
            为避免漏记学习情况，本页暂不加载课程内容。请重试确认任务状态。
          </p>
          <button
            type="button"
            onClick={() => setEnrollmentRetryKey((value) => value + 1)}
            className="academy-gradient-button mt-5"
          >
            <RefreshCw className="h-4 w-4" />
            重新确认
          </button>
        </div>
      ) : !enrolled && effectiveRequirementType === 'elective' ? (
        <div className={`${ACADEMY_CARD} p-8 md:p-10 text-center`}>
          <UserPlus className="mx-auto h-9 w-9 text-primary" />
          <h2 className="mt-4 text-lg font-black text-slate-950">
            报名后开始学习
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">
            报名后课程会加入“我的学习”，平台开始记录前台有效学习时长和课程资源访问情况；选修课不会发送催学提醒。
          </p>
        </div>
      ) : hasAnyMedia ? (
        <section className="relative left-1/2 w-full max-w-[100rem] -translate-x-1/2 space-y-4 md:w-[calc(100vw-3rem)]">
          {hasVideo && hasDoc && (
            <div className="bg-white border border-black/5 shadow-[0_20px_48px_#14364017] rounded-full p-1 inline-flex">
              <button
                type="button"
                onClick={() => recordResourceOpen('video')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === 'video'
                    ? 'bg-[#060a0f] text-white shadow-sm'
                    : 'text-[#14141480] hover:text-[#08090d] hover:bg-black/5'
                }`}
              >
                <PlayCircle className="w-4 h-4" />
                视频
              </button>
              <button
                type="button"
                onClick={() => recordResourceOpen('doc')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === 'doc'
                    ? 'bg-[#060a0f] text-white shadow-sm'
                    : 'text-[#14141480] hover:text-[#08090d] hover:bg-black/5'
                }`}
              >
                <FileText className="w-4 h-4" />
                文档
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {activeTab === 'video' && hasVideo ? (
                <ContentEmbed
                  src={course.videoUrl}
                  title={course.title || '课程视频'}
                  kind="video"
                  onOpen={() => recordResourceOpen('video')}
                />
              ) : activeTab === 'doc' && hasDoc ? (
                course.courseSource === '内部' ? (
                  <CourseDocumentReader
                    key={`${course.id}:${course.docUrl}`}
                    courseId={course.id}
                    src={course.docUrl}
                    title={course.title || '课程文档'}
                    onOpen={() => recordResourceOpen('doc')}
                  />
                ) : (
                  <ContentEmbed
                    src={course.docUrl}
                    title={course.title || '课程文档'}
                    kind="doc"
                    onOpen={() => recordResourceOpen('doc')}
                  />
                )
              ) : null}
            </motion.div>
          </AnimatePresence>
        </section>
      ) : (
        <div
          className={`${ACADEMY_CARD} p-12 flex flex-col items-center justify-center text-center`}
        >
          <BookOpen className="w-10 h-10 text-[#14141480] mb-3" />
          <h3 className="text-base font-semibold text-[#08090d] mb-1.5">
            内容尚未上传
          </h3>
          <p className="text-sm text-[#14141480] max-w-sm">
            课程负责人可通过投稿页面补充课程文档或妙记视频，经审核后统一更新到正式课程库。
          </p>
        </div>
      )}

      {actionVisibility.showQuiz && quiz && (
        <CourseQuizPanel
          key={`${quiz.courseId}:${quiz.version}`}
          quiz={quiz}
          onQuizChange={updateQuiz}
          onProgressChange={setProgress}
        />
      )}
    </motion.div>
  );
};

export default AcademyCoursePage;
