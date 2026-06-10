/**
 * 将后端 InspectionTemplate 与前端 AtomicScheme 互转。
 * 兼容历史数据：description 里可能包含 __SCHEME_V1__ 嵌入内容。
 * 当前保存策略：description 仅保存方案描述文本，检测项走独立接口同步。
 */
import type { InspectionTemplateDto } from '@/api/modules/inspectionTemplates';
import productCategoriesData from '@/mockdata/common/productCategories.json';
import type { AtomicScheme, SchemeItem } from './schemeUtils';

export const SCHEME_DESC_PREFIX = '__SCHEME_V1__:';

type EmbeddedPayload = {
  note: string;
  scheme: {
    items?: SchemeItem[];
    categoryId?: string;
    subCategoryId?: string;
    model?: string;
    deviceTypes?: string[];
  };
};

export function isTemplateApiId(schemeId: string): boolean {
  return /^\d+$/.test(schemeId);
}

export function unpackInspectionTemplateDescription(description: string | null | undefined): {
  note: string;
  embedded: EmbeddedPayload['scheme'] | null;
} {
  const d = description ?? '';
  if (!d.startsWith(SCHEME_DESC_PREFIX)) {
    return { note: d, embedded: null };
  }
  try {
    const parsed = JSON.parse(d.slice(SCHEME_DESC_PREFIX.length)) as EmbeddedPayload;
    if (parsed?.scheme && Array.isArray(parsed.scheme.items)) {
      return {
        note: typeof parsed.note === 'string' ? parsed.note : '',
        embedded: parsed.scheme,
      };
    }
  } catch {
    /* ignore */
  }
  return { note: '', embedded: null };
}

export function parseProductCategoryField(
  productcategory: string | null | undefined,
): { categoryId: string; subCategoryId: string } {
  const s = (productcategory ?? '').trim();
  if (!s) return { categoryId: '', subCategoryId: '' };
  const parts = s.split(/[/／]/);
  const catName = parts[0]?.trim() ?? '';
  const subName = parts[1]?.trim() ?? '';
  const cats = productCategoriesData.categories;
  const cat = cats.find((c) => c.name === catName);
  if (!cat) return { categoryId: '', subCategoryId: '' };
  if (!subName) return { categoryId: cat.id, subCategoryId: '' };
  const sub = cat.subCategories.find((sc) => sc.name === subName);
  return { categoryId: cat.id, subCategoryId: sub?.id ?? '' };
}

function parseProductCategoryAsSubCategoryOnly(
  productcategory: string | null | undefined,
): { categoryId: string; subCategoryId: string } {
  const s = (productcategory ?? '').trim();
  if (!s) return { categoryId: '', subCategoryId: '' };

  const slashParsed = parseProductCategoryField(s);
  if (slashParsed.categoryId || slashParsed.subCategoryId) {
    return slashParsed;
  }

  const cats = productCategoriesData.categories;
  for (const cat of cats) {
    const sub = cat.subCategories.find((sc) => sc.name === s);
    if (sub) {
      return { categoryId: cat.id, subCategoryId: sub.id };
    }
  }
  return { categoryId: '', subCategoryId: '' };
}

export function buildProductCategoryField(
  categoryId: string,
  subCategoryId: string,
  type: 'peripheral' | 'equipment' = 'equipment',
): string {
  const cats = productCategoriesData.categories;
  const cat = cats.find((c) => c.id === categoryId);
  const sub = cat?.subCategories.find((x) => x.id === subCategoryId);
  if (type === 'peripheral') {
    return sub?.name ?? '';
  }
  if (cat && sub) return `${cat.name}/${sub.name}`;
  if (cat) return cat.name;
  return '';
}

function buildPersistedProductCategoryField(
  categoryId: string,
  subCategoryId: string,
): string {
  return buildProductCategoryField(categoryId, subCategoryId, 'equipment');
}

function normalizeDateOnly(createdate?: string | null): string | undefined {
  if (!createdate) return undefined;
  const s = String(createdate).trim();
  if (!s) return undefined;
  // 后端是 DateOnly，优先传 YYYY-MM-DD，避免时间串导致反序列化失败
  const datePart = s.includes('T') ? s.split('T')[0] : s;
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : undefined;
}

