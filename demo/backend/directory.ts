/** 虚构组织架构：部门、人员均为合成数据。 */
export interface DemoDepartment {
  id: string;
  name: string;
  parentId: string;
}

export interface DemoPerson {
  userId: string;
  name: string;
  departmentId: string;
}

export const DEPARTMENTS: DemoDepartment[] = [
  { id: 'od-demo-root', name: 'ATHENA 演示公司', parentId: '' },
  { id: 'od-demo-product', name: '产品部', parentId: 'od-demo-root' },
  { id: 'od-demo-marketing', name: '市场部', parentId: 'od-demo-root' },
  { id: 'od-demo-sales', name: '销售部', parentId: 'od-demo-root' },
  { id: 'od-demo-tech', name: '技术部', parentId: 'od-demo-root' },
  { id: 'od-demo-hr', name: '人力资源部', parentId: 'od-demo-root' },
];

export const PEOPLE: DemoPerson[] = [
  { userId: '10001', name: '林知夏', departmentId: 'od-demo-marketing' },
  { userId: '10002', name: '周砚', departmentId: 'od-demo-tech' },
  { userId: '10003', name: '沈清和', departmentId: 'od-demo-hr' },
  { userId: '10004', name: '陈一舟', departmentId: 'od-demo-product' },
  { userId: '10005', name: '许棠', departmentId: 'od-demo-sales' },
  { userId: '10006', name: '顾北', departmentId: 'od-demo-tech' },
  { userId: '10007', name: '宋小满', departmentId: 'od-demo-marketing' },
  { userId: '10008', name: '何以安', departmentId: 'od-demo-product' },
  { userId: '10009', name: '江屿', departmentId: 'od-demo-sales' },
];

export function departmentName(id: string): string {
  return DEPARTMENTS.find((d) => d.id === id)?.name ?? '';
}

export function personName(userId: string): string {
  return PEOPLE.find((p) => p.userId === userId)?.name ?? '';
}
