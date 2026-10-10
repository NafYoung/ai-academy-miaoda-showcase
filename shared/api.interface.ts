export interface ICategory {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  sortOrder: number;
}

/** 通过带登录态和 CSRF 头的请求解析，附件地址仅用于当次图片加载。 */
export interface IAcademyCoverResponse {
  url: string;
}

/** 手机图文阅读只返回已审核内部课程的正文；图片按块 ID 单独鉴权。 */
export interface IMobileDocumentTextBlock {
  kind: 'text';
  id: string;
  style: 'paragraph' | 'heading' | 'bullet' | 'ordered' | 'quote' | 'code' | 'todo';
  text: string;
  headingLevel?: number;
  checked?: boolean;
}

export interface IMobileDocumentImageBlock {
  kind: 'image';
  id: string;
  altText: string;
}

export interface IMobileDocumentDividerBlock {
  kind: 'divider';
  id: string;
}

export interface IMobileDocumentUnsupportedBlock {
  kind: 'unsupported';
  id: string;
  label: string;
}

export type IMobileDocumentBlock =
  | IMobileDocumentTextBlock
  | IMobileDocumentImageBlock
  | IMobileDocumentDividerBlock
  | IMobileDocumentUnsupportedBlock;

export interface IMobileDocumentResponse {
  title: string;
  blocks: IMobileDocumentBlock[];
}

/** Mobile-only resource classification. File credentials/tokens stay server-side. */
export interface IMobileCourseResource {
  kind: 'document' | 'pdf' | 'unsupported';
  src: string;
}

/** 目录请求通过 coverMode 显式声明支持鉴权取址；省略时兼容旧版 img。 */
export const ACADEMY_COVER_REFERENCE_MODE = 'reference-v1';

export interface IAcademyQuizSourceFile {
  name: string;
  size: number;
  type: string;
  tmpUrl: string;
}

export type CourseRequirementType = 'required' | 'elective';
export type CourseLearningMode = 'self_study' | 'quiz';

/** 投稿时保存的最小部门对象；派课以 openDepartmentId 为稳定关联键。 */
export interface ICourseTargetDepartment {
  /** 妙搭部门 ID，用于 DepartmentSelect 回显。 */
  departmentId: string;
  /** 飞书自定义部门 ID；上游未返回时为空。 */
  larkDepartmentId: string;
  /** 飞书 open_department_id（od- 前缀），用于部门树与员工关系匹配。 */
  openDepartmentId: string;
  name: string;
}

export interface IAcademyCourse {
  id: string;
  /** 课程创建时间（如数据源提供），ISO 8601。 */
  createdAt?: string;
  /** 课程更新时间；无源时间时保留目录发现业务变更的时间，ISO 8601。 */
  updatedAt?: string;
  title: string;
  /** 已移除分类；仅兼容旧客户端，固定为空。 */
  categoryId: string;
  /** 已移除系列；仅兼容旧客户端，固定为空。 */
  series: string;
  difficulty: string;
  summary: string;
  coverUrl: string;
  /** 当前附件身份的摘要；用于换图时更新缓存，不包含临时签名。 */
  coverVersion?: string;
  status: string;
  tags: string[];
  /** Base「专题」多选值；可选，旧快照缺失时视为空。 */
  topics?: string[];
  instructor: string;
  /** Base「讲师」人员字段返回的妙搭用户 ID */
  instructorUserIds: string[];
  /** 课程文档链接（云文档或外链） */
  docUrl: string;
  /** 视频链接 / 回放（飞书妙记或外链）；对应 Base「视频链接」 */
  videoUrl: string;
  courseType: string;
  sortOrder: number;
  courseSource: string;
  /** 全局修读要求含管理员覆盖；自动模式的个人部门要求由学习服务解析。 */
  requirementType: CourseRequirementType;
  /** 管理员覆盖优先于来源和部门规则；历史课程缺省为 auto。 */
  requirementOverride?: CourseRequirementOverride;
  /** Base「学习方式」；历史快照缺失时按 quiz 兼容。 */
  learningMode?: CourseLearningMode;
  /** 仅题库后台按需读取；公开课程接口不会返回这些临时下载地址。 */
  quizSourceFiles?: IAcademyQuizSourceFile[];
}

export type AcademyDataSourceState = 'fresh' | 'stale' | 'unavailable';

