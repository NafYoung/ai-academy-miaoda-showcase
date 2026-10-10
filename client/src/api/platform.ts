import { logger } from '@lark-apaas/client-toolkit/logger';
import { requestForManagement } from './management-request';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AdminCourseStatus,
  IAdminLearningMonitoringQuery,
  IAdminLearningMonitoringResponse,
  IAdminCourseDeleteInput,
  IAdminCourseDeleteResult,
  IAdminCourseDeletionPreview,
  IAdminCourseListResponse,
  IAcademyCourse,
  IAcademyCatalogSyncResult,
  IAcademyCatalogSyncStatus,
  ICourseSubmission,
  ICourseCoverUploadResponse,
  ICourseSubmissionDraftInput,
  ICourseSubmissionInput,
  ICourseQuizAdminStatus,
  ICourseQuizAdminDraft,
  ICourseQuizDraftUpdateInput,
  ICourseQuizSourceOption,
  CourseQuizResponse,
  ICourseQuizAnswerInput,
  ICourseQuizAnswerResult,
  ICourseQuizPrepareInput,
  ICourseQuizPublishInput,
  ICourseSyncPreview,
  ICourseSyncResult,
  ICourseEnrollmentStatus,
  IEmployeeRosterPreviewInput,
  IEmployeeRosterPreviewResult,
  IEmployeeRosterSyncInput,
  IEmployeeRosterSyncResult,
  ILearningAssignment,
  ILearningDeadlineExtensionInput,
  ILearningEventInput,
  ILearningProgress,
  ILearningTimeSession,
  ILearningTimeSessionUpdateInput,
  IPlatformAdminOverview,
  IPlatformIdentityProbe,
  IPlatformManagementAccess,
  IPlatformSession,
  IOrganizationSnapshotStatus,
  IOrganizationSyncInput,
  IOrganizationSyncResult,
  ISubmissionReviewInput,
  ISubmissionReferencesInput,
  ISubmissionQuizQuestion,
  ISubmissionQuizQuestionsUpdateInput,
} from '@shared/api.interface';

export async function getSession(): Promise<IPlatformSession> {
  const response = await axiosForBackend({
    url: '/api/platform/session',
    method: 'GET',
  });
  return response.data;
}

export async function getIdentityProbe(): Promise<IPlatformIdentityProbe> {
  const response = await axiosForBackend({
    url: '/api/platform/identity-probe',
    method: 'GET',
  });
  return response.data;
}

export async function getManagementAccess(): Promise<IPlatformManagementAccess> {
  const response = await axiosForBackend({
    url: '/api/platform/management-access',
    method: 'GET',
  });
  return response.data;
}

export async function createSubmission(
  input: ICourseSubmissionInput,
): Promise<ICourseSubmission> {
  return createSubmissionDraft(input);
}

export async function createSubmissionDraft(
  input: ICourseSubmissionDraftInput,
): Promise<ICourseSubmission> {
  try {
    const response = await axiosForBackend({
      url: '/api/platform/submissions/drafts',
      method: 'POST',
      data: input,
    });
    return response.data;
  } catch (error) {
    logger.error('提交课程失败', error);
    throw error;
  }
}

export async function updateSubmissionDraft(
  id: string,
  input: ICourseSubmissionDraftInput,
): Promise<ICourseSubmission> {
  const response = await axiosForBackend({
    url: `/api/platform/submissions/${id}/draft`,
    method: 'PATCH',
    data: input,
  });
  return response.data;
}

