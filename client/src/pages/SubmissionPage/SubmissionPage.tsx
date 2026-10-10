import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { UserDisplay } from '@/components/business-ui/user-display';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Building2,
  ChevronLeft,
  CircleCheck,
  Clock3,
  FileText,
  Save,
  Send,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { platform } from '@/api';
import {
  listUsersByIds,
  searchInternalEmployees,
} from '@/components/business-ui/api/users/service';
import {
  DepartmentSelect,
  type DepartmentValue,
} from '@/components/business-ui/department-select';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type {
  ICourseSubmission,
  ICourseSubmissionDraftInput,
  ICourseTargetDepartment,
  ISubmissionQuizQuestion,
  ISubmissionQuizQuestionInput,
} from '@shared/api.interface';
import { useIsExternalLearner } from '@/components/Layout';
import {
  EXTERNAL_SUBMISSION_DEPARTMENT,
  isExternalSubmission,
} from '@shared/external-submission';
import CourseCoverUpload from './CourseCoverUpload';
import SubmissionQuizEditor from './SubmissionQuizEditor';

const optionalUrl = z
  .string()
  .trim()
  .refine(
    (value) => !value || /^https?:\/\//u.test(value),
    '请输入完整的 http(s) 链接',
  );

const submissionSchema = z
  .object({
    title: z.string().trim().min(2, '请填写课程标题').max(120),
    summary: z.string().trim().min(10, '课程简介至少 10 个字').max(1200),
    department: z.string().trim().max(80),
    departmentId: z.string().trim().max(160),
    departmentOpenId: z.string().trim(),
    targetDepartments: z
      .array(
        z.object({
          departmentId: z.string().trim().min(1).max(160),
          larkDepartmentId: z.string().trim().max(160),
          openDepartmentId: z
            .string()
            .trim()
            .regex(/^od-[A-Za-z0-9_-]+$/u),
          name: z.string().trim().min(1).max(160),
        }),
      )
      .max(50),
    difficulty: z.enum(['入门', '基础', '进阶', '实战', '专家']),
    docUrl: optionalUrl,
    videoUrl: optionalUrl,
    coverUrl: z.string().trim(),
    tags: z.string().max(240),
    requiresQuiz: z.boolean(),
    /** 外部学员没有 公司部门，不要求直属部门和适用部门。 */
    externalLearner: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.externalLearner) return;
    if (data.department.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['department'],
        message: '请读取投稿人的直属部门',
      });
    }
    if (!data.departmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['departmentId'],
        message: '直属部门 ID 缺失',
      });
    }
    if (!/^od-[A-Za-z0-9_-]+$/u.test(data.departmentOpenId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['departmentOpenId'],
        message: '直属部门 Open ID 缺失',
      });
    }
    if (data.targetDepartments.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetDepartments'],
        message: '请选择至少一个适用部门',
      });
    }
  })
  .refine((data) => Boolean(data.docUrl || data.videoUrl), {
    message: '课程文档和妙记视频至少填写一项',
    path: ['docUrl'],
  });

type SubmissionFormValues = z.infer<typeof submissionSchema>;

const DEFAULT_VALUES: SubmissionFormValues = {
  title: '',
  summary: '',
  department: '',
  departmentId: '',
  departmentOpenId: '',
  targetDepartments: [],
  difficulty: '基础',
  docUrl: '',
  videoUrl: '',
  coverUrl: '',
  tags: '',
  requiresQuiz: false,
  externalLearner: false,
};

const EXTERNAL_LEARNER_VALUES: Partial<SubmissionFormValues> = {
  externalLearner: true,
  department: EXTERNAL_SUBMISSION_DEPARTMENT,
  departmentId: '',
  departmentOpenId: '',
  targetDepartments: [],
};

interface RequestError {
  message?: unknown;
  response?: { data?: { message?: unknown; error?: { message?: unknown } } };
}

interface SubmissionStatusCopy {
  label: string;
  className: string;
}