export interface IAcademyDataSourceStatus {
  state: AcademyDataSourceState;
  /** ISO 8601；从未成功读取时为 null。 */
  lastSuccessfulAt: string | null;
}

export interface IAcademyCourseDataSourceStatus {
  courses: IAcademyDataSourceStatus;
  series: IAcademyDataSourceStatus;
}

export interface IAcademyCourseListResponse {
  courses: IAcademyCourse[];
  dataSource: IAcademyCourseDataSourceStatus;
}

export type AdminCourseStatus =
  | '未上线'
  | '更新中'
  | '已完结'
  | '已下架'
  | '归档';

export interface IAdminCourseListResponse {
  courses: IAcademyCourse[];
}

export interface IAdminCourseStatusUpdateInput {
  status: AdminCourseStatus;
}

/** 服务端根据原生管理员角色、讲师字段和投稿归属分别计算。 */
export interface ICourseManagementPermissions {
  canEditContent: boolean;
  canManageQuiz: boolean;
  canManageLifecycle: boolean;
  canPublishQuiz: boolean;
}

export interface IManagedCourse {
  course: IAcademyCourse;
  permissions: ICourseManagementPermissions;
  /** 防止用旧页面覆盖后续修改；不是身份或授权凭证。 */
  revision: string;
}

export interface IManagedCourseListResponse {
  isAdmin: boolean;
  courses: IManagedCourse[];
}

/** 仅开放已有正式 Base 写入合同支持的内容字段。 */
export interface ICourseContentFields {
  title: string;
  summary: string;
  difficulty: string;
  tags: string[];
  docUrl: string;
  videoUrl: string;
  courseType: string;
}

export interface ICourseContentUpdateInput {
  revision: string;
  changes: Partial<ICourseContentFields>;
}

export interface ICourseContentUpdateResult extends IManagedCourse {
  /** 正式 Base 已保存，但目录快照可能刷新失败，界面必须明确提示。 */
  catalogSynced: boolean;
}

/** 每次只改一项，避免封面、人员关联和学习任务跨系统部分保存。 */
export type CourseAdminSettingChange =
  | { kind: 'cover'; coverUrl: string }
  | { kind: 'instructors'; userIds: string[] }
  | { kind: 'source'; resourceSource: 'internal' | 'external' }
  | { kind: 'requirement'; requirementOverride: CourseRequirementOverride };

export type CourseRequirementOverride = 'auto' | 'required' | 'elective';

export interface ICourseAdminSettingsUpdateInput {
  revision: string;
  change: CourseAdminSettingChange;
  confirmed: true;
}

export interface ICourseAdminSettingsUpdateResult extends ICourseContentUpdateResult {
  /** 来源已保存，但学习任务可能仍需重试同步。 */
  assignmentsSynced: boolean;
}

export interface IAdminCourseDeletionCounts {
  lessonRecords: number;
  quizRecords: number;
  learningAssignments: number;
  learningDeadlines: number;
  deadlineExtensions: number;
  learningTimeSessions: number;
  reminderLogs: number;
  targetDepartments: number;
  linkedSubmissions: number;
}

export interface IAdminCourseDeletedCounts {
  lessonRecords: number;
  quizRecords: number;
  learningAssignments: number;
  learningDeadlines: number;
  deadlineExtensions: number;
  learningTimeSessions: number;
  reminderLogs: number;
  targetDepartments: number;
}

export interface IAdminCourseDeletionPreview {
  course: IAcademyCourse;
  counts: IAdminCourseDeletionCounts;
  canDelete: boolean;
  blockingReasons: string[];
  preservedSubmissionCount: number;
  previewToken: string;
}

export interface IAdminCourseDeleteInput {
  confirmed: true;
  confirmationText: string;
  deleteLearningHistory: true;
  previewToken: string;
}

export interface IAdminCourseDeleteResult {
  courseId: string;
  courseTitle: string;
  deletedAt: string;
  deletedCounts: IAdminCourseDeletedCounts;
  preservedSubmissionCount: number;
}

export type AcademyCatalogSyncSource = 'bootstrap' | 'manual' | 'daily';
export type AcademyCatalogSyncState =
  | 'never_synced'
  | 'ready'
  | 'stale'
  | 'failed';

