import type { EquipmentDto } from '@/api/modules/equipments';
import { equipmentsApi } from '@/api';
import productCategoriesData from '@/mockdata/common/productCategories.json';

/** 与设备管理页一致的分类解析，用于大类/子类展示与后续方案匹配 */
function matchCategoryFromApi(productcategory: string | null | undefined, productgroup: string | null | undefined) {
  const catName = (productcategory ?? '').trim();
  const subName = (productgroup ?? '').trim();
  let categoryId = '';
  let subCategoryId = '';
  let categoryName = catName;
  let subCategoryName = subName;
  const cat = productCategoriesData.categories.find((c) => c.name === catName);
  if (cat) {
    categoryId = cat.id;
    categoryName = cat.name;
    const sub = cat.subCategories.find((s) => s.name === subName);
    if (sub) {
      subCategoryId = sub.id;
      subCategoryName = sub.name;
    }
  }
  return { categoryId, subCategoryId, categoryName, subCategoryName };
}

export type SelectableProjectDevice = {
  id: string;
  customerId: string;
  categoryId: string;
  subCategoryId: string;
  categoryName: string;
  subCategoryName: string;
  model: string;
  quantity: number;
  factoryName: string;
  workshopName: string;
  serialNumbers: string[];
};

export function mapEquipmentToSelectable(
  e: EquipmentDto,
  customerIdStr: string,
): SelectableProjectDevice {
  const { categoryId, subCategoryId, categoryName, subCategoryName } = matchCategoryFromApi(
    e.productcategory,
    e.productgroup,
  );
  return {
    id: String(e.equipid ?? ''),
    customerId: customerIdStr,
    categoryId,
    subCategoryId,
    categoryName,
    subCategoryName,
    model: e.mlfb?.trim() || (e.equipmentname ?? ''),
    quantity: e.number ?? 0,
    factoryName: e.factory ?? '',
    workshopName: e.workshop ?? '',
    serialNumbers: [],
  };
}

export async function loadDevicesForProjectSelection(
  customerIdStr: string,
  factoryName: string,
): Promise<SelectableProjectDevice[]> {
  const companyid = Number.parseInt(customerIdStr, 10);
  if (Number.isNaN(companyid) || !factoryName.trim()) {
    return [];
  }
  const list = await equipmentsApi.listEquipmentsByCompany(companyid);
  const fac = factoryName.trim();
  return list
    .filter((e) => (e.factory ?? '').trim() === fac)
    .map((e) => mapEquipmentToSelectable(e, customerIdStr));
}
