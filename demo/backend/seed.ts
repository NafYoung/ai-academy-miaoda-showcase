import type {
  IAcademyCourse,
  ICourseSubmission,
  ICourseQuizAdminQuestion,
  ISubmissionQuizQuestion,
} from '@shared/api.interface';

/**
 * 演示种子数据。
 * - 「官方」「合作方」课程：标题与链接来自飞书公开课程页面，只做链接，不转存内容。
 * - 「内部」课程与投稿：全部为虚构示例，标题带「示例」字样。
 */

type Option = 'A' | 'B' | 'C' | 'D';

export interface SeedQuizQuestion {
  question: string;
  options: Record<Option, string>;
  correctAnswer: Option;
  explanation: string;
  evidence: string;
  learningPoint: string;
}

const FEISHU_COURSE = (id: string): string => `https://www.feishu.cn/community/course?id=${id}`;

const COVER_COLORS: Array<[string, string]> = [
  ['#3370ff', '#7c5cff'],
  ['#0ea5e9', '#22c55e'],
  ['#f59e0b', '#ef4444'],
  ['#8b5cf6', '#ec4899'],
  ['#14b8a6', '#3b82f6'],
  ['#6366f1', '#0ea5e9'],
];

/** 本地生成的渐变封面，避免使用任何真实课程素材。 */
export function coverFor(title: string, index: number): string {
  const [from, to] = COVER_COLORS[index % COVER_COLORS.length];
  const clean = title.replace(/[【】「」|｜]/g, ' ').replace(/\s+/g, ' ').trim();
  const lines = [clean.slice(0, 10), clean.slice(10, 20)].filter(Boolean);
  const text = lines
    .map((line, i) => `<text x="320" y="${190 + i * 50}" font-size="38" font-weight="700" text-anchor="middle" fill="#fff" font-family="PingFang SC, sans-serif">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="560" cy="60" r="120" fill="#fff" opacity="0.12"/><text x="320" y="120" font-size="18" text-anchor="middle" fill="#fff" opacity="0.85" font-family="sans-serif" letter-spacing="4">ATHENA DEMO</text>${text}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface CourseSeed {
  id: string;
  title: string;
  summary: string;
  courseSource: '官方' | '合作方' | '内部';
  difficulty: string;
  courseType: string;
  tags: string[];
  status: string;
  instructor: string;
  instructorUserIds?: string[];
  docUrl?: string;
  videoUrl?: string;
  requirementOverride?: 'auto' | 'required' | 'elective';
  learningMode?: 'self_study' | 'quiz';
  updatedAt: string;
}

const COURSE_SEEDS: CourseSeed[] = [
  {
    id: 'demo-official-ai-pack',
    title: '飞书用户 AI 功能学习包',
    summary: '飞书官方「飞行社」课程，共 9 节，面向飞书用户的 AI 功能学习。课程内容与更新以飞书官方页面为准。',
    courseSource: '官方',
    difficulty: '入门',
    courseType: '系列课',
    tags: ['AI工具', '快速上手'],
    status: '已完结',
    instructor: '飞书官方',
    videoUrl: FEISHU_COURSE('7621116230484626614'),
    updatedAt: '2026-09-28T02:00:00.000Z',
  },
  {
    id: 'demo-official-bitable-start',
    title: '快速上手多维表格',
    summary: '飞书帮助中心入门文章：多维表格是表格形态的在线数据库，介绍数据表、视图、记录、字段等基础概念，以及筛选排序、仪表盘、导入导出与高级权限。',
    courseSource: '官方',
    difficulty: '入门',
    courseType: '单次课',
    tags: ['产品功能', '快速上手'],
    status: '已完结',
    instructor: '飞书官方',
    docUrl: 'https://www.feishu.cn/hc/zh-CN/articles/697278684206',
    updatedAt: '2026-09-25T02:00:00.000Z',
  },
  {
    id: 'demo-official-miaoda-live',
    title: '【直播】飞书大讲堂——飞书妙搭「妙搭万物」直播课',
    summary: '飞书官方「飞行社」直播课，共 3 节，主题为飞书妙搭。课程内容以飞书官方页面为准。',
    courseSource: '官方',
    difficulty: '进阶',
    courseType: '系列课',
    tags: ['AI工具', '实战案例'],
    status: '已完结',
    instructor: '飞书官方',
    videoUrl: FEISHU_COURSE('7576878403953888190'),
    updatedAt: '2026-09-20T02:00:00.000Z',
  },
  {
    id: 'demo-official-agents-live',
    title: '【直播】飞书大讲堂——Work with agents',
    summary: '飞书官方「飞行社」直播课，共 2 节，主题为与 Agent 协同工作。课程内容以飞书官方页面为准。',
    courseSource: '官方',
    difficulty: '进阶',
    courseType: '系列课',
    tags: ['AI工具', '方案场景'],
    status: '更新中',
    instructor: '飞书官方',
    videoUrl: FEISHU_COURSE('7628428867631320248'),
    updatedAt: '2026-10-08T02:00:00.000Z',
  },
  {
    id: 'demo-official-agent-skill',
    title: '手把手教你搭建 agent skill 系列课',
    summary: '飞书官方「飞行社」课程，主题为搭建 agent skill。课程内容以飞书官方页面为准。',
    courseSource: '官方',
    difficulty: '实战',
    courseType: '系列课',
    tags: ['AI工具', '实战案例'],
    status: '更新中',
    instructor: '飞书官方',
    videoUrl: FEISHU_COURSE('7659690016062311608'),
    requirementOverride: 'elective',
    updatedAt: '2026-10-05T02:00:00.000Z',
  },
  {
    id: 'demo-official-ai-work',
    title: '不只是聊天，AI 怎么帮你真正干活',
    summary: '飞书官方「飞行社」课程，主题为让 AI 参与实际工作。课程内容以飞书官方页面为准。',
    courseSource: '官方',
    difficulty: '入门',
    courseType: '单次课',
    tags: ['AI工具', '效率提升'],
    status: '已完结',
    instructor: '飞书官方',
    videoUrl: FEISHU_COURSE('7657807467513908407'),
    requirementOverride: 'elective',
    updatedAt: '2026-09-30T02:00:00.000Z',
  },
  {
    id: 'demo-official-bitable-webinar',
    title: '一表人才｜飞书多维表格实战课',
    summary: '飞书帮助中心视频课，分入门、进阶、函数、模板等篇章。课程内容以飞书官方页面为准。',
    courseSource: '官方',
    difficulty: '基础',
    courseType: '系列课',
    tags: ['产品功能', '实战案例'],
    status: '已完结',
    instructor: '飞书官方',
    videoUrl: 'https://www.feishu.cn/hc/zh-CN/academy/webinar_all_about_Bitable',
    requirementOverride: 'elective',
    updatedAt: '2026-09-18T02:00:00.000Z',
  },
  {
    id: 'demo-official-open-platform',
    title: '【直播】飞书大讲堂——飞书开放平台培训',
    summary: '飞书官方「飞行社」直播课，主题为飞书开放平台。课程内容以飞书官方页面为准。',
    courseSource: '官方',
    difficulty: '专家',
    courseType: '单次课',
    tags: ['产品功能'],
    status: '已完结',
    instructor: '飞书官方',
    videoUrl: FEISHU_COURSE('7633260469985217482'),
    requirementOverride: 'elective',
    updatedAt: '2026-09-12T02:00:00.000Z',
  },
  {
    id: 'demo-partner-agi-kb',
    title: '通往 AGI 之路：用飞书打造 500 万浏览量的 AI 学习知识库',
    summary: '飞书「飞行社」上的客户实践分享，共 2 节。课程内容以飞书官方页面为准。',
    courseSource: '合作方',
    difficulty: '进阶',
    courseType: '系列课',
    tags: ['实战案例', 'AI工具'],
    status: '已完结',
    instructor: '飞书社区',
    videoUrl: FEISHU_COURSE('7435588071252082690'),
    updatedAt: '2026-09-10T02:00:00.000Z',
  },
  {
    id: 'demo-internal-weekly',
    title: '【示例】用多维表格搭一张团队周报',
    summary: '虚构的内部课程示例：用多维表格记录每周进展，再用视图按负责人筛选。演示「投稿 → 审核 → 同步上线」后的课程形态。',
    courseSource: '内部',
    difficulty: '基础',
    courseType: '单次课',
    tags: ['效率提升', '实战案例'],
    status: '已完结',
    instructor: '周砚',
    instructorUserIds: ['10002'],
    docUrl: 'https://www.feishu.cn/hc/zh-CN/articles/541575577400',
    updatedAt: '2026-10-02T02:00:00.000Z',
  },
  {
    id: 'demo-internal-ai-onboarding',
    title: '【示例】新人第一周：AI 工具上手清单',
    summary: '虚构的内部课程示例：新同事第一周需要打开的 AI 工具与使用边界。课程资料链接到飞书帮助中心的公开文章。',
    courseSource: '内部',
    difficulty: '入门',
    courseType: '系列课',
    tags: ['AI工具', '快速上手'],
    status: '更新中',
    instructor: '周砚',
    instructorUserIds: ['10002'],
    docUrl: 'https://www.feishu.cn/hc/zh-CN/articles/086838008415',
    learningMode: 'self_study',
    updatedAt: '2026-10-06T02:00:00.000Z',
  },
  {
    id: 'demo-internal-retro-draft',
    title: '【示例】客户案例复盘模板',
    summary: '虚构的内部课程示例：审核通过后以「未上线」草稿形态进入课程库，等待管理员上线。',
    courseSource: '内部',
    difficulty: '进阶',
    courseType: '单次课',
    tags: ['方案场景'],
    status: '未上线',
    instructor: '许棠',
    instructorUserIds: ['10005'],
    docUrl: 'https://www.feishu.cn/hc/zh-CN/articles/474779587401',
    updatedAt: '2026-10-07T02:00:00.000Z',
  },
  {
    id: 'demo-internal-archived',
    title: '【示例】旧版报销流程说明（已下架）',
    summary: '虚构的内部课程示例：流程变更后下架，学习记录保留，可在管理后台恢复或预览删除影响。',
    courseSource: '内部',
    difficulty: '入门',
    courseType: '单次课',
    tags: ['产品功能'],
    status: '已下架',
    instructor: '沈清和',
    instructorUserIds: ['10003'],
    docUrl: 'https://www.feishu.cn/hc/zh-CN/articles/170735237222',
    updatedAt: '2026-08-21T02:00:00.000Z',
  },
];

export function seedCourses(): IAcademyCourse[] {
  return COURSE_SEEDS.map((seed, index) => ({
    id: seed.id,
    createdAt: seed.updatedAt,
    updatedAt: seed.updatedAt,
    title: seed.title,
    categoryId: '',
    series: '',
    difficulty: seed.difficulty,
    summary: seed.summary,
    coverUrl: coverFor(seed.title, index),
    status: seed.status,
    tags: seed.tags,
    topics: [],
    instructor: seed.instructor,
    instructorUserIds: seed.instructorUserIds ?? [],
    docUrl: seed.docUrl ?? '',
    videoUrl: seed.videoUrl ?? '',
    courseType: seed.courseType,
    sortOrder: index,
    courseSource: seed.courseSource,
    requirementType: 'elective',
    requirementOverride: seed.requirementOverride ?? 'auto',
    learningMode: seed.learningMode ?? 'quiz',
  }));
}

/** 已发布题库。官方课程只为帮助中心原文可核对的内容出题。 */
export const PUBLISHED_QUIZZES: Record<string, SeedQuizQuestion[]> = {
  'demo-official-bitable-start': [
    {
      question: '飞书帮助中心对多维表格的定位是？',
      options: { A: '一种表格形态的在线数据库', B: '只能离线使用的电子表格', C: '在线幻灯片工具', D: '即时通讯群组' },
      correctAnswer: 'A',
      explanation: '帮助中心开篇即说明多维表格是一种表格形态的在线数据库。',
      evidence: '《快速上手多维表格》开篇说明',
      learningPoint: '多维表格的定位',
    },
    {
      question: '下列哪一项不属于文章介绍的多维表格基础概念？',
      options: { A: '数据表', B: '视图', C: '字段', D: '幻灯片母版' },
      correctAnswer: 'D',
      explanation: '基础概念包括数据表、视图、记录、字段；幻灯片母版不属于多维表格。',
      evidence: '《快速上手多维表格》基础概念部分',
      learningPoint: '数据表、视图、记录、字段',
    },
    {
      question: '想按条件筛选、排序同一份数据的不同呈现方式，应该使用？',
      options: { A: '新建一个群聊', B: '切换或新建视图', C: '导出后再导入', D: '复制整张数据表' },
      correctAnswer: 'B',
      explanation: '文章说明可以切换视图来做筛选和排序，数据本身不需要复制。',
      evidence: '《快速上手多维表格》视图部分',
      learningPoint: '视图用于筛选与排序',
    },
  ],
  'demo-internal-weekly': [
    {
      question: '示例课程中，周报数据表里「负责人」最适合用哪种字段？',
      options: { A: '人员字段', B: '单行文本', C: '附件', D: '公式' },
      correctAnswer: 'A',
      explanation: '人员字段能直接关联成员，便于按负责人筛选和提醒。',
      evidence: '示例课程：字段设计',
      learningPoint: '按用途选择字段类型',
    },
    {
      question: '每位成员只想看到自己的周报条目，示例课程推荐的做法是？',
      options: { A: '每人复制一张表', B: '按负责人建立筛选视图', C: '把表格截图发群里', D: '删除他人记录' },
      correctAnswer: 'B',
      explanation: '同一张表配不同视图即可，避免数据分叉。',
      evidence: '示例课程：视图设计',
      learningPoint: '一张表，多种视图',
    },
  ],
};

/**
 * 预置的「AI 候选题」：演示版不调用任何模型。
 * 按出题资料（来源课程）索引；题目只使用《快速上手多维表格》中可核对的知识点，仍需人工审核后发布。
 */
const AI_CANDIDATES_BY_SOURCE: Record<string, ICourseQuizAdminQuestion[]> = {
  'demo-official-bitable-start': [
    {
      id: 'cand-bitable-1',
      sequence: 1,
      question: '在多维表格中，数据表里的一行数据被称为？',
      options: { A: '记录', B: '视图', C: '仪表盘', D: '工作流' },
      correctAnswer: 'A',
      explanation: '文章把数据表、视图、记录、字段列为基础概念，一行数据即一条记录。',
      evidence: '《快速上手多维表格》基础概念',
      learningPoint: '记录与字段',
      relevanceLevel: 'core',
      relevanceReason: '课程入门的核心概念',
    },
    {
      id: 'cand-bitable-2',
      sequence: 2,
      question: '想把表格数据汇总成图表看板，文章介绍的功能是？',
      options: { A: '导入导出', B: '仪表盘', C: '高级权限', D: '记录评论' },
      correctAnswer: 'B',
      explanation: '文章在进阶部分介绍了用仪表盘展示汇总数据。',
      evidence: '《快速上手多维表格》仪表盘部分',
      learningPoint: '仪表盘',
      relevanceLevel: 'core',
      relevanceReason: '与实战课的数据展示主题直接相关',
    },
    {
      id: 'cand-bitable-3',
      sequence: 3,
      question: '需要控制不同成员能看到、能编辑哪些数据时，应使用？',
      options: { A: '视图排序', B: '公式字段', C: '高级权限', D: '导出为 Excel' },
      correctAnswer: 'C',
      explanation: '文章将高级权限列为控制成员可见与可编辑范围的功能。',
      evidence: '《快速上手多维表格》高级权限部分',
      learningPoint: '高级权限',
      relevanceLevel: 'supporting',
      relevanceReason: '协作场景的补充要点',
    },
  ],
};

/** 已为哪些资料预置了候选题，供题库状态与资料选择使用。 */
export const AI_SOURCE_IDS = Object.keys(AI_CANDIDATES_BY_SOURCE);

export function aiCandidatesFor(sourceCourseIds: string[]): ICourseQuizAdminQuestion[] | null {
  const hit = sourceCourseIds.find((id) => AI_CANDIDATES_BY_SOURCE[id]);
  return hit ? AI_CANDIDATES_BY_SOURCE[hit].map((q) => ({ ...q, options: { ...q.options } })) : null;
}

export function seedSubmissions(): ICourseSubmission[] {
  const base = {
    department: '',
    departmentId: '',
    departmentOpenId: '',
    category: '',
    categoryId: '',
    videoUrl: '',
    coverUrl: '',
    syncStatus: 'not_synced' as const,
    quizSyncStatus: 'not_synced' as const,
    quizSyncError: '',
    legacyAudience: '',
    formalCourseRecordId: '',
    reviewNote: '',
  };
  return [
    {
      ...base,
      id: 'sub-weekly',
      title: '【示例】用多维表格搭一张团队周报',
      summary: '虚构示例：用多维表格记录每周进展，再用视图按负责人筛选。',
      targetDepartments: [{ departmentId: 'od-demo-tech', larkDepartmentId: 'od-demo-tech', openDepartmentId: 'od-demo-tech', name: '技术部' }],
      department: '技术部',
      departmentId: 'od-demo-tech',
      departmentOpenId: 'od-demo-tech',
      difficulty: '基础',
      instructor: '周砚',
      instructorUserId: '10002',
      docUrl: 'https://www.feishu.cn/hc/zh-CN/articles/541575577400',
      tags: ['效率提升', '实战案例'],
      requiresQuiz: true,
      status: 'approved_pending_sync',
      syncStatus: 'synced',
      quizSyncStatus: 'synced',
      formalCourseRecordId: 'demo-internal-weekly',
      submitterUserId: '10002',
      submitterName: '周砚',
      submittedAt: '2026-09-29T03:00:00.000Z',
      reviewNote: '内容清晰，已同步上线。',
    },
    {
      ...base,
      id: 'sub-onboarding',
      title: '【示例】新人第一周：AI 工具上手清单',
      summary: '虚构示例：新同事第一周需要打开的 AI 工具与使用边界。',
      targetDepartments: [],
      difficulty: '入门',
      instructor: '周砚',
      instructorUserId: '10002',
      docUrl: 'https://www.feishu.cn/hc/zh-CN/articles/086838008415',
      tags: ['AI工具', '快速上手'],
      requiresQuiz: false,
      status: 'approved_pending_sync',
      syncStatus: 'synced',
      quizSyncStatus: 'legacy',
      formalCourseRecordId: 'demo-internal-ai-onboarding',
      submitterUserId: '10002',
      submitterName: '周砚',
      submittedAt: '2026-10-03T03:00:00.000Z',
      reviewNote: '无需课后题，按自学课程上线。',
    },
    {
      ...base,
      id: 'sub-meeting-notes',
      title: '【示例】销售周会：用 AI 整理会议纪要',
      summary: '虚构示例：把周会录音转成纪要，再提取客户跟进事项。等待管理员审核。',
      targetDepartments: [{ departmentId: 'od-demo-sales', larkDepartmentId: 'od-demo-sales', openDepartmentId: 'od-demo-sales', name: '销售部' }],
      department: '销售部',
      departmentId: 'od-demo-sales',
      departmentOpenId: 'od-demo-sales',
      difficulty: '基础',
      instructor: '许棠',
      instructorUserId: '10005',
      docUrl: 'https://www.feishu.cn/hc/zh-CN/articles/467517575785',
      tags: ['AI工具', '效率提升'],
      requiresQuiz: true,
      status: 'pending_review',
      submitterUserId: '10005',
      submitterName: '许棠',
      submittedAt: '2026-10-08T06:30:00.000Z',
    },
    {
      ...base,
      id: 'sub-xhs-ideas',
      title: '【示例】小红书选题灵感库搭建',
      summary: '虚构示例：员工林知夏保存中的投稿草稿，还没提交审核。',
      targetDepartments: [{ departmentId: 'od-demo-marketing', larkDepartmentId: 'od-demo-marketing', openDepartmentId: 'od-demo-marketing', name: '市场部' }],
      department: '市场部',
      departmentId: 'od-demo-marketing',
      departmentOpenId: 'od-demo-marketing',
      difficulty: '入门',
      instructor: '林知夏',
      instructorUserId: '10001',
      docUrl: '',
      tags: ['实战案例'],
      requiresQuiz: false,
      status: 'draft',
      submitterUserId: '10001',
      submitterName: '林知夏',
      submittedAt: '',
    },
    {
      ...base,
      id: 'sub-rejected',
      title: '【示例】活动海报一键生成',
      summary: '虚构示例：被退回修改的投稿，退回意见会显示给投稿人。',
      targetDepartments: [],
      difficulty: '入门',
      instructor: '林知夏',
      instructorUserId: '10001',
      docUrl: 'https://www.feishu.cn/hc/zh-CN/articles/474779587401',
      tags: ['AI工具'],
      requiresQuiz: false,
      status: 'rejected',
      submitterUserId: '10001',
      submitterName: '林知夏',
      submittedAt: '2026-09-26T03:00:00.000Z',
      reviewNote: '请补充操作步骤截图和适用部门后再提交。',
    },
  ];
}

export function seedSubmissionQuestions(): Record<string, ISubmissionQuizQuestion[]> {
  const q = (id: string, sequence: number, question: string, options: Record<Option, string>, correctAnswer: Option, explanation: string): ISubmissionQuizQuestion => ({
    id,
    sequence,
    question,
    options,
    correctAnswer,
    explanation,
    evidence: '示例课程资料',
    learningPoint: '',
    authoringSource: 'manual',
    status: 'pending_review',
    formalQuestionRecordId: '',
    syncError: '',
  });
  return {
    'sub-meeting-notes': [
      q('sq-1', 1, '整理会议纪要前，示例课程建议先做什么？', { A: '确认录音已获参会人同意', B: '直接群发原始录音', C: '删除录音', D: '先写结论' }, 'A', '录音与转写涉及参会人信息，需要先确认同意。'),
      q('sq-2', 2, '从纪要里提取客户跟进事项时，每条事项至少要有？', { A: '负责人与截止时间', B: '表情包', C: '会议时长', D: '会议室编号' }, 'A', '有负责人和时间才能跟进闭环。'),
    ],
  };
}
