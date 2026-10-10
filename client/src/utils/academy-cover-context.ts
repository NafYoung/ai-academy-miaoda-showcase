import { createContext } from 'react';

/** 复用 Layout 已读取的当前账号，避免每张封面额外查询身份。 */
export const AcademyCoverScopeContext = createContext('');