/** 管理后台课程目录同步状态。同步过程只调用普通 Base 读取能力，不使用 AI。 */
export interface IAcademyCatalogSyncStatus {
  state: AcademyCatalogSyncState;
  categoryCount: number;
  courseCount: number;
  lastSyncSource: AcademyCatalogSyncSource | '';
  lastAttemptAt: string | null;
  lastSuccessfulAt: string | null;
  lastFailureReason: string;
  staleAfterHours: number;
  aiUsed: false;
}

export interface IAcademyCatalogSyncResult extends IAcademyCatalogSyncStatus {
  /** 业务内容哈希未变化时为 false；仍刷新附件地址和同步元数据。 */
  changed: boolean;
}

export interface ILesson {
  id: string;
  title: string;
  courseId: string;
  summary: string;
  contentUrl: string;
  duration: string;
  lessonNo: string;
  sortOrder: number;
}

export type CourseSubmissionStatus =
  | 'draft'
  | 'pending_review'
  | 'approved_pending_sync'
  | 'rejected';

export type CourseSubmissionSyncStatus =
  | 'not_synced'
  | 'synced'
  | 'sync_failed';

export type CourseSubmissionQuizSyncStatus =
  | 'legacy'
  | 'not_synced'
  | 'synced'
  | 'sync_failed';

export interface ICourseCoverUploadResponse {
  /** 妙搭文件的稳定地址，保存到投稿；不包含临时签名。 */
  coverUrl: string;
  /** 本次上传后的即时预览地址，不持久化。 */
  previewUrl: string;
}

export interface ICourseSubmissionInput {
  title: string;
  summary: string;
  department: string;
  departmentId: string;
  departmentOpenId: string;
  targetDepartments: ICourseTargetDepartment[];
  /** 兼容历史投稿字段；新投稿为空，不再参与同步。 */
  category: string;
  /** 兼容旧客户端输入；分类已移除，此值不再使用。 */
  categoryId?: string;
  difficulty: string;
  /** 投稿草稿写入时忽略客户端值，使用登录账号姓名；审核时管理员可纠正。 */
  instructor: string;
  docUrl: string;
  videoUrl: string;
  coverUrl: string;
  tags: string[];
  /** 新投稿默认无需课后题；更新时省略则保留草稿原有选择。 */
  requiresQuiz?: boolean;
}

export type ICourseSubmissionDraftInput = Partial<ICourseSubmissionInput>;

export interface ICourseSubmission extends ICourseSubmissionInput {
  id: string;
  /** 服务端绑定的妙搭账号 ID，全程保持字符串。 */
  instructorUserId?: string;
  status: CourseSubmissionStatus;
  syncStatus: CourseSubmissionSyncStatus;
  quizSyncStatus: CourseSubmissionQuizSyncStatus;
  quizSyncError: string;
  requiresQuiz: boolean;
  /** 仅用于展示迁移前的自由文本，不参与派课。 */
  legacyAudience: string;
  formalCourseRecordId: string;
  submitterUserId: string;
  submitterName: string;
  submittedAt: string;
  reviewNote: string;
}

export interface ICourseSyncFieldPreview {
  targetField: string;
  value: string | string[] | number;
  note?: string;
}

export interface ICourseSyncPreview {
  submission: ICourseSubmission;
  canSync: boolean;
  alreadySynced: boolean;
  willRecoverExistingRecord: boolean;
  blockingReasons: string[];
  warnings: string[];
  targetFields: ICourseSyncFieldPreview[];
}

export interface ICourseSyncInput {
  confirmed: true;
}

export interface ICourseSyncResult {
  submissionId: string;
  formalCourseRecordId: string;
  courseTitle: string;
  alreadySynced: boolean;
  recoveredExistingRecord: boolean;
  quizSyncStatus: CourseSubmissionQuizSyncStatus;
  quizQuestionCount: number;
}

export type SubmissionQuizQuestionAuthoringSource =
  | 'manual'
  | 'excel_import'
  | 'ai_generated_confirmed'
  | 'ai_assisted';

export type SubmissionQuizQuestionStatus =
  | 'draft'
  | 'pending_review'
  | 'synced'
  | 'invalidated';

export interface ISubmissionQuizQuestionInput {
  sequence: number;
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  evidence: string;
  learningPoint: string;
  authoringSource: SubmissionQuizQuestionAuthoringSource;
}

export interface ISubmissionQuizQuestion extends ISubmissionQuizQuestionInput {
  id: string;
  status: SubmissionQuizQuestionStatus;
  formalQuestionRecordId: string;
  syncError: string;
}

