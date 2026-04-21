import { companiesApi } from '@/api';
import { showToast } from '@siemens/ix-vue';

export type CustomerSelectOption = { label: string; value: string };

/** 客户下拉：新建/编辑向导与项目详情编辑共用 */
export async function loadCustomerSelectOptions(): Promise<CustomerSelectOption[]> {
  try {
    const list = await companiesApi.listCompanies();
    return [...list]
      .filter((c) => c.companyname)
      .sort((a, b) => (a.companyname ?? '').localeCompare(b.companyname ?? '', 'zh-CN'))
      .map((c) => ({ label: c.companyname ?? '', value: String(c.companyid) }));
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : '客户列表加载失败' });
    return [];
  }
}
