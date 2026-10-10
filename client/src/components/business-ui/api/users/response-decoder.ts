import type { UserInfo } from '@lark-apaas/client-toolkit/tools/services';

export interface DecodedSearchUsersPage {
  users: UserInfo[];
  total: number;
}

type UnknownRecord = Record<string, unknown>;

interface SearchUsersPayload {
  rawUsers: unknown[];
  total: unknown;
}

const RESPONSE_ENVELOPE_LIMIT = 5;
const RESPONSE_SHAPE_FIELD_LIMIT = 10;
const RESPONSE_SHAPE_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/u;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function describeValueType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function describeRecordFields(record: UnknownRecord): string {
  const keys: string[] = Object.keys(record).sort();
  const visibleKeys: string[] = keys.slice(0, RESPONSE_SHAPE_FIELD_LIMIT);
  const fields: string[] = visibleKeys.map((key: string) => {
    const safeKey: string = RESPONSE_SHAPE_KEY_PATTERN.test(key)
      ? key
      : '<dynamic-key>';
    return `${safeKey}:${describeValueType(record[key])}`;
  });
  const suffix: string = keys.length > visibleKeys.length ? ',…' : '';
  return `{${fields.join(',')}${suffix}}`;
}

function describeResponseShape(root: UnknownRecord): string {
  const segments: string[] = [];
  let envelope: UnknownRecord | null = root;

  for (
    let depth: number = 0;
    depth < RESPONSE_ENVELOPE_LIMIT && envelope;
    depth += 1
  ) {
    const label: string = depth === 0 ? 'root' : `data${depth}`;
    segments.push(`${label}${describeRecordFields(envelope)}`);
    envelope = asRecord(envelope.data);
  }

  return segments.join('>');
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function requiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`员工账号返回缺少有效的${fieldName}`);
  }
  return value;
}

function decodeI18nText(value: unknown): UserInfo['name'] {
  if (typeof value === 'string') return { zh_cn: value };
  const record = asRecord(value);
  if (!record) return { zh_cn: '' };
  return {
    zh_cn: optionalString(record.zh_cn || record.zhCN),
    en_us: optionalString(record.en_us || record.enUS) || undefined,
    ja_jp: optionalString(record.ja_jp || record.jaJP) || undefined,
  };
}

function decodeUserType(value: unknown): UserInfo['userType'] {
  if (
    value === '_employee' ||
    value === '_externalUser' ||
    value === '_anonymousUser'
  ) {
    return value;
  }
  throw new Error('员工账号返回包含无法识别的用户类型');
}

function decodeUser(value: unknown, allowUnregisteredContacts: boolean): UserInfo {
  const record = asRecord(value);
  if (!record) throw new Error('员工账号返回包含无效的用户记录');

  const rawUserId: unknown = record.miaodaUserID ?? record.miaoda_user_id ??
    record.userID ?? record.user_id;
  const larkUserId: string = optionalString(
    record.larkUserID ?? record.lark_user_id ?? record.larkID,
  );
  const userType: UserInfo['userType'] = decodeUserType(record.userType ?? record.user_type);
  // 人员选择器允许展示待开户联系人；员工名册仍要求完整妙搭身份。
  const isUnregistered: boolean = allowUnregisteredContacts &&
    userType === '_externalUser' && Boolean(larkUserId.trim()) &&
    (rawUserId === undefined || rawUserId === null || rawUserId === '');
  const userId: string = isUnregistered ? '' : requiredString(rawUserId, '妙搭用户 ID');
  const department = asRecord(record.department);
  const departmentId = optionalString(
    department?.departmentID ?? department?.department_id,
  );
  const openDepartmentId = optionalString(
    department?.openDepartmentID ?? department?.open_department_id,
  );

  return {
    userID: userId,
    miaodaUserID: userId,
    larkUserID: optionalString(
      record.larkUserID ?? record.lark_user_id ?? record.larkID,
    ),
    larkID: optionalString(
      record.larkID ?? record.larkUserID ?? record.lark_user_id,
    ),
    employeeID:
      optionalString(record.employeeID ?? record.employee_id) || undefined,
    name: decodeI18nText(record.name),
    avatar: optionalString(record.avatar),
    userType,
    department: {
      departmentID: departmentId,
      openDepartmentID: openDepartmentId || undefined,
      name: decodeI18nText(department?.name),
    },
    email: optionalString(record.email) || undefined,
    tenantName:
      optionalString(record.tenantName ?? record.tenant_name) || undefined,
  };
}

function decodeTotal(value: unknown): number {
  const total =
    typeof value === 'string' && /^\d+$/u.test(value) ? Number(value) : value;
  if (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0) {
    throw new Error('员工账号返回缺少有效的总人数');
  }
  return total;
}

function assertSuccessfulEnvelope(envelope: UnknownRecord): void {
  const serviceError: unknown = envelope.error;
  if (serviceError !== undefined && serviceError !== null) {
    throw new Error('员工账号服务返回失败状态，本次操作已取消');
  }

  const httpStatus: unknown = envelope.status;
  if (
    httpStatus !== undefined &&
    (typeof httpStatus !== 'number' ||
      !Number.isSafeInteger(httpStatus) ||
      httpStatus < 200 ||
      httpStatus >= 300)
  ) {
    throw new Error('员工账号服务返回失败状态，本次操作已取消');
  }

  const statusCode: unknown = envelope.status_code ?? envelope.statusCode;
  if (statusCode !== undefined && String(statusCode) !== '0') {
    throw new Error('员工账号服务返回失败状态，本次操作已取消');
  }
}

function extractSearchUsersPayload(root: UnknownRecord): SearchUsersPayload {
  let envelope: UnknownRecord = root;

  for (let depth: number = 0; depth < RESPONSE_ENVELOPE_LIMIT; depth += 1) {
    assertSuccessfulEnvelope(envelope);

    const data: UnknownRecord | null = asRecord(envelope.data);
    if (!data) {
      if (depth === 0) throw new Error('员工账号返回缺少数据区');
      break;
    }

    const rawUsers: unknown = data.userList ?? data.user_list;
    if (Array.isArray(rawUsers)) {
      return { rawUsers, total: data.total };
    }
    envelope = data;
  }

  throw new Error(
    `员工账号返回缺少用户列表，本次操作已取消（响应结构：${describeResponseShape(root)}）`,
  );
}

/**
 * 妙搭不同运行路径曾返回 camelCase 与 snake_case 两种列表字段，
 * 统一服务层还可能在账号原始响应外增加多层 data 包裹。
 * 这里是唯一兼容边界；只解开有上限的 data 层，未知结构仍然失败，
 * 同时仅暴露字段名与类型供诊断，不输出员工数据值。
 */
export function decodeSearchUsersResponse(
  response: unknown,
  options: { allowUnregisteredContacts?: boolean } = {},
): DecodedSearchUsersPage {
  const root: UnknownRecord | null = asRecord(response);
  if (!root) throw new Error('员工账号返回格式无效');

  const payload: SearchUsersPayload = extractSearchUsersPayload(root);
  const total: number = decodeTotal(payload.total);
  if (payload.rawUsers.length > total) {
    throw new Error('员工账号返回的分页数量不一致');
  }

  return {
    users: payload.rawUsers.map((user: unknown) =>
      decodeUser(user, options.allowUnregisteredContacts === true),
    ),
    total,
  };
}