export interface ISubmissionQuizQuestionsUpdateInput {
  questions: ISubmissionQuizQuestionInput[];
}

export type LearningEventType =
  | 'view_course'
  | 'open_video'
  | 'open_doc'
  | 'mark_complete';

export type LearningActivityEventType = Exclude<
  LearningEventType,
  'mark_complete'
>;

export interface ILearningEventInput {
  eventType: LearningActivityEventType;
  courseTitle: string;
}

export interface ILearningProgress {
  id: string;
  courseId: string;
  courseTitle: string;
  status: 'in_progress' | 'completed';
  progressPercent: number;
  openedResources: LearningEventType[];
  lastResource: string;
  lastActivityAt: string;
  userId: string;
  userName: string;
  quizVersion: string;
  correctQuestionNumbers: number[];
  quizCorrectCount: number;
  quizAttemptCount: number;
  lastQuizAt: string;
}

export type LearningTimeSessionState = 'active' | 'paused' | 'ended';

export type LearningTimeSessionAction =
  | 'heartbeat'
  | 'pause'
  | 'resume'
  | 'end';

export interface ILearningTimeSession {
  sessionId: string;
  courseId: string;
  state: LearningTimeSessionState;
  creditedSeconds: number;
  lastSequence: number;
  leaseToken: string;
  heartbeatIntervalSeconds: number;
  serverStartedAt: string;
}

export interface ILearningTimeSessionUpdateInput {
  action: LearningTimeSessionAction;
  sequence: number;
  cumulativeActiveMs: number;
  leaseToken?: string;
}

export type LearningAssignmentSource =
  | 'required_auto'
  | 'elective_enrollment'
  | 'legacy_activity';

export type LearningAssignmentStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed';

export interface IEmployeeRosterItemInput {
  /** 妙搭用户 ID（纯数字字符串）；不得传飞书 open_id / employee_id。 */
  userId: string;
  userName: string;
  /** 直属部门的飞书 open_department_id。 */
  departmentId?: string;
  departmentName?: string;
  departments?: IEmployeeDepartmentInput[];
}

export interface IEmployeeDepartmentInput {
  departmentId: string;
  departmentName: string;
  isPrimary: boolean;
}

export interface IEmployeeRosterPreviewInput {
  employees: IEmployeeRosterItemInput[];
  /** 只有客户端完整读完全部分页后才能为 true。 */
  snapshotComplete: boolean;
}

export interface IEmployeeRosterSyncInput extends IEmployeeRosterPreviewInput {
  /** 预览接口基于同一份名单与当前数据库状态生成的校验令牌。 */
  previewToken: string;
}

export interface IEmployeeRosterPreviewResult {
  previewToken: string;
  incomingEmployeeCount: number;
  currentActiveEmployeeCount: number;
  addEmployeeCount: number;
  updateEmployeeCount: number;
  reactivateEmployeeCount: number;
  unchangedEmployeeCount: number;
  inactivateEmployeeCount: number;
  incomingMembershipCount: number;
  activateMembershipCount: number;
  inactivateMembershipCount: number;
  employeeWithoutDepartmentCount: number;
  requiredCourseCount: number;
  /** 全员必修课程数：兼容字段名，包含管理员强制必修并排除强制选修。 */
  officialRequiredCourseCount: number;
  departmentRequiredCourseCount: number;
}

export interface IEmployeeRosterSyncResult {
  activeEmployeeCount: number;
  inactiveEmployeeCount: number;
  requiredCourseCount: number;
  /** 全员必修课程数：兼容字段名，包含管理员强制必修并排除强制选修。 */
  officialRequiredCourseCount: number;
  departmentRequiredCourseCount: number;
  createdAssignmentCount: number;
  updatedAssignmentCount: number;
  syncedAt: string;
}

export interface IOrganizationDepartmentInput {
  departmentId: string;
  departmentName: string;
  parentDepartmentId: string;
}

export interface IOrganizationSyncInput {
  departments: IOrganizationDepartmentInput[];
  /** 只有完整读取部门树全部分页后才能为 true。 */
  snapshotComplete: boolean;
}

export interface IOrganizationSyncResult {
  activeDepartmentCount: number;
  inactiveDepartmentCount: number;
  syncedAt: string;
}

