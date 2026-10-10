import { avatarFor } from '@demo/identity';
import { DEPARTMENTS, PEOPLE, departmentName } from '@demo/backend/directory';
import type {
  AccountType,
  BatchGetChatsResponse,
  BatchGetUsersResponse,
  DepartmentInfo,
  SearchChatsParams,
  SearchChatsResponse,
  SearchDepartmentsParams,
  SearchDepartmentsResponse,
  SearchUsersParams,
  SearchUsersResponse,
  UserInfo,
  UserProfileData,
} from '../../../node_modules/@lark-apaas/client-toolkit/lib/integrations/services/types';

export type * from '../../../node_modules/@lark-apaas/client-toolkit/lib/integrations/services/types';

function toDepartment(id: string): DepartmentInfo {
  return { departmentID: id, larkDepartmentID: id, openDepartmentID: id, name: { zh_cn: departmentName(id) } };
}

function toUser(userId: string): UserInfo {
  const person = PEOPLE.find((p) => p.userId === userId)!;
  return {
    userID: person.userId,
    larkUserID: `ou_demo_${person.userId}`,
    name: { zh_cn: person.name },
    avatar: avatarFor(person.name),
    userType: '_employee',
    department: { departmentID: person.departmentId, openDepartmentID: person.departmentId, name: { zh_cn: departmentName(person.departmentId) } },
    miaodaUserID: person.userId,
  };
}

function page<T>(items: T[], offset = 0, pageSize = 20): T[] {
  return items.slice(offset, offset + pageSize);
}

export class DepartmentService {
  async searchDepartments(params: SearchDepartmentsParams): Promise<SearchDepartmentsResponse> {
    const q = params.query?.trim() ?? '';
    const hits = DEPARTMENTS.filter((d) => d.parentId && d.name.includes(q)).map((d) => toDepartment(d.id));
    return { data: { departmentList: page(hits, params.offset, params.pageSize), total: hits.length }, status_code: '0' };
  }
}

export class UserService {
  async searchUsers(params: SearchUsersParams): Promise<SearchUsersResponse> {
    const q = params.query?.trim() ?? '';
    const hits = PEOPLE.filter((p) => p.name.includes(q)).map((p) => toUser(p.userId));
    return { data: { userList: page(hits, params.offset, params.pageSize), total: hits.length }, status_code: '0' };
  }

  async listUsersByIds(userIds: string[]): Promise<BatchGetUsersResponse> {
    const userInfoMap: BatchGetUsersResponse['data']['userInfoMap'] = {};
    for (const id of userIds) {
      if (!PEOPLE.some((p) => p.userId === id)) continue;
      const user = toUser(id);
      userInfoMap[id] = { ...user, avatar: { image: { large: user.avatar } } } as never;
    }
    return { data: { userInfoMap } };
  }

  async convertExternalContact(_larkUserID: string) {
    return { data: { userInfo: { tenantID: 0, userID: 0 } } };
  }
}

export class ChatService {
  async searchChats(_params: SearchChatsParams): Promise<SearchChatsResponse> {
    return { data: { result: { chatResult: { total: 0, items: [] } } }, status_code: '0' };
  }

  async listChatsByIds(_chatIds: string[]): Promise<BatchGetChatsResponse> {
    return { data: { chatInfoMap: {} }, status_code: '0' };
  }
}

export class UserProfileService {
  async getUserProfile(userId: string, _accountType?: AccountType, _signal?: AbortSignal): Promise<UserProfileData> {
    const person = PEOPLE.find((p) => p.userId === userId);
    return {
      useLarkCard: false,
      userProfileInfo: { name: person?.name ?? '演示用户', avatar: person ? avatarFor(person.name) : '', userStatus: 1, userType: '_employee' },
    };
  }
}

export function getAssetsUrl(path: string): string {
  return path;
}
