import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  IMobileDocumentResponse,
  IMobileCourseResource,
} from '../../../shared/api.interface';
import type {
  DocumentAuthorizationResult,
  DocumentAuthorizationStart,
  DocumentReaderStatus,
} from '../../../shared/document-authorization';

async function request<T>(path: string, data?: object): Promise<T> {
  const response = await axiosForBackend({
    url: `/api/academy/document-authorization/${path}`,
    method: data ? 'POST' : 'GET',
    ...(data ? { data } : {}),
  });
  if (response.status >= 400) throw new Error('文档授权请求失败');
  return response.data;
}
export function documentAuthorizationStatus() {
  return request<DocumentReaderStatus>('status');
}
export function readMobileCourseDocument(courseId: string) {
  return request<IMobileDocumentResponse>(
    `mobile/${encodeURIComponent(courseId)}`,
  );
}
export async function readMobileCourseImage(
  courseId: string,
  blockId: string,
): Promise<Blob> {
  const response = await axiosForBackend({
    url: `/api/academy/document-authorization/mobile/${encodeURIComponent(courseId)}/images/${encodeURIComponent(blockId)}`,
    method: 'GET',
    responseType: 'blob',
  });
  if (response.status >= 400 || !(response.data instanceof Blob))
    throw new Error('课程图片加载失败');
  return response.data;
}
export function readCourseDocument(courseId: string, pageUrl: string) {
  return request<DocumentAuthorizationResult>('read', { courseId, pageUrl });
}
export function readMobileCourseResource(courseId: string) {
  return request<IMobileCourseResource>(
    `mobile-resource/${encodeURIComponent(courseId)}`,
  );
}
export async function readMobileCoursePdf(
  courseId: string,
  signal: AbortSignal,
): Promise<ArrayBuffer> {
  const response = await axiosForBackend({
    url: `/api/academy/document-authorization/mobile-resource/${encodeURIComponent(courseId)}/pdf`,
    method: 'GET',
    responseType: 'arraybuffer',
    signal,
  });
  if (response.status >= 400 || !(response.data instanceof ArrayBuffer))
    throw new Error('PDF 文件加载失败');
  return response.data;
}
export function beginDocumentAuthorization(
  courseId: string,
  pageUrl: string,
  challenge: string,
) {
  return request<DocumentAuthorizationStart>('begin', {
    courseId,
    pageUrl,
    challenge,
  });
}
export function finishDocumentAuthorization(
  state: string,
  code: string,
  verifier: string,
) {
  return request<DocumentAuthorizationResult>('finish', {
    state,
    code,
    verifier,
  });
}
