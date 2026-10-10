interface QuizErrorResponse {
  status?: unknown;
  data?: unknown;
}

const DEFAULT_QUIZ_ERROR = '课程测验暂时无法处理，请稍后重试';
const QUIZ_SERVICE_UNAVAILABLE_ERROR = '课程测验服务暂时不可用，请稍后再试';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const message = value.trim();
  return message ? message : undefined;
}

function getResponse(error: unknown): QuizErrorResponse | undefined {
  if (!isRecord(error) || !isRecord(error.response)) return undefined;
  return error.response;
}

function getResponseMessage(data: unknown): string | undefined {
  if (!isRecord(data)) return undefined;

  const nestedMessage = isRecord(data.error)
    ? nonEmptyString(data.error.message)
    : undefined;
  return nestedMessage ?? nonEmptyString(data.message);
}

function getStatusMessage(status: unknown): string | undefined {
  if (status === 401) return '请先登录后参加课程测验';
  if (status === 403) {
    return '当前账号暂无权限参加这门课程测验，请联系管理员';
  }
  if (status === 404) return '这门课程暂无可用的课后测验';
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return QUIZ_SERVICE_UNAVAILABLE_ERROR;
  }
  return undefined;
}

/** Extract only the user-facing error message from an API failure envelope. */
export function normalizeQuizError(error: unknown): string {
  const response = getResponse(error);
  return (
    getResponseMessage(response?.data) ??
    getStatusMessage(response?.status) ??
    DEFAULT_QUIZ_ERROR
  );
}