function todayDateOnly(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function validateTemplatePayloadLengths(payload: InspectionTemplateDto): void {
  const name = payload.name ?? '';
  const productcategory = payload.productcategory ?? '';
  const description = payload.description ?? '';
  const mlfb = payload.mlfb ?? '';
  const series = payload.series ?? '';
  const size = payload.size ?? '';

  if (name.length > 100) {
    throw new Error(`方案名称过长（${name.length}/100）`);
  }
  if (productcategory.length > 100) {
    throw new Error(`产品类别/系列过长（${productcategory.length}/100）`);
  }
  if (mlfb.length > 100) {
    throw new Error(`适用型号过长（${mlfb.length}/100）`);
  }
  if (series.length > 100) {
    throw new Error(`系列过长（${series.length}/100）`);
  }
  if (size.length > 100) {
    throw new Error(`尺寸过长（${size.length}/100）`);
  }
  if (description.length > 500) {
    throw new Error(`方案内容过长（${description.length}/500），请减少检测项或联系后端扩展字段长度`);
  }
}

function defaultRootItem(templateId: number): SchemeItem {
  return {
    id: `tpl-${templateId}-root`,
    name: '检测项（请完善）',
    type: 'visual',
    required: true,
    children: [],
  };
}

/** 列表行：与原先 mock 方案结构兼容 */
export type SchemeListRow = {
  id: string;
  name: string;
  description: string;
  type: 'peripheral' | 'equipment';
  categoryId: string;
  subCategoryId: string;
  model: string;
  series: string;
  size: string;
  items: SchemeItem[];
};

export function templateDtoToListRow(dto: InspectionTemplateDto): SchemeListRow {
  const type: 'peripheral' | 'equipment' = dto.inspectiontype === 1 ? 'equipment' : 'peripheral';
  const parsed = type === 'peripheral'
    ? parseProductCategoryAsSubCategoryOnly(dto.productcategory)
    : parseProductCategoryField(dto.productcategory);
  const { embedded } = unpackInspectionTemplateDescription(dto.description);
  const items = embedded?.items?.length ? embedded.items : [];
  return {
    id: String(dto.templateid),
    name: dto.name ?? '',
    description: unpackInspectionTemplateDescription(dto.description).note,
    type,
    categoryId: embedded?.categoryId ?? parsed.categoryId,
    subCategoryId: embedded?.subCategoryId ?? parsed.subCategoryId,
    model: embedded?.model ?? dto.mlfb ?? '',
    series: dto.series ?? '',
    size: dto.size ?? '',
    items,
  };
}

export function templateDtoToFormAndAtomic(dto: InspectionTemplateDto): {
  schemeForm: {
    name: string;
    description: string;
    atomicType: 'peripheral' | 'equipment' | '';
    categoryId: string;
    subCategoryId: string;
    model: string;
    series: string;
    size: string;
  };
  atomic: AtomicScheme;
} {
  const atomicType: 'peripheral' | 'equipment' = dto.inspectiontype === 1 ? 'equipment' : 'peripheral';
  const { note, embedded } = unpackInspectionTemplateDescription(dto.description);
  const parsed = atomicType === 'peripheral'
    ? parseProductCategoryAsSubCategoryOnly(dto.productcategory)
    : parseProductCategoryField(dto.productcategory);

  const categoryId = embedded?.categoryId ?? parsed.categoryId;
  const subCategoryId = embedded?.subCategoryId ?? parsed.subCategoryId;
  const model = embedded?.model ?? dto.mlfb ?? '';

  const items: SchemeItem[] =
    embedded?.items?.length ?? 0
      ? (embedded!.items as SchemeItem[])
      : [defaultRootItem(dto.templateid)];

  let formDescription = note;
  if (!dto.description?.startsWith(SCHEME_DESC_PREFIX) && dto.description && !note) {
    formDescription = dto.description;
  }

  const atomic: AtomicScheme = {
    id: String(dto.templateid),
    name: dto.name ?? '',
    type: atomicType,
    description: formDescription,
    items,
    categoryId,
    subCategoryId,
    model,
    deviceTypes: embedded?.deviceTypes ?? (subCategoryId ? [subCategoryId] : []),
  };

  const schemeForm = {
    name: dto.name ?? '',
    description: formDescription,
    atomicType: atomicType as '' | 'peripheral' | 'equipment',
    categoryId,
    subCategoryId,
    model,
    series: dto.series ?? '',
    size: dto.size ?? '',
  };

  return { schemeForm, atomic };
}

export function buildTemplateDtoForSave(
  templateId: number,
  schemeForm: {
    name: string;
    description: string;
    atomicType: 'peripheral' | 'equipment' | '';
    categoryId: string;
    subCategoryId: string;
    model: string;
    series: string;
    size: string;
  },
  atomic: AtomicScheme,
  createdate?: string | null,
): InspectionTemplateDto {
  const resolvedType: 'peripheral' | 'equipment' =
    schemeForm.atomicType === 'equipment' || schemeForm.atomicType === 'peripheral'
      ? schemeForm.atomicType
      : atomic.type;
  const mergedAtomic: AtomicScheme = {
    ...atomic,
    name: schemeForm.name,
    type: resolvedType,
    items: atomic.items,
    categoryId: schemeForm.categoryId || atomic.categoryId,
    subCategoryId: schemeForm.subCategoryId || atomic.subCategoryId,
    model: schemeForm.model ?? atomic.model,
  };
  const plainDescription = schemeForm.description ?? '';
  const inspectiontype = resolvedType === 'equipment' ? 1 : 2;
  const productcategory =
    buildPersistedProductCategoryField(mergedAtomic.categoryId, mergedAtomic.subCategoryId) || '';
  const resolvedSeries = resolvedType === 'equipment' ? schemeForm.series || '' : '';
  const resolvedSize = resolvedType === 'equipment' ? schemeForm.size || '' : '';
  const payload: InspectionTemplateDto = {
    templateid: templateId,
    name: schemeForm.name,
    description: plainDescription,
    inspectiontype,
    productcategory,
    mlfb: '',
    createdate: normalizeDateOnly(createdate) ?? todayDateOnly(),
    series: resolvedSeries,
    size: resolvedSize,
  };
  validateTemplatePayloadLengths(payload);
  return payload;
}

export function buildTemplateDtoForCreate(
  schemeForm: {
    name: string;
    description: string;
    atomicType: 'peripheral' | 'equipment' | '';
    categoryId: string;
    subCategoryId: string;
    model: string;
    series: string;
    size: string;
  },
  atomic: AtomicScheme,
): InspectionTemplateDto {
  return buildTemplateDtoForSave(0, schemeForm, atomic, undefined);
}