export async function uploadSubmissionCover(
  file: File,
): Promise<ICourseCoverUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosForBackend({
    url: '/api/platform/submissions/cover-upload',
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function getSubmissionQuestions(
  id: string,
): Promise<ISubmissionQuizQuestion[]> {
  const response = await axiosForBackend({
    url: `/api/platform/submissions/${id}/questions`,
    method: 'GET',
  });
  return response.data;
}

export async function saveSubmissionQuestions(
  id: string,
  input: ISubmissionQuizQuestionsUpdateInput,
): Promise<ISubmissionQuizQuestion[]> {
  const response = await axiosForBackend({
    url: `/api/platform/submissions/${id}/questions`,
    method: 'PUT',
    data: input,
  });
  return response.data;
}

export async function submitSubmission(id: string): Promise<ICourseSubmission> {
  const response = await axiosForBackend({
    url: `/api/platform/submissions/${id}/submit`,
    method: 'POST',
  });
  return response.data;
}

export async function getMySubmissions(): Promise<ICourseSubmission[]> {
  const response = await axiosForBackend({
    url: '/api/platform/submissions/mine',
    method: 'GET',
  });
  return response.data;
}

/** Mark a course complete only when the server confirms there is no published quiz. */
export async function markCourseComplete(
  courseId: string,
): Promise<ILearningProgress> {
  const response = await axiosForBackend({
    url: `/api/platform/learning/${encodeURIComponent(courseId)}/complete`,
    method: 'POST',
  });
  if (response.status >= 400) throw new Error('课程完成状态未保存');
  return response.data;
}

export async function recordLearningEvent(
  courseId: string,
  input: ILearningEventInput,
): Promise<ILearningProgress> {
  const response = await axiosForBackend({
    url: `/api/platform/learning/${courseId}/events`,
    method: 'POST',
    data: input,
  });
  return response.data;
}

export async function getMyLearning(): Promise<ILearningProgress[]> {
  const response = await axiosForBackend({
    url: '/api/platform/learning',
    method: 'GET',
  });
  return response.data;
}

export async function getMyLearningAssignments(): Promise<
  ILearningAssignment[]
> {
  const response = await axiosForBackend({
    url: '/api/platform/learning/assignments',
    method: 'GET',
  });
  return response.data;
}

export async function getCourseEnrollment(
  courseId: string,
): Promise<ICourseEnrollmentStatus> {
  const response = await axiosForBackend({
    url: `/api/platform/learning/${courseId}/enrollment`,
    method: 'GET',
  });
  return response.data;
}

export async function enrollCourse(
  courseId: string,
): Promise<ICourseEnrollmentStatus> {
  const response = await axiosForBackend({
    url: `/api/platform/learning/${courseId}/enrollment`,
    method: 'POST',
  });
  return response.data;
}

export async function createLearningTimeSession(
  courseId: string,
): Promise<ILearningTimeSession> {
  const response = await axiosForBackend({
    url: `/api/platform/learning/${courseId}/time-sessions`,
    method: 'POST',
  });
  return response.data;
}

export async function updateLearningTimeSession(
  courseId: string,
  sessionId: string,
  input: ILearningTimeSessionUpdateInput,
  options: { keepalive?: boolean } = {},
): Promise<ILearningTimeSession> {
  const response = await axiosForBackend({
    url: `/api/platform/learning/${courseId}/time-sessions/${sessionId}`,
    method: 'PATCH',
    data: input,
    ...(options.keepalive
      ? { adapter: 'fetch' as const, fetchOptions: { keepalive: true } }
      : {}),
  });
  return response.data;
}

export async function getCourseQuiz(
  courseId: string,
): Promise<CourseQuizResponse> {
  const response = await axiosForBackend<CourseQuizResponse>({
    url: `/api/platform/learning/${courseId}/quiz`,
    method: 'GET',
  });
  if (response.status >= 400) {
    throw Object.assign(new Error('课程题库请求未成功'), { response });
  }
  // Nest sends a null controller result as an empty successful response.
  const payload: unknown = response.data;
  return payload === '' ? null : response.data;
}

export async function submitCourseQuizAnswers(
  courseId: string,
  input: ICourseQuizAnswerInput,
): Promise<ICourseQuizAnswerResult> {
  const response = await axiosForBackend({
    url: `/api/platform/learning/${courseId}/quiz/answers`,
    method: 'POST',
    data: input,
  });
  return response.data;
}

export async function getAdminCourseQuizzes(): Promise<
  ICourseQuizAdminStatus[]
> {
  return requestForManagement({
    url: '/api/platform/admin/course-quizzes',
    method: 'GET',
  });
}

export async function getCourseQuizSources(): Promise<
  ICourseQuizSourceOption[]
> {
  return requestForManagement({
    url: '/api/platform/admin/course-quiz-sources',
    method: 'GET',
  });
}

export async function prepareCourseQuiz(
  courseId: string,
  input: ICourseQuizPrepareInput,
): Promise<ICourseQuizAdminStatus> {
  return requestForManagement({
    url: `/api/platform/admin/course-quizzes/${encodeURIComponent(courseId)}/prepare`,
    method: 'POST',
    data: input,
  });
}

export async function getAdminCourseQuizDraft(
  courseId: string,
): Promise<ICourseQuizAdminDraft> {
  return requestForManagement({
    url: `/api/platform/admin/course-quizzes/${encodeURIComponent(courseId)}/draft`,
    method: 'GET',
  });
}

export async function createCourseQuizRevision(
  courseId: string,
): Promise<ICourseQuizAdminDraft> {
  return requestForManagement({
    url: `/api/platform/admin/course-quizzes/${encodeURIComponent(courseId)}/revision`,
    method: 'POST',
  });
}

export async function updateAdminCourseQuizDraft(
  courseId: string,
  input: ICourseQuizDraftUpdateInput,
): Promise<ICourseQuizAdminDraft> {
  return requestForManagement({
    url: `/api/platform/admin/course-quizzes/${encodeURIComponent(courseId)}/draft`,
    method: 'PATCH',
    data: input,
  });
}

export async function publishCourseQuiz(
  courseId: string,
  input: ICourseQuizPublishInput,
): Promise<ICourseQuizAdminStatus> {
  return requestForManagement({
    url: `/api/platform/admin/course-quizzes/${encodeURIComponent(courseId)}/publish`,
    method: 'POST',
    data: input,
  });
}

export async function getAdminOverview(): Promise<IPlatformAdminOverview> {
  const response = await axiosForBackend({
    url: '/api/platform/admin/overview',
    method: 'GET',
  });
  return response.data;
}

export async function getCourseCatalogSyncStatus(): Promise<IAcademyCatalogSyncStatus> {
  const response = await axiosForBackend({
    url: '/api/platform/admin/course-catalog-sync',
    method: 'GET',
  });
  return response.data;
}

export async function syncCourseCatalog(): Promise<IAcademyCatalogSyncResult> {
  const response = await axiosForBackend({
    url: '/api/platform/admin/course-catalog-sync',
    method: 'POST',
  });
  return response.data;
}

export async function getAdminCourses(): Promise<IAdminCourseListResponse> {
  return requestForManagement({
    url: '/api/platform/admin/courses',
    method: 'GET',
  });
}

export async function updateAdminCourseStatus(
  courseId: string,
  status: AdminCourseStatus,
): Promise<IAcademyCourse> {
  return requestForManagement({
    url: `/api/platform/admin/courses/${encodeURIComponent(courseId)}/status`,
    method: 'PATCH',
    data: { status },
  });
}

export async function previewAdminCourseDeletion(
  courseId: string,
): Promise<IAdminCourseDeletionPreview> {
  return requestForManagement({
    url: `/api/platform/admin/courses/${encodeURIComponent(courseId)}/deletion-preview`,
    method: 'GET',
  });
}

export async function deleteAdminCourse(
  courseId: string,
  input: IAdminCourseDeleteInput,
): Promise<IAdminCourseDeleteResult> {
  return requestForManagement({
    url: `/api/platform/admin/courses/${encodeURIComponent(courseId)}`,
    method: 'DELETE',
    data: input,
  });
}

export async function getAdminSubmissions(): Promise<ICourseSubmission[]> {
  const response = await axiosForBackend({
    url: '/api/platform/admin/submissions',
    method: 'GET',
  });
  return response.data;
}

export async function getAdminSubmissionQuestions(
  id: string,
): Promise<ISubmissionQuizQuestion[]> {
  const response = await axiosForBackend({
    url: `/api/platform/admin/submissions/${id}/questions`,
    method: 'GET',
  });
  return response.data;
}

export async function getAdminLearning(): Promise<ILearningProgress[]> {
  const response = await axiosForBackend({
    url: '/api/platform/admin/learning',
    method: 'GET',
  });
  return response.data;
}

export async function getAdminLearningMonitoring(
  query: IAdminLearningMonitoringQuery = {},
): Promise<IAdminLearningMonitoringResponse> {
  const response = await axiosForBackend({
    url: '/api/platform/admin/learning-monitoring',
    method: 'GET',
    params: query,
  });
  return response.data;
}

export async function extendLearningDeadline(
  assignmentId: string,
  input: ILearningDeadlineExtensionInput,
): Promise<void> {
  await requestForManagement({
    url: `/api/platform/admin/learning/assignments/${encodeURIComponent(assignmentId)}/deadline`,
    method: 'PATCH',
    data: input,
  });
}

export async function syncEmployeeRoster(
  input: IEmployeeRosterSyncInput,
): Promise<IEmployeeRosterSyncResult> {
  const response = await axiosForBackend({
    url: '/api/platform/admin/employee-roster/sync',
    method: 'POST',
    data: input,
  });
  return response.data;
}

export async function previewEmployeeRoster(
  input: IEmployeeRosterPreviewInput,
): Promise<IEmployeeRosterPreviewResult> {
  const response = await axiosForBackend({
    url: '/api/platform/admin/employee-roster/preview',
    method: 'POST',
    data: input,
  });
  return response.data;
}

export async function getOrganizationStatus(): Promise<IOrganizationSnapshotStatus> {
  const response = await axiosForBackend({
    url: '/api/platform/admin/organization/status',
    method: 'GET',
  });
  return response.data;
}

export async function syncOrganization(
  input: IOrganizationSyncInput,
): Promise<IOrganizationSyncResult> {
  const response = await axiosForBackend({
    url: '/api/platform/admin/organization/sync',
    method: 'POST',
    data: input,
  });
  return response.data;
}

export async function reviewSubmission(
  id: string,
  input: ISubmissionReviewInput,
): Promise<ICourseSubmission> {
  const response = await axiosForBackend({
    url: `/api/platform/admin/submissions/${id}`,
    method: 'PATCH',
    data: input,
  });
  return response.data;
}

export async function updateSubmissionReferences(
  id: string,
  input: ISubmissionReferencesInput,
): Promise<ICourseSubmission> {
  return requestForManagement({
    url: `/api/platform/admin/submissions/${encodeURIComponent(id)}/references`,
    method: 'PATCH',
    data: input,
  });
}

export async function getSubmissionSyncPreview(
  id: string,
): Promise<ICourseSyncPreview> {
  const response = await axiosForBackend({
    url: `/api/platform/admin/submissions/${id}/sync-preview`,
    method: 'GET',
  });
  return response.data;
}

export async function syncSubmission(id: string): Promise<ICourseSyncResult> {
  const response = await axiosForBackend({
    url: `/api/platform/admin/submissions/${id}/sync`,
    method: 'POST',
    data: { confirmed: true },
  });
  return response.data;
}