export interface IOrganizationSnapshotStatus {
  activeDepartmentCount: number;
  lastSyncedAt: string;
  ready: boolean;
}

export type LearningDeadlineStatus =
  | 'unavailable'
  | 'not_activated'
  | 'on_track'
  | 'due_soon'
  | 'overdue'
  | 'completed'
  | 'completed_late'
  | 'not_applicable';

export interface ILearningDeadlineFields {
  deadlineAt?: string;
  deadlineStartedAt?: string;
  deadlineStatus?: LearningDeadlineStatus;
}

export interface ILearningDeadlineExtensionInput {
  deadlineAt: string;
  reason: string;
}

export interface ILearningAssignment extends ILearningDeadlineFields {
  id: string;
  courseId: string;
  courseTitle: string;
  requirementType: CourseRequirementType;
  assignmentSource: LearningAssignmentSource;
  status: LearningAssignmentStatus;
  progressPercent: number;
  assignedAt: string;
  lastActivityAt: string;
  matchedDepartmentId: string;
  matchedDepartmentName: string;
}

export interface ICourseEnrollmentStatus {
  courseId: string;
  requirementType: CourseRequirementType;
  enrolled: boolean;
  assignment: ILearningAssignment | null;
}

/** Legacy stages remain readable; new delivery only emits new_required/due_soon. */
export type LearningReminderStage =
  | 'first'
  | 'deadline'
  | 'overdue'
  | 'new_required'
  | 'due_soon';

export type LearningReminderState =
  | 'not_applicable'
  | 'not_due'
  | 'due'
  | 'sent'
  | 'delivery_disabled'
  | 'pending_confirmation'
  | 'completed';

export interface IAdminLearningMonitoringQuery {
  page?: number;
  pageSize?: number;
  courseId?: string;
  userId?: string;
  keyword?: string;
  status?: LearningAssignmentStatus;
  requirementType?: CourseRequirementType;
}

export interface IAdminLearningMonitoringItem extends ILearningDeadlineFields {
  assignmentId?: string;
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  requirementType: CourseRequirementType;
  assignmentSource: LearningAssignmentSource;
  matchedDepartmentId: string;
  matchedDepartmentName: string;
  assignedAt: string;
  activeDurationSeconds: number;
  sessionCount: number;
  progressPercent: number;
  status: LearningAssignmentStatus;
  quizCorrectCount: number;
  quizAttemptCount: number;
  lastResource: string;
  lastActivityAt: string;
  reminderState: LearningReminderState;
  reminderStage: LearningReminderStage | null;
  reminderDueAt: string;
  reminderLastSentAt: string;
}

export interface IAdminLearningMonitoringSummary {
  activeEmployeeCount: number;
  inactiveEmployeeCount: number;
  requiredAssignmentCount: number;
  electiveEnrollmentCount: number;
  notStartedCount: number;
  reminderDueCount: number;
  reminderDeliveryEnabled: boolean;
  rosterLastSyncedAt: string;
}

export interface IAdminLearningMonitoringResponse {
  items: IAdminLearningMonitoringItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: IAdminLearningMonitoringSummary;
}

export interface ICourseQuizQuestion {
  id: string;
  sequence: number;
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  answeredCorrectly: boolean;
  review?: {
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    explanation: string;
  };
}

export interface ICourseQuiz {
  courseId: string;
  version: string;
  totalQuestions: number;
  correctCount: number;
  remainingCount: number;
  completed: boolean;
  questions: ICourseQuizQuestion[];
}

/** 员工课程页只展示可用的已发布题库；暂未提供时返回 null。 */
export type CourseQuizResponse = ICourseQuiz | null;

export interface ICourseQuizSubmittedAnswer {
  questionId: string;
  answer: 'A' | 'B' | 'C' | 'D';
}

export interface ICourseQuizAnswerInput {
  answers: ICourseQuizSubmittedAnswer[];
}

export interface ICourseQuizQuestionResult {
  questionId: string;
  correct: boolean;
}

export interface ICourseQuizAnswerResult {
  results: ICourseQuizQuestionResult[];
  quiz: ICourseQuiz;
  progress: ILearningProgress;
}

export type CourseQuizPreparationStatus =
  | 'ready'
  | 'draft'
  | 'generating'
  | 'not_required'
  | 'missing'
  | 'outdated'
  | 'failed'
  | 'no_source'
  | 'awaiting_submission_questions'
  | 'unsupported_source';