const errorMessage = (error: unknown): string => {
  const requestError = error as RequestError;
  const message =
    requestError.response?.data?.error?.message ??
    requestError.response?.data?.message ??
    requestError.message;
  return typeof message === 'string' && message.trim()
    ? message
    : '操作失败，请稍后重试';
};

const REVIEW_STATUS_COPY: Record<
  ICourseSubmission['status'],
  SubmissionStatusCopy
> = {
  draft: { label: '草稿', className: 'bg-slate-100 text-slate-600' },
  pending_review: { label: '待审核', className: 'bg-amber-50 text-amber-700' },
  approved_pending_sync: {
    label: '审核通过 · 待同步',
    className: 'bg-blue-50 text-blue-700',
  },
  rejected: { label: '需修改', className: 'bg-rose-50 text-rose-700' },
};

const getSubmissionStatusCopy = (
  submission: ICourseSubmission,
): SubmissionStatusCopy => {
  if (submission.status !== 'approved_pending_sync') {
    return REVIEW_STATUS_COPY[submission.status];
  }
  if (
    submission.syncStatus === 'synced' &&
    ['synced', 'legacy'].includes(submission.quizSyncStatus)
  ) {
    return {
      label: submission.requiresQuiz ? '课程与题目已同步' : '课程已同步',
      className: 'bg-emerald-50 text-emerald-700',
    };
  }
  if (
    submission.syncStatus === 'sync_failed' ||
    submission.quizSyncStatus === 'sync_failed'
  ) {
    return {
      label: '同步失败 · 管理员可重试',
      className: 'bg-rose-50 text-rose-700',
    };
  }
  return REVIEW_STATUS_COPY[submission.status];
};

const displayName = (name: { zh_cn: string; en_us?: string }): string =>
  name.zh_cn || name.en_us || '';

const targetToDepartment = (
  target: ICourseTargetDepartment,
): DepartmentValue => ({
  id: target.departmentId,
  name: target.name,
  raw: {
    departmentID: target.departmentId,
    larkDepartmentID: target.larkDepartmentId,
    openDepartmentID: target.openDepartmentId,
    name: { zh_cn: target.name },
  },
});

const departmentToTarget = (
  department: DepartmentValue,
): ICourseTargetDepartment | null => {
  const openDepartmentId = department.raw.openDepartmentID?.trim() ?? '';
  if (!openDepartmentId) return null;
  return {
    departmentId: department.raw.departmentID.trim(),
    larkDepartmentId: department.raw.larkDepartmentID?.trim() ?? '',
    openDepartmentId,
    name: department.name.trim(),
  };
};

const loadCurrentDepartment =
  async (): Promise<ICourseTargetDepartment | null> => {
    const session = await platform.getSession();
    const batch = await listUsersByIds([session.userId]);
    const batchUser = batch.data.userInfoMap[session.userId];
    let searchedUser;
    if (!batchUser) {
      const response = await searchInternalEmployees({
        query: session.userName,
        offset: 0,
        pageSize: 20,
      });
      searchedUser = response.users.find(
        (item) =>
          item.userID === session.userId ||
          displayName(item.name) === session.userName,
      );
    }
    const user = batchUser ?? searchedUser;
    const department = user?.department;
    const departmentId = department?.departmentID?.trim() ?? '';
    const openDepartmentId = department?.openDepartmentID?.trim() ?? '';
    const name = department ? displayName(department.name) : '';
    if (!departmentId || !openDepartmentId || !name) return null;
    return {
      departmentId,
      larkDepartmentId: '',
      openDepartmentId,
      name,
    };
  };

const toDraftInput = (
  values: SubmissionFormValues,
): ICourseSubmissionDraftInput => ({
  title: values.title,
  summary: values.summary,
  department: values.department,
  departmentId: values.departmentId,
  departmentOpenId: values.departmentOpenId,
  targetDepartments: values.targetDepartments.map((department) => ({
    departmentId: String(department.departmentId ?? ''),
    larkDepartmentId: String(department.larkDepartmentId ?? ''),
    openDepartmentId: String(department.openDepartmentId ?? ''),
    name: String(department.name ?? ''),
  })),
  difficulty: values.difficulty,
  docUrl: values.docUrl,
  videoUrl: values.videoUrl,
  coverUrl: values.coverUrl,
  tags: values.tags
    .split(/[，,]/u)
    .map((tag) => tag.trim())
    .filter(Boolean),
  requiresQuiz: values.requiresQuiz,
});

