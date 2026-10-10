import type {
  BaseEntitySelectProps,
  ItemValue,
} from '@client/src/components/business-ui/entity-combobox/shared-types';
import type { I18nText } from '@client/src/components/business-ui/entity-combobox/types';

export type DepartmentInfo = {
  departmentID: string;
  larkDepartmentID: string;
  name: I18nText;
  /** 飞书 open_department_id，用于稳定的组织树关联。 */
  openDepartmentID?: string;
};

export type Department = ItemValue<DepartmentInfo>;

export type DepartmentSelectProps = BaseEntitySelectProps<Department>;