export type CourseQuizAuthoringSource =
  | 'ai'
  | 'manual'
  | 'excel_import'
  | 'ai_generated_confirmed'
  | 'ai_assisted'
  | 'legacy';

export type CourseQuizSourceType =
  | 'file'
  | 'image'
  | 'document'
  | 'minutes'
  | 'collection'
  | 'none';

export interface ICourseQuizAdminStatus {
  courseId: string;
  courseTitle: string;
  courseStatus: string;
  courseSource: string;
  authoringSource: CourseQuizAuthoringSource;
  sourceUrl: string;
  sourceType: CourseQuizSourceType;
  preparationStatus: CourseQuizPreparationStatus;
  questionCount: number;
  version: string;
  draftQuestionCount: number;
  draftVersion: string;
  lastError: string;
  lastGeneratedAt: string;
}

export interface ICourseQuizPrepareInput {
  force: boolean;
  /** 题库归属 courseId 不必与资料来源相同；多项表示专题集合。 */
  sourceCourseIds: string[];
}

export interface ICourseQuizSourceOption {
  courseId: string;
  courseTitle: string;
  courseStatus: string;
  courseSource: string;
  sourceType: Exclude<CourseQuizSourceType, 'none' | 'collection'>;
  sourceCount: number;
}

export type CourseQuizRelevanceLevel = 'core' | 'supporting';

export interface ICourseQuizAdminQuestion {
  id: string;
  sequence: number;
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  evidence: string;
  learningPoint: string;
  relevanceLevel: CourseQuizRelevanceLevel;
  relevanceReason: string;
}

export interface ICourseQuizAdminDraft {
  courseId: string;
  courseTitle: string;
  courseSource: string;
  authoringSource: CourseQuizAuthoringSource;
  version: string;
  sourceUrl: string;
  sourceType: Exclude<CourseQuizSourceType, 'none'>;
  sourceLabel: string;
  courseGoal: string;
  generatedAt: string;
  questions: ICourseQuizAdminQuestion[];
}

export interface ICourseQuizAdminQuestionUpdate {
  id: string;
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface ICourseQuizDraftUpdateInput {
  /** 保存基于该版本；questions 可为非空子集，省略的题目从草稿移除。 */
  version: string;
  questions: ICourseQuizAdminQuestionUpdate[];
}

export interface ICourseQuizPublishInput {
  version: string;
}

export interface IPlatformSession {
  userId: string;
  userName: string;
  roles: string[];
  isAdmin: boolean;
  adminRoleConfigured: boolean;
}

export type PlatformIdentityProbeStatus =
  | 'org_employee'
  | 'external_learner'
  | 'other_tenant_employee'
  | 'external_user'
  | 'unsupported';

export type PlatformIdentityUserIdFormat =
  | 'numeric'
  | 'non_numeric'
  | 'missing';

export type PlatformIdentityLearningAccess = 'enabled' | 'pending' | 'blocked';

/**
 * 只读身份探测结果。不得包含原始用户 ID、姓名、手机号或邮箱。
 */
export interface IPlatformIdentityProbe {
  status: PlatformIdentityProbeStatus;
  organizationLabel: string;
  tenantId: string;
  userType: string;
  userIdFormat: PlatformIdentityUserIdFormat;
  learningAccess: PlatformIdentityLearningAccess;
  message: string;
  privacyNote: string;
}

export interface IPlatformManagementAccess {
  canManageCourses: boolean;
  /** 兼容旧题库入口，所有课程管理者均保留原题库权限。 */
  canManageCourseQuizzes: boolean;
}

export interface IPlatformAdminOverview {
  courseCount: number;
  submissionCount: number;
  pendingSubmissionCount: number;
  approvedSubmissionCount: number;
  rejectedSubmissionCount: number;
  learnerCount: number;
  completedLearningCount: number;
  activeLearningCount: number;
}

export interface ISubmissionReviewInput {
  action: 'approve' | 'reject';
  note: string;
  /** 管理员在审核通过时可纠正代传课程的讲师姓名。 */
  instructor?: string;
  /** 仅管理员审核可选择实际讲师账号。 */
  instructorUserId?: string;
}

export interface ISubmissionReferencesInput {
  /** 兼容旧客户端，忽略分类输入。 */
  categoryId?: string;
  instructorUserId: string;
  instructor: string;
}