const toQuestionInput = (
  question: ISubmissionQuizQuestion,
): ISubmissionQuizQuestionInput => ({
  sequence: question.sequence,
  question: question.question,
  options: question.options,
  correctAnswer: question.correctAnswer,
  explanation: question.explanation,
  evidence: question.evidence,
  learningPoint: question.learningPoint,
  authoringSource: question.authoringSource,
});

export default function SubmissionPage() {
  const currentUser = useCurrentUserProfile();
  const isExternalLearner = useIsExternalLearner();
  const [submissions, setSubmissions] = useState<ICourseSubmission[]>([]);
  const [activeDraft, setActiveDraft] = useState<ICourseSubmission | null>(
    null,
  );
  const [questions, setQuestions] = useState<ISubmissionQuizQuestionInput[]>(
    [],
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverUploadingRef = useRef(false);
  const questionsDraftIdRef = useRef<string | null>(null);
  const [directDepartment, setDirectDepartment] =
    useState<ICourseTargetDepartment | null>(null);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [departmentError, setDepartmentError] = useState('');
  const form = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const refreshHistory = async (): Promise<ICourseSubmission[]> => {
    setLoadingHistory(true);
    try {
      const records = await platform.getMySubmissions();
      setSubmissions(records);
      return records;
    } catch {
      setSubmissions([]);
      return [];
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void refreshHistory();
  }, []);

  useEffect(() => {
    // 外部学员没有 公司部门：不读取通讯录，投稿不限部门。
    if (isExternalLearner) {
      setDirectDepartment(null);
      setDepartmentError('');
      setDepartmentLoading(false);
      for (const [key, value] of Object.entries(EXTERNAL_LEARNER_VALUES)) {
        form.setValue(key as keyof SubmissionFormValues, value);
      }
      return undefined;
    }
    form.setValue('externalLearner', false);
    let cancelled = false;
    const load = async (): Promise<void> => {
      setDepartmentLoading(true);
      try {
        const department = await loadCurrentDepartment();
        if (cancelled) return;
        if (!department) {
          setDepartmentError(
            '当前账号没有可用于派课的直属部门 Open ID，请联系管理员同步通讯录后再投稿。',
          );
          return;
        }
        setDirectDepartment(department);
        setDepartmentError('');
        if (!form.getValues('departmentOpenId')) {
          form.setValue('department', department.name);
          form.setValue('departmentId', department.departmentId);
          form.setValue('departmentOpenId', department.openDepartmentId);
          form.setValue('targetDepartments', [department]);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setDepartmentError(`直属部门读取失败：${errorMessage(error)}`);
        }
      } finally {
        if (!cancelled) setDepartmentLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [form, isExternalLearner]);

  const pendingCount = useMemo(
    () => submissions.filter((item) => item.status === 'pending_review').length,
    [submissions],
  );
  const selectedTargetDepartments = form
    .watch('targetDepartments')
    .map(targetToDepartment);
  const requiresQuiz = form.watch('requiresQuiz');

  const handleCoverUploadingChange = useCallback((uploading: boolean): void => {
    coverUploadingRef.current = uploading;
    setCoverUploading(uploading);
  }, []);

  const blockWhileCoverUploading = (): boolean => {
    if (!coverUploadingRef.current) return false;
    toast.info('封面仍在上传，请完成后再继续操作');
    return true;
  };

  const updateTargetDepartments = (departments: DepartmentValue[]): void => {
    const targets = departments
      .map(departmentToTarget)
      .filter(
        (department): department is ICourseTargetDepartment =>
          department !== null,
      );
    if (targets.length !== departments.length) {
      toast.error('这个部门暂未返回 Open ID，不能用于自动派课');
    }
    const unique = new Map(
      targets.map((department) => [department.openDepartmentId, department]),
    );
    if (directDepartment) {
      unique.set(directDepartment.openDepartmentId, directDepartment);
    }
    form.setValue('targetDepartments', Array.from(unique.values()), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const resetEditor = (): void => {
    if (blockWhileCoverUploading()) return;
    setActiveDraft(null);
    questionsDraftIdRef.current = null;
    setQuestions([]);
    setStep(1);
    form.reset(
      isExternalLearner
        ? { ...DEFAULT_VALUES, ...EXTERNAL_LEARNER_VALUES }
        : directDepartment
          ? {
              ...DEFAULT_VALUES,
              department: directDepartment.name,
              departmentId: directDepartment.departmentId,
              departmentOpenId: directDepartment.openDepartmentId,
              targetDepartments: [directDepartment],
            }
          : DEFAULT_VALUES,
    );
  };

  const loadDraft = async (submission: ICourseSubmission): Promise<void> => {
    if (blockWhileCoverUploading()) return;
    if (!['draft', 'rejected'].includes(submission.status)) return;
    const draftId = submission.id;
    const requiresQuiz = submission.requiresQuiz === true;
    questionsDraftIdRef.current = draftId;
    setActiveDraft(submission);
    const storedDirectDepartment = submission.departmentOpenId
      ? (submission.targetDepartments.find(
          (department) =>
            department.openDepartmentId === submission.departmentOpenId,
        ) ?? {
          departmentId: submission.departmentId,
          larkDepartmentId: '',
          openDepartmentId: submission.departmentOpenId,
          name: submission.department,
        })
      : directDepartment;
    if (storedDirectDepartment) setDirectDepartment(storedDirectDepartment);
    form.reset({
      title: submission.title,
      summary: submission.summary,
      department: submission.department,
      departmentId:
        submission.departmentId || storedDirectDepartment?.departmentId || '',
      departmentOpenId:
        submission.departmentOpenId ||
        storedDirectDepartment?.openDepartmentId ||
        '',
      targetDepartments:
        submission.targetDepartments.length > 0
          ? submission.targetDepartments
          : storedDirectDepartment
            ? [storedDirectDepartment]
            : [],
      difficulty: ['入门', '基础', '进阶', '实战', '专家'].includes(
        submission.difficulty,
      )
        ? (submission.difficulty as SubmissionFormValues['difficulty'])
        : '基础',
      docUrl: submission.docUrl,
      videoUrl: submission.videoUrl,
      coverUrl: submission.coverUrl,
      tags: submission.tags.join(', '),
      requiresQuiz,
      externalLearner: isExternalLearner,
    });
    setQuestions([]);
    setStep(requiresQuiz ? 1 : 3);
    if (!requiresQuiz) return;
    try {
      const storedQuestions = await platform.getSubmissionQuestions(draftId);
      if (questionsDraftIdRef.current !== draftId) return;
      setQuestions(storedQuestions.map(toQuestionInput));
      setStep(2);
    } catch (error: unknown) {
      if (questionsDraftIdRef.current !== draftId) return;
      toast.error(errorMessage(error));
    }
  };

  const saveCourseDraft = async (
    requireComplete: boolean,
  ): Promise<ICourseSubmission | null> => {
    if (blockWhileCoverUploading()) return null;
    if (requireComplete && !(await form.trigger())) return null;
    if (blockWhileCoverUploading()) return null;
    setSavingDraft(true);
    try {
      const input = toDraftInput(form.getValues());
      const saved =
        activeDraft && ['draft', 'rejected'].includes(activeDraft.status)
          ? await platform.updateSubmissionDraft(activeDraft.id, input)
          : await platform.createSubmissionDraft(input);
      setActiveDraft(saved);
      await refreshHistory();
      toast.success(
        requireComplete ? '课程信息已保存' : '草稿已保存，可稍后继续',
      );
      return saved;
    } catch (error: unknown) {
      toast.error(errorMessage(error));
      return null;
    } finally {
      setSavingDraft(false);
    }
  };

  const continueToQuestions = async (): Promise<void> => {
    const saved = await saveCourseDraft(true);
    if (!saved) return;
    if (!saved.requiresQuiz) {
      setStep(3);
      return;
    }
    if (questions.length === 0 || questionsDraftIdRef.current !== saved.id) {
      setQuestions([]);
      questionsDraftIdRef.current = saved.id;
      try {
        const storedQuestions = await platform.getSubmissionQuestions(saved.id);
        if (questionsDraftIdRef.current !== saved.id) return;
        setQuestions(storedQuestions.map(toQuestionInput));
      } catch (error: unknown) {
        if (questionsDraftIdRef.current !== saved.id) return;
        toast.error(errorMessage(error));
        return;
      }
    }
    setStep(2);
  };

  const saveQuestionDraft = async (draft = activeDraft): Promise<boolean> => {
    if (blockWhileCoverUploading()) return false;
    if (!draft) {
      toast.error('请先保存课程信息');
      return false;
    }
    setSavingQuestions(true);
    try {
      const saved = await platform.saveSubmissionQuestions(draft.id, {
        questions,
      });
      setQuestions(saved.map(toQuestionInput));
      toast.success('题目草稿已保存');
      return true;
    } catch (error: unknown) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setSavingQuestions(false);
    }
  };

  const goToPreview = async (): Promise<void> => {
    if (blockWhileCoverUploading()) return;
    if (!form.getValues('requiresQuiz')) {
      const saved = await saveCourseDraft(true);
      if (saved) setStep(3);
      return;
    }
    if (questions.length < 1) {
      toast.error('启用课后题后至少准备 1 道题；未完成内容仍可保存为空草稿');
      return;
    }
    const saved = await saveCourseDraft(true);
    if (!saved) return;
    if (await saveQuestionDraft(saved)) setStep(3);
  };

  const submitForReview = async (): Promise<void> => {
    if (blockWhileCoverUploading()) return;
    const saved = await saveCourseDraft(true);
    if (!saved) return;
    if (saved.requiresQuiz && questions.length < 1) {
      toast.error('启用课后题后至少准备 1 道题；未完成内容仍可保存为空草稿');
      return;
    }
    setSubmitting(true);
    try {
      if (saved.requiresQuiz) {
        const questionSaved = await saveQuestionDraft(saved);
        if (!questionSaved) return;
      }
      await platform.submitSubmission(saved.id);
      toast.success(
        saved.requiresQuiz
          ? `课程与 ${questions.length} 道题已提交审核`
          : '课程已提交审核',
      );
      resetEditor();
      await refreshHistory();
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10 pb-24 md:px-6 md:py-14">
      <header className="max-w-3xl">
        <p className="text-xs font-black tracking-[0.12em] text-primary">
          CONTRIBUTE A COURSE
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.055em] text-slate-950 md:text-5xl">
          投稿一门内部课程
        </h1>
        <p className="mt-4 text-base leading-8 text-slate-600">
          填写课程内容并选择适用部门，按需添加课后题。本部门员工自动列为必修，其他员工可自主报名选修。
        </p>
      </header>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        {(requiresQuiz
          ? [
              [1, '课程信息'],
              [2, '课后练习'],
              [3, '预览并提交'],
            ]
          : [
              [1, '课程信息'],
              [3, '预览并提交'],
            ]
        ).map(([value, label], index) => (
          <div
            key={String(value)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${step === value ? 'bg-slate-950 text-white' : 'bg-white/70 text-slate-500'}`}
          >
            <span className="grid size-5 place-items-center rounded-full bg-white/15 text-[10px]">
              {index + 1}
            </span>
            {label}
          </div>
        ))}
        {activeDraft && (
          <span className="text-xs text-slate-400">
            草稿：{activeDraft.title || '未命名课程'}
          </span>
        )}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-[28px] border border-white/90 bg-white/74 p-5 shadow-[0_24px_70px_rgba(30,64,175,0.1)] backdrop-blur-xl md:p-8">
          {step === 1 ? (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(() => void continueToQuestions())}
                className="space-y-6"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>课程标题</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="例如：如何用飞书妙搭搭建部门助手"
                            className="h-11 rounded-xl bg-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>课程简介</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="说明课程解决什么问题、学习后能获得什么"
                            className="min-h-28 rounded-xl bg-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <p className="text-sm font-medium text-slate-900">
                      {isExternalLearner ? '投稿身份' : '投稿人直属部门'}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                      <Building2 className="size-4 text-blue-600" />
                      {isExternalLearner
                        ? EXTERNAL_SUBMISSION_DEPARTMENT
                        : departmentLoading
                          ? '正在读取…'
                          : directDepartment?.name || '尚未读取'}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {isExternalLearner
                        ? '外部学员没有 公司部门：投稿课程不限部门，审核通过后对所有人是选修课。'
                        : '由当前飞书账号自动读取，并固定包含在适用部门中。'}
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>学习难度</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl bg-white">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {['入门', '基础', '进阶', '实战', '专家'].map(
                              (item) => (
                                <SelectItem key={item} value={item}>
                                  {item}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">讲师</p>
                    <div className="rounded-xl border bg-white/70 px-3 py-2">
                      {currentUser.user_id ? (
                        <UserDisplay
                          value={[
                            {
                              user_id: currentUser.user_id,
                              name: currentUser.name,
                              avatar: currentUser.avatar,
                            },
                          ]}
                          size="small"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          正在读取飞书账号…
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      根据当前飞书账号自动获取；代传课程可由管理员在审核时调整讲师。
                    </p>
                  </div>
                  {!isExternalLearner && (
                    <FormField
                      control={form.control}
                      name="targetDepartments"
                      render={() => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>适用部门</FormLabel>
                          <FormControl>
                            <DepartmentSelect
                              multiple
                              value={selectedTargetDepartments}
                              onChange={(value) =>
                                updateTargetDepartments(
                                  Array.isArray(value) ? value : [],
                                )
                              }
                              disabled={departmentLoading || !directDepartment}
                              placeholder="搜索并添加适用部门"
                              getOptionDisabled={(department) =>
                                !department.raw.openDepartmentID ||
                                department.raw.openDepartmentID ===
                                  directDepartment?.openDepartmentId
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            选择上级部门会自动覆盖其下属部门。适用部门员工自动必修，其他员工仍可报名选修。
                          </FormDescription>
                          {departmentError ? (
                            <p className="text-sm font-medium text-rose-600">
                              {departmentError}
                            </p>
                          ) : null}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="videoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="inline-flex items-center gap-2">
                          <Video className="size-4 text-blue-600" />
                          妙记视频链接
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://..."
                            className="h-11 rounded-xl bg-white"
                          />
                        </FormControl>
                        <FormDescription>
                          推荐填写飞书妙记分享链接
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="docUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="inline-flex items-center gap-2">
                          <FileText className="size-4 text-violet-600" />
                          课程文档链接
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://..."
                            className="h-11 rounded-xl bg-white"
                          />
                        </FormControl>
                        <FormDescription>
                          飞书文档、Wiki 或其他资料链接
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="coverUrl"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>课程封面图（选填）</FormLabel>
                        <FormControl>
                          <CourseCoverUpload
                            value={field.value}
                            onChange={field.onChange}
                            onUploadingChange={handleCoverUploadingChange}
                            scopeKey={activeDraft?.id ?? 'new'}
                            disabled={
                              coverUploading ||
                              savingDraft ||
                              savingQuestions ||
                              submitting
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          从本机选择图片后会立即上传并预览；审核同步时写入多维表格封面附件。
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>课程标签（选填）</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="AI, 妙搭, 自动化"
                            className="h-11 rounded-xl bg-white"
                          />
                        </FormControl>
                        <FormDescription>
                          使用逗号分隔，最多 12 个
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="requiresQuiz"
                    render={({ field }) => (
                      <FormItem className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 md:col-span-2">
                        <div className="flex items-start gap-3">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={
                                coverUploading ||
                                savingDraft ||
                                savingQuestions ||
                                submitting
                              }
                              aria-label="启用课后题"
                            />
                          </FormControl>
                          <div>
                            <FormLabel>课后题（自愿选择）</FormLabel>
                            <FormDescription className="mt-1 leading-5">
                              {field.value
                                ? '已选择课后题：提交前至少准备 1 道题，系统会逐题校验。'
                                : '无需准备题目，填写课程资料即可提交审核。'}
                            </FormDescription>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                  <p className="text-xs leading-5 text-slate-500">
                    信息没填完也可先保存草稿；进入下一步前会检查必填项。
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={savingDraft || coverUploading}
                      className="h-11 rounded-full px-5"
                      onClick={() => void saveCourseDraft(false)}
                    >
                      <Save className="size-4" />
                      保存草稿
                    </Button>
                    <Button
                      type="submit"
                      disabled={savingDraft || coverUploading}
                      className="h-11 rounded-full px-6"
                    >
                      {savingDraft
                        ? '保存中…'
                        : requiresQuiz
                          ? '保存并编辑题目'
                          : '保存并预览'}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          ) : step === 2 ? (
            <div>
              <Button
                type="button"
                variant="ghost"
                className="mb-4 rounded-full"
                onClick={() => setStep(1)}
              >
                <ChevronLeft className="size-4" />
                返回修改课程信息
              </Button>
              <SubmissionQuizEditor
                questions={questions}
                onChange={setQuestions}
                onSave={async () => {
                  await saveQuestionDraft();
                }}
                saving={savingQuestions}
              />
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-slate-950 p-5 text-white">
                <div>
                  <p className="font-black">完成后先预览整套内容</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    至少准备 1 道题。进入预览会先保存当前草稿，但不会提交审核。
                  </p>
                </div>
                <Button
                  type="button"
                  disabled={savingDraft || savingQuestions || coverUploading}
                  className="h-11 rounded-full bg-white px-6 text-slate-950 hover:bg-slate-100"
                  onClick={() => void goToPreview()}
                >
                  保存并预览
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Button
                type="button"
                variant="ghost"
                className="mb-4 rounded-full"
                onClick={() => setStep(requiresQuiz ? 2 : 1)}
              >
                <ChevronLeft className="size-4" />
                {requiresQuiz ? '返回修改课后题' : '返回修改课程信息'}
              </Button>

              <div className="rounded-[22px] border border-slate-100 bg-white p-5 md:p-6">
                <p className="text-xs font-black tracking-[0.12em] text-primary">
                  COURSE PREVIEW
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  {form.getValues('title')}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {form.getValues('summary')}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                  {[
                    form.getValues('department'),
                    '内部资源',
                    form.getValues('difficulty'),
                    isExternalLearner
                      ? '适用范围：不限部门（所有人选修）'
                      : `适用部门：${form
                          .getValues('targetDepartments')
                          .map((department) => department.name)
                          .join('、')}`,
                    `讲师：${activeDraft?.instructor || currentUser.name || '正在读取飞书账号…'}`,
                  ].map((item, index) => (
                    <span
                      key={`${index}:${item}`}
                      className="rounded-full bg-slate-50 px-3 py-1.5 text-slate-600"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {requiresQuiz ? (
                <>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <h2 className="font-black text-slate-950">课后练习预览</h2>
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      {questions.length} 道
                    </span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {questions.map((question) => (
                      <details
                        key={question.sequence}
                        className="rounded-[18px] border border-slate-100 bg-white p-4"
                      >
                        <summary className="cursor-pointer list-none text-sm font-bold leading-6 text-slate-800">
                          {question.sequence}. {question.question}
                        </summary>
                        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 text-xs leading-6 text-slate-600">
                          <div className="grid gap-2 sm:grid-cols-2">
                            {(['A', 'B', 'C', 'D'] as const).map((key) => (
                              <p
                                key={key}
                                className={
                                  key === question.correctAnswer
                                    ? 'font-bold text-emerald-700'
                                    : ''
                                }
                              >
                                {key}. {question.options[key]}
                              </p>
                            ))}
                          </div>
                          <p>
                            <span className="font-bold text-slate-800">
                              解析：
                            </span>
                            {question.explanation}
                          </p>
                          <p>
                            <span className="font-bold text-slate-800">
                              原文依据：
                            </span>
                            {question.evidence}
                          </p>
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700">
                            {question.learningPoint}
                          </span>
                        </div>
                      </details>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 p-5">
                  <h2 className="font-black text-slate-950">课后题：未设置</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    你选择直接提交课程内容，管理员审核时不会收到课后题。
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-slate-950 p-5 text-white">
                <div>
                  <p className="font-black">确认提交管理员审核</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {requiresQuiz
                      ? '提交后内容将只读；管理员通过后，课程仍为未上线草稿，题目仍为待审核草稿。'
                      : '提交后课程内容将只读；管理员审核通过后，课程仍为未上线草稿。'}
                  </p>
                </div>
                <Button
                  type="button"
                  disabled={
                    submitting ||
                    savingDraft ||
                    savingQuestions ||
                    coverUploading
                  }
                  className="h-11 rounded-full bg-white px-6 text-slate-950 hover:bg-slate-100"
                  onClick={() => void submitForReview()}
                >
                  <Send className="size-4" />
                  {submitting
                    ? '正在提交…'
                    : requiresQuiz
                      ? `提交课程与 ${questions.length} 道题`
                      : '提交课程'}
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-[24px] border border-white bg-slate-950 p-6 text-white">
            <p className="text-xs font-bold tracking-[0.1em] text-blue-300">
              审核流程
            </p>
            <ol className="mt-5 space-y-4">
              {(requiresQuiz
                ? [
                    ['1', '保存课程草稿', '未完成也可保存并稍后继续'],
                    ['2', '准备课后题', '人工录入或 Excel 导入，至少准备 1 道'],
                    ['3', '管理员双重审核', '课程与题目审核后才进入正式库'],
                  ]
                : [
                    ['1', '保存课程草稿', '未完成也可保存并稍后继续'],
                    ['2', '管理员审核', '课程审核通过后才进入正式库'],
                  ]
              ).map(([value, title, description]) => (
                <li key={value} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black">
                    {value}
                  </span>
                  <div>
                    <p className="text-sm font-bold">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-[24px] border border-white/90 bg-white/74 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-black text-slate-900">我的投稿</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full"
                disabled={coverUploading}
                onClick={resetEditor}
              >
                新建
              </Button>
            </div>
            {pendingCount > 0 && (
              <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                {pendingCount} 个待审核
              </span>
            )}
            <div className="mt-4 space-y-3">
              {loadingHistory ? (
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              ) : submissions.length > 0 ? (
                submissions.slice(0, 8).map((item) => {
                  const status = getSubmissionStatusCopy(item);
                  const editable = ['draft', 'rejected'].includes(item.status);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!editable || coverUploading}
                      onClick={() => void loadDraft(item)}
                      className="w-full rounded-2xl border border-slate-100 bg-white p-3.5 text-left disabled:cursor-default"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-bold text-slate-900">
                          {item.title || '未命名课程'}
                        </p>
                        {item.quizSyncStatus === 'synced' && (
                          <CircleCheck className="size-4 shrink-0 text-emerald-500" />
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold ${status.className}`}
                          >
                            {status.label}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.targetDepartments.length > 0 ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500'}`}
                          >
                            {item.targetDepartments.length > 0
                              ? `${item.targetDepartments.length} 个适用部门`
                              : isExternalSubmission(item)
                                ? '不限部门'
                                : '待选择适用部门'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {editable ? '点击继续' : ''}
                        </span>
                      </div>
                      {item.reviewNote && (
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          反馈：{item.reviewNote}
                        </p>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="py-7 text-center">
                  <Clock3 className="mx-auto size-6 text-slate-300" />
                  <p className="mt-2 text-xs text-slate-500">还没有投稿记录</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
