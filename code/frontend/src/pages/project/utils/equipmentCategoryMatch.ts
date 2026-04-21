import productCategoriesData from '@/mockdata/common/productCategories.json';

/** 将设备档案上的大类/子类名称映射为本地分类 id（与向导设备展示一致） */
export function matchEquipmentCategoryFromApi(
  productcategory: string | null | undefined,
  productgroup: string | null | undefined,
) {
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
