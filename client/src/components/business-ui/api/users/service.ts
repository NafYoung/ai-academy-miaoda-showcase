import {
  UserService,
  type AccountType,
  type SearchUsersParams,
  type BatchGetUsersResponse,
  type ConvertExternalContactResponse,
} from '@lark-apaas/client-toolkit/tools/services';
import {
  decodeSearchUsersResponse,
  type DecodedSearchUsersPage,
} from './response-decoder';

const userService = new UserService();

/**
 * 搜索用户
 */
export async function searchUsers(
  params: SearchUsersParams,
): Promise<DecodedSearchUsersPage> {
  const response: unknown = await userService.searchUsers({
    ...params,
    searchExternalContact: true,
  });
  return decodeSearchUsersResponse(response, { allowUnregisteredContacts: true });
}

/** 只读取当前应用可见的内部员工，用于管理员完整同步员工名册。 */
export async function searchInternalEmployees(
  params: SearchUsersParams,
): Promise<DecodedSearchUsersPage> {
  const response: unknown = await userService.searchUsers({
    ...params,
    searchExternalContact: false,
  });
  return decodeSearchUsersResponse(response);
}

/**
 * 批量根据用户 ID 查询用户信息
 */
export async function listUsersByIds(
  userIds: string[],
): Promise<BatchGetUsersResponse> {
  const numericIds = userIds.filter((id) => /^\d+$/u.test(id.trim()));
  return userService.listUsersByIds(numericIds);
}

/**
 * 调用开户接口，将外部联系人的 larkUserID 转换为已注册用户
 */
export async function convertExternalContact(
  larkUserID: string,
): Promise<ConvertExternalContactResponse> {
  return userService.convertExternalContact(larkUserID);
}

export type {
  AccountType,
  SearchUsersParams,
  DecodedSearchUsersPage,
  BatchGetUsersResponse,
  ConvertExternalContactResponse,
};
